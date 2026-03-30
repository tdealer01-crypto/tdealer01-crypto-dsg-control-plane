import { sha256Hex } from './canonical';

export async function writeCheckpoint(params: {
  supabase: any;
  orgId: string;
  sequence: number;
  epoch: number;
  entryHash: string;
  snapshot: Record<string, unknown>;
}) {
  const stateHash = sha256Hex(params.snapshot);
  const { error } = await params.supabase.from('state_checkpoints').upsert(
    {
      org_id: params.orgId,
      sequence: params.sequence,
      epoch: params.epoch,
      state_hash: stateHash,
      entry_hash: params.entryHash,
      snapshot: params.snapshot,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,sequence' }
  );

  return { ok: !error, error: error?.message || null, stateHash };
}

export async function replayToSequence(params: { supabase: any; orgId: string; sequence: number }) {
  const { data, error } = await params.supabase
    .from('state_checkpoints')
    .select('sequence, epoch, state_hash, entry_hash, snapshot, created_at')
    .eq('org_id', params.orgId)
    .lte('sequence', params.sequence)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  if (!data) {
    return { ok: false as const, error: 'No checkpoint found at or before sequence' };
  }

  return { ok: true as const, checkpoint: data };
}
