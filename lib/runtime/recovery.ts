import { getSupabaseAdmin } from '../supabase-server';
import { buildCheckpointHash } from './checkpoint';

export type RecoveryValidationResult = {
  pass: boolean;
  org_id: string;
  agent_id: string;
  latest_checkpoint: {
    id: string;
    checkpoint_hash: string;
    created_at: string;
  } | null;
  latest_ledger_sequence: number;
  latest_truth_sequence: number;
  recomputed_checkpoint_hash: string | null;
  hash_match: boolean;
  missing_lineage: Array<{ truth_sequence: number; issue: string }>;
};

export async function validateRuntimeRecovery(input: { orgId: string; agentId: string }): Promise<RecoveryValidationResult> {
  const supabase = getSupabaseAdmin();
  const { orgId, agentId } = input;

  const [{ data: checkpoint }, { data: latestTruth }, { data: ledgerEntries }] = await Promise.all([
    supabase
      .from('runtime_checkpoints')
      .select('id, checkpoint_hash, created_at, latest_ledger_entry_id')
      .eq('org_id', orgId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('runtime_truth_states')
      .select('id, canonical_hash, created_at')
      .eq('org_id', orgId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('runtime_ledger_entries')
      .select('id, truth_state_id, ledger_sequence, truth_sequence')
      .eq('org_id', orgId)
      .eq('agent_id', agentId)
      .order('truth_sequence', { ascending: true }),
  ]);

  const entries = ledgerEntries || [];
  const latestEntry = entries[entries.length - 1] || null;
  const latestLedgerSequence = Number(latestEntry?.ledger_sequence || 0);
  const latestTruthSequence = Number(latestEntry?.truth_sequence || 0);

  const expected = new Set<number>(entries.map((entry) => Number(entry.truth_sequence || 0)).filter((v) => v > 0));
  const sequences = Array.from(expected.values());
  const maxTruthSequence = sequences.length ? Math.max(...sequences) : 0;
  const missing_lineage: Array<{ truth_sequence: number; issue: string }> = [];
  for (let seq = 1; seq <= maxTruthSequence; seq += 1) {
    if (!expected.has(seq)) {
      missing_lineage.push({ truth_sequence: seq, issue: 'missing_truth_sequence' });
    }
  }

  const recomputed_checkpoint_hash = checkpoint && latestTruth && latestEntry
    ? buildCheckpointHash({
        truthCanonicalHash: String(latestTruth.canonical_hash),
        latestLedgerId: String(latestEntry.id),
        latestLedgerSequence,
        latestTruthSequence,
      })
    : null;

  const hash_match = Boolean(checkpoint && recomputed_checkpoint_hash && checkpoint.checkpoint_hash === recomputed_checkpoint_hash);
  const pass = hash_match && missing_lineage.length === 0;

  return {
    pass,
    org_id: orgId,
    agent_id: agentId,
    latest_checkpoint: checkpoint
      ? {
          id: String(checkpoint.id),
          checkpoint_hash: String(checkpoint.checkpoint_hash),
          created_at: String(checkpoint.created_at),
        }
      : null,
    latest_ledger_sequence: latestLedgerSequence,
    latest_truth_sequence: latestTruthSequence,
    recomputed_checkpoint_hash,
    hash_match,
    missing_lineage,
  };
}
