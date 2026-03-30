import { sha256Hex } from './canonical';

export type LedgerEntryInput = {
  org_id: string;
  agent_id: string;
  request_id: string;
  approval_hash: string | null;
  sequence: number;
  epoch: number;
  action: string;
  input_hash: string;
  decision: 'ALLOW' | 'STABILIZE' | 'BLOCK';
  reason: string;
  prev_state_hash: string;
  next_state_hash: string;
  effect_id: string | null;
  logical_ts: number;
  prev_entry_hash: string;
  metadata?: Record<string, unknown>;
};

export function buildLedgerEntry(entry: LedgerEntryInput) {
  const base = {
    ...entry,
    metadata: entry.metadata || {},
  };

  return {
    ...base,
    entry_hash: sha256Hex(base),
  };
}

export async function appendLedgerEntry(
  supabase: any,
  entry: LedgerEntryInput
): Promise<{ ok: true; entry_hash: string } | { ok: false; error: string }> {
  const built = buildLedgerEntry(entry);
  const { error } = await supabase.from('ledger_entries').insert(built);
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, entry_hash: built.entry_hash };
}
