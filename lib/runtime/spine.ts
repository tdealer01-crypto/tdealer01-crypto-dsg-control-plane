import { getSupabaseAdmin } from '../supabase-server';
import { sha256Hex } from './canonical';
import { computeEffectId, computeInputHash, type IntentEnvelope } from './approval';
import { evaluateUDGGate, type TruthState } from './gate';
import { buildLedgerEntry } from './ledger';
import { createEffectJournalEntry } from './effects';
import { maybeWriteCheckpoint } from './checkpoints';

const CORE_SPEC_SHA256 =
  '8d73cf93de5aa71c1cb1b9d93d15fc5124977dc0781cf0c1698216412ba623af';

const ARBITER_SHA256 =
  'e46190a79879ee3ca7ef00db6601998439fb71166b90c9612bf33b9fb4190bef';

export type SpineAccess = {
  orgId: string;
  agentId: string;
};

export type ExecuteEnvelope = IntentEnvelope & {
  approval_id: string;
};

function buildInitialTruthState(orgId: string, nowIso: string) {
  const initialV = {
    balance: 1000000,
    invariant_tag: 'transfer',
    last_direction: 0,
  };

  return {
    org_id: orgId,
    epoch: 1,
    sequence: 0,
    v_t: initialV,
    t_t: 0,
    g_t: 'zone:origin',
    i_t: 'net:bootstrap',
    s_star_hash: sha256Hex(initialV),
    updated_at: nowIso,
  };
}

function toTruthStateRow(row: any): TruthState {
  return {
    epoch: Number(row.epoch),
    sequence: Number(row.sequence),
    v_t: row.v_t || {},
    t_t: Number(row.t_t),
    g_t: String(row.g_t),
    i_t: String(row.i_t),
    s_star_hash: String(row.s_star_hash),
  };
}

export async function ensureTruthState(orgId: string) {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: existing, error } = await supabase
    .from('runtime_truth_state')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (existing) {
    return existing;
  }

  const bootstrap = buildInitialTruthState(orgId, nowIso);

  const { data: inserted, error: insertError } = await supabase
    .from('runtime_truth_state')
    .insert(bootstrap)
    .select('*')
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message || 'Failed to bootstrap runtime truth state');
  }

  return inserted;
}

export async function executeThroughSpine(access: SpineAccess, body: ExecuteEnvelope) {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const truthRow = await ensureTruthState(access.orgId);
  const truthState = toTruthStateRow(truthRow);

  const inputHash = computeInputHash(body);

  const { data: approval, error: approvalError } = await supabase
    .from('approvals')
    .select('*')
    .eq('id', body.approval_id)
    .eq('org_id', access.orgId)
    .eq('agent_id', access.agentId)
    .single();

  if (approvalError || !approval) throw new Error('ERR_INVALID_APPROVAL');
  if (approval.status !== 'issued' || approval.used_at) throw new Error('ERR_REPLAY_ATTACK');
  if (new Date(approval.expires_at).getTime() < Date.now()) throw new Error('ERR_EXPIRED');
  if (approval.request_id !== body.request_id) throw new Error('ERR_REQUEST_MISMATCH');
  if (approval.action !== body.action) throw new Error('ERR_ACTION_MISMATCH');
  if (approval.input_hash !== inputHash) throw new Error('ERR_INTEGRITY_MISMATCH');
  if (Number(approval.epoch) !== truthState.epoch) throw new Error('ERR_EPOCH_MISMATCH');

  const gate = evaluateUDGGate(truthState, {
    action: body.action,
    next_v: body.next_v,
    next_t: Number(body.next_t),
    next_g: body.next_g,
    next_i: body.next_i,
  });

  const prevStateHash = sha256Hex(truthState);
  let nextSequence = truthState.sequence;
  let nextStateHash = prevStateHash;
  let effectId: string | null = null;

  if (gate.decision === 'ALLOW') {
    nextSequence = truthState.sequence + 1;
    effectId = computeEffectId({
      epoch: truthState.epoch,
      sequence: nextSequence,
      action: body.action,
      payloadHash: inputHash,
    });

    await createEffectJournalEntry({
      orgId: access.orgId,
      agentId: access.agentId,
      requestId: body.request_id,
      action: body.action,
      effectId,
      payloadHash: inputHash,
      status: 'committed',
      externalReceipt: {},
    });

    const currentBalance = Number((truthState.v_t as any).balance || 0);
    const nextBalance = Number(body.next_v.balance ?? currentBalance);
    const lastDirection = Math.sign(nextBalance - currentBalance);

    const nextTruthRow = {
      org_id: access.orgId,
      epoch: truthState.epoch,
      sequence: nextSequence,
      v_t: {
        ...body.next_v,
        last_direction: lastDirection,
      },
      t_t: Number(body.next_t),
      g_t: body.next_g,
      i_t: body.next_i,
      s_star_hash: sha256Hex(body.next_v),
      updated_at: nowIso,
    };

    nextStateHash = sha256Hex({
      epoch: nextTruthRow.epoch,
      sequence: nextTruthRow.sequence,
      v_t: nextTruthRow.v_t,
      t_t: nextTruthRow.t_t,
      g_t: nextTruthRow.g_t,
      i_t: nextTruthRow.i_t,
      s_star_hash: nextTruthRow.s_star_hash,
    });

    const { error: truthUpdateError } = await supabase
      .from('runtime_truth_state')
      .upsert(nextTruthRow, { onConflict: 'org_id' });

    if (truthUpdateError) throw new Error(truthUpdateError.message);
  }

  const { data: lastEntry, error: lastEntryError } = await supabase
    .from('ledger_entries')
    .select('entry_hash')
    .eq('org_id', access.orgId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastEntryError) throw new Error(lastEntryError.message);

  const ledgerEntry = buildLedgerEntry({
    orgId: access.orgId,
    agentId: access.agentId,
    requestId: body.request_id,
    approvalHash: approval.approval_hash,
    sequence: nextSequence,
    epoch: truthState.epoch,
    action: body.action,
    inputHash,
    decision: gate.decision,
    reason: gate.reason,
    prevStateHash,
    nextStateHash,
    effectId,
    logicalTs: Number(body.next_t),
    prevEntryHash: lastEntry?.entry_hash || 'GENESIS',
    metadata: {
      gate_metrics: gate.metrics,
      core_spec_hash: CORE_SPEC_SHA256,
      arbiter_hash: ARBITER_SHA256,
    },
  });

  const { error: ledgerError } = await supabase.from('ledger_entries').insert({
    org_id: ledgerEntry.org_id,
    agent_id: ledgerEntry.agent_id,
    request_id: ledgerEntry.request_id,
    approval_hash: ledgerEntry.approval_hash,
    sequence: ledgerEntry.sequence,
    epoch: ledgerEntry.epoch,
    action: ledgerEntry.action,
    input_hash: ledgerEntry.input_hash,
    decision: ledgerEntry.decision,
    reason: ledgerEntry.reason,
    prev_state_hash: ledgerEntry.prev_state_hash,
    next_state_hash: ledgerEntry.next_state_hash,
    effect_id: ledgerEntry.effect_id,
    logical_ts: ledgerEntry.logical_ts,
    prev_entry_hash: ledgerEntry.prev_entry_hash,
    entry_hash: ledgerEntry.entry_hash,
    metadata: ledgerEntry.metadata,
    created_at: nowIso,
  });

  if (ledgerError) throw new Error(ledgerError.message);

  await maybeWriteCheckpoint({
    orgId: access.orgId,
    sequence: nextSequence,
    epoch: truthState.epoch,
    stateHash: nextStateHash,
    entryHash: ledgerEntry.entry_hash,
    snapshot: {
      v_t: body.next_v,
      t_t: Number(body.next_t),
      g_t: body.next_g,
      i_t: body.next_i,
      decision: gate.decision,
      reason: gate.reason,
    },
  });

  const { error: approvalUpdateError } = await supabase
    .from('approvals')
    .update({
      status: gate.decision === 'ALLOW' ? 'used' : 'revoked',
      used_at: nowIso,
      metadata: {
        ...(approval.metadata || {}),
        final_decision: gate.decision,
        final_reason: gate.reason,
        entry_hash: ledgerEntry.entry_hash,
      },
    })
    .eq('id', approval.id);

  if (approvalUpdateError) throw new Error(approvalUpdateError.message);

  const { data: executionRow, error: executionError } = await supabase
    .from('executions')
    .insert({
      org_id: access.orgId,
      agent_id: access.agentId,
      decision: gate.decision,
      latency_ms: 0,
      request_payload: {
        action: body.action,
        next_v: body.next_v,
        next_t: body.next_t,
        next_g: body.next_g,
        next_i: body.next_i,
      },
      context_payload: {
        approval_id: approval.id,
        input_hash: inputHash,
        entry_hash: ledgerEntry.entry_hash,
      },
      policy_version: `udg-epoch-${truthState.epoch}`,
      reason: gate.reason,
      created_at: nowIso,
    })
    .select('id')
    .single();

  if (executionError || !executionRow) {
    throw new Error(executionError?.message || 'Failed to write execution');
  }

  const { error: auditError } = await supabase.from('audit_logs').insert({
    org_id: access.orgId,
    agent_id: access.agentId,
    execution_id: executionRow.id,
    policy_version: `udg-epoch-${truthState.epoch}`,
    decision: gate.decision,
    reason: gate.reason,
    evidence: {
      approval_id: approval.id,
      approval_hash: approval.approval_hash,
      input_hash: inputHash,
      entry_hash: ledgerEntry.entry_hash,
      prev_state_hash: prevStateHash,
      next_state_hash: nextStateHash,
      effect_id: effectId,
      core_spec_hash: CORE_SPEC_SHA256,
      arbiter_hash: ARBITER_SHA256,
      gate_metrics: gate.metrics,
    },
    created_at: nowIso,
  });

  if (auditError) throw new Error(auditError.message);

  const { error: usageError } = await supabase.from('usage_events').insert({
    org_id: access.orgId,
    agent_id: access.agentId,
    execution_id: executionRow.id,
    event_type: gate.decision === 'ALLOW' ? 'execution' : 'decision_only',
    quantity: 1,
    unit: 'execution',
    amount_usd: 0,
    metadata: {
      decision: gate.decision,
      reason: gate.reason,
      entry_hash: ledgerEntry.entry_hash,
    },
    created_at: nowIso,
  });

  if (usageError) throw new Error(usageError.message);

  return {
    request_id: body.request_id,
    approval_id: approval.id,
    approval_hash: approval.approval_hash,
    input_hash: inputHash,
    decision: gate.decision,
    reason: gate.reason,
    sequence: nextSequence,
    effect_id: effectId,
    entry_hash: ledgerEntry.entry_hash,
    prev_state_hash: prevStateHash,
    next_state_hash: nextStateHash,
    gate_metrics: gate.metrics,
  };
}
