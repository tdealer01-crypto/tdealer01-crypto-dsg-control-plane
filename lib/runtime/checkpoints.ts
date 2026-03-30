import { getSupabaseAdmin } from '../supabase-server';
import { sha256Hex } from './canonical';

const CHECKPOINT_INTERVAL = 10;

export async function maybeWriteCheckpoint(params: {
  orgId: string;
  sequence: number;
  epoch: number;
  stateHash: string;
  entryHash: string;
  snapshot: Record<string, unknown>;
}) {
  if (params.sequence === 0 || params.sequence % CHECKPOINT_INTERVAL !== 0) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('state_checkpoints')
    .upsert(
      {
        org_id: params.orgId,
        sequence: params.sequence,
        epoch: params.epoch,
        state_hash: params.stateHash,
        entry_hash: params.entryHash,
        snapshot: params.snapshot,
      },
      { onConflict: 'org_id,sequence' }
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to write checkpoint');
  }

  return data;
}

export async function verifyLedgerSequence(orgId: string, sequence: number) {
  const supabase = getSupabaseAdmin();

  const { data: entries, error } = await supabase
    .from('ledger_entries')
    .select('*')
    .eq('org_id', orgId)
    .lte('sequence', sequence)
    .order('sequence', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const ledger = entries || [];
  const mismatches: Array<{ sequence: number; reason: string }> = [];

  for (let i = 0; i < ledger.length; i += 1) {
    const current = ledger[i];
    const previous = i > 0 ? ledger[i - 1] : null;

    if (previous && current.prev_entry_hash !== previous.entry_hash) {
      mismatches.push({ sequence: Number(current.sequence), reason: 'PREV_ENTRY_HASH_MISMATCH' });
    }

    const expectedHash = sha256Hex({
      org_id: current.org_id,
      agent_id: current.agent_id,
      request_id: current.request_id,
      approval_hash: current.approval_hash,
      sequence: Number(current.sequence),
      epoch: Number(current.epoch),
      action: current.action,
      input_hash: current.input_hash,
      decision: current.decision,
      reason: current.reason,
      prev_state_hash: current.prev_state_hash,
      next_state_hash: current.next_state_hash,
      effect_id: current.effect_id,
      logical_ts: Number(current.logical_ts),
      prev_entry_hash: current.prev_entry_hash,
      metadata: current.metadata || {},
    });

    if (expectedHash !== current.entry_hash) {
      mismatches.push({ sequence: Number(current.sequence), reason: 'ENTRY_HASH_MISMATCH' });
    }
  }

  return {
    upto_sequence: sequence,
    checked_entries: ledger.length,
    ok: mismatches.length === 0,
    mismatches,
  };
}

export async function replayStateToSequence(orgId: string, sequence: number) {
  const supabase = getSupabaseAdmin();

  const { data: truthState, error: truthError } = await supabase
    .from('runtime_truth_state')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();

  if (truthError) {
    throw new Error(truthError.message);
  }

  const { data: checkpoint, error: checkpointError } = await supabase
    .from('state_checkpoints')
    .select('*')
    .eq('org_id', orgId)
    .lte('sequence', sequence)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (checkpointError) {
    throw new Error(checkpointError.message);
  }

  const { data: ledger, error: ledgerError } = await supabase
    .from('ledger_entries')
    .select('sequence, epoch, next_state_hash, created_at')
    .eq('org_id', orgId)
    .lte('sequence', sequence)
    .order('sequence', { ascending: true });

  if (ledgerError) {
    throw new Error(ledgerError.message);
  }

  const replayTail = (ledger || []).filter((item) =>
    checkpoint ? Number(item.sequence) > Number(checkpoint.sequence) : true
  );

  const terminal = (ledger || [])[Math.max((ledger || []).length - 1, 0)] || null;

  return {
    org_id: orgId,
    target_sequence: sequence,
    checkpoint: checkpoint || null,
    replay_count: replayTail.length,
    terminal_state_hash: terminal?.next_state_hash || null,
    current_truth_state: truthState || null,
  };
}
