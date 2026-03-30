import { computeEffectId, computeInputHash, type IntentEnvelope } from './approval';
import { sha256Hex } from './canonical';
import { settleEffect, startEffect } from './effects';
import { evaluateUDGGate, type TruthState } from './gate';
import { appendLedgerEntry } from './ledger';
import { writeCheckpoint } from './checkpoints';

export async function loadOrInitTruthState(supabase: any, orgId: string): Promise<TruthState> {
  const { data: existing } = await supabase.from('runtime_truth_state').select('*').eq('org_id', orgId).maybeSingle();

  if (existing) {
    return {
      epoch: Number(existing.epoch),
      sequence: Number(existing.sequence),
      v_t: (existing.v_t || {}) as Record<string, unknown>,
      t_t: Number(existing.t_t),
      g_t: String(existing.g_t),
      i_t: String(existing.i_t),
      s_star_hash: String(existing.s_star_hash),
    };
  }

  const seed = {
    org_id: orgId,
    epoch: 1,
    sequence: 0,
    v_t: { balance: 1000000, invariant_tag: 'transfer', last_direction: 0 },
    t_t: 0,
    g_t: 'zone:origin',
    i_t: 'net:bootstrap',
    s_star_hash: sha256Hex({ balance: 1000000, invariant_tag: 'transfer', last_direction: 0 }),
    updated_at: new Date().toISOString(),
  };

  await supabase.from('runtime_truth_state').upsert(seed, { onConflict: 'org_id' });
  return {
    epoch: seed.epoch,
    sequence: seed.sequence,
    v_t: seed.v_t,
    t_t: seed.t_t,
    g_t: seed.g_t,
    i_t: seed.i_t,
    s_star_hash: seed.s_star_hash,
  };
}

export async function runSpine(params: {
  supabase: any;
  orgId: string;
  agentId: string;
  approval: { id: string; approval_hash: string; epoch: number };
  intent: IntentEnvelope;
}) {
  const nowIso = new Date().toISOString();
  const state = await loadOrInitTruthState(params.supabase, params.orgId);
  const inputHash = computeInputHash(params.intent);

  const gate = evaluateUDGGate(state, {
    action: params.intent.action,
    next_v: params.intent.next_v,
    next_t: params.intent.next_t,
    next_g: params.intent.next_g,
    next_i: params.intent.next_i,
  });

  const prevStateHash = sha256Hex(state);
  let nextStateHash = prevStateHash;
  let nextSequence = state.sequence;
  let effectId: string | null = null;

  if (gate.decision === 'ALLOW') {
    nextSequence += 1;
    effectId = computeEffectId({
      epoch: state.epoch,
      sequence: nextSequence,
      action: params.intent.action,
      payloadHash: inputHash,
    });

    const start = await startEffect({
      supabase: params.supabase,
      orgId: params.orgId,
      agentId: params.agentId,
      requestId: params.intent.request_id,
      action: params.intent.action,
      effectId,
      payload: params.intent,
    });

    if (!start.ok) {
      return { ok: false as const, status: 500, error: start.error || 'Failed to start effect' };
    }

    const currentBalance = Number((state.v_t as Record<string, unknown>).balance || 0);
    const nextBalance = Number(params.intent.next_v.balance ?? currentBalance);

    const nextState = {
      org_id: params.orgId,
      epoch: state.epoch,
      sequence: nextSequence,
      v_t: {
        ...params.intent.next_v,
        last_direction: Math.sign(nextBalance - currentBalance),
      },
      t_t: params.intent.next_t,
      g_t: params.intent.next_g,
      i_t: params.intent.next_i,
      s_star_hash: sha256Hex(params.intent.next_v),
      updated_at: nowIso,
    };

    nextStateHash = sha256Hex(nextState);
    const { error: truthError } = await params.supabase.from('runtime_truth_state').upsert(nextState, { onConflict: 'org_id' });
    if (truthError) {
      return { ok: false as const, status: 500, error: truthError.message };
    }
  }

  const { data: lastEntry } = await params.supabase
    .from('ledger_entries')
    .select('entry_hash')
    .eq('org_id', params.orgId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  const ledger = await appendLedgerEntry(params.supabase, {
    org_id: params.orgId,
    agent_id: params.agentId,
    request_id: params.intent.request_id,
    approval_hash: params.approval.approval_hash,
    sequence: nextSequence,
    epoch: state.epoch,
    action: params.intent.action,
    input_hash: inputHash,
    decision: gate.decision,
    reason: gate.reason,
    prev_state_hash: prevStateHash,
    next_state_hash: nextStateHash,
    effect_id: effectId,
    logical_ts: params.intent.next_t,
    prev_entry_hash: String(lastEntry?.entry_hash || 'GENESIS'),
    metadata: { gate_metrics: gate.metrics },
  });

  if (!ledger.ok) {
    return { ok: false as const, status: 500, error: 'Failed to append ledger entry' };
  }

  await writeCheckpoint({
    supabase: params.supabase,
    orgId: params.orgId,
    sequence: nextSequence,
    epoch: state.epoch,
    entryHash: ledger.entry_hash,
    snapshot: {
      epoch: state.epoch,
      sequence: nextSequence,
      v_t: gate.decision === 'ALLOW' ? params.intent.next_v : state.v_t,
      t_t: gate.decision === 'ALLOW' ? params.intent.next_t : state.t_t,
      g_t: gate.decision === 'ALLOW' ? params.intent.next_g : state.g_t,
      i_t: gate.decision === 'ALLOW' ? params.intent.next_i : state.i_t,
      s_star_hash: gate.decision === 'ALLOW' ? sha256Hex(params.intent.next_v) : state.s_star_hash,
    },
  });

  return {
    ok: true as const,
    decision: gate.decision,
    reason: gate.reason,
    sequence: nextSequence,
    input_hash: inputHash,
    effect_id: effectId,
    entry_hash: ledger.entry_hash,
    approval_hash: params.approval.approval_hash,
    gate_metrics: gate.metrics,
  };
}

export async function processEffectCallback(params: {
  supabase: any;
  orgId: string;
  effectId: string;
  status: 'committed' | 'failed';
  payload: Record<string, unknown>;
}) {
  const settle = await settleEffect({
    supabase: params.supabase,
    orgId: params.orgId,
    effectId: params.effectId,
    status: params.status,
    receipt: params.payload,
  });

  if (!settle.ok) {
    return { ok: false as const, error: settle.error || 'Failed to settle effect' };
  }

  return { ok: true as const };
}
