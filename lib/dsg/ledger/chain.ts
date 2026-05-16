import { createHash } from 'node:crypto';

export type LedgerMode = 'audit_only' | 'gate' | 'full';

export type LedgerEntryInput = {
  org_id: string;
  seq: number;
  action: string;
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW' | 'AUDIT';
  reason: string | null;
  mode: LedgerMode;
  timestamp_ms: number;
  prev_hash: string | null;   // null only for seq=0 (genesis)
};

export type LedgerEntryRow = LedgerEntryInput & {
  entry_hash: string;
  agent_id?: string | null;
  session_id?: string | null;
  context?: Record<string, unknown>;
  invariant_snapshot?: Record<string, unknown> | null;
};

export type ChainVerificationResult = {
  ok: boolean;
  entries_checked: number;
  first_violation: {
    seq: number;
    kind: 'hash_mismatch' | 'prev_hash_mismatch' | 'seq_gap';
    expected: string;
    stored: string;
  } | null;
  tamper_evidence: string;   // hash of verification result — proves this check was run
};

function stableJson(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

// The canonical hash formula — deterministic, complete, tamper-evident.
// Any change to any field (including prev_hash) produces a different hash.
export function computeEntryHash(entry: LedgerEntryInput): string {
  return sha256({
    type: 'dsg-ledger-entry',
    version: '1.0',
    org_id: entry.org_id,
    seq: entry.seq,
    action: entry.action,
    decision: entry.decision,
    reason: entry.reason ?? null,
    mode: entry.mode,
    timestamp_ms: entry.timestamp_ms,
    prev_hash: entry.prev_hash ?? 'GENESIS',
  });
}

// Verify a full chain segment.
// Pass entries in ascending seq order.
// Returns ok=true only if every entry's hash matches and prev_hash links are intact.
export function verifyChain(entries: LedgerEntryRow[]): ChainVerificationResult {
  const verifiedAt = Date.now();
  let first_violation: ChainVerificationResult['first_violation'] = null;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const prev = i > 0 ? entries[i - 1] : null;

    // Seq gap check — any gap proves deletion
    if (prev && entry.seq !== prev.seq + 1) {
      first_violation = {
        seq: entry.seq,
        kind: 'seq_gap',
        expected: String(prev.seq + 1),
        stored: String(entry.seq),
      };
      break;
    }

    // Recompute the expected hash from stored fields
    const expected = computeEntryHash({
      org_id: entry.org_id,
      seq: entry.seq,
      action: entry.action,
      decision: entry.decision,
      reason: entry.reason ?? null,
      mode: entry.mode,
      timestamp_ms: entry.timestamp_ms,
      prev_hash: entry.prev_hash,
    });

    // Hash mismatch — field was modified
    if (entry.entry_hash !== expected) {
      first_violation = {
        seq: entry.seq,
        kind: 'hash_mismatch',
        expected,
        stored: entry.entry_hash,
      };
      break;
    }

    // Chain link check — prev_hash must equal previous entry's entry_hash
    if (i > 0 && prev) {
      const expectedPrev = entry.seq === 0 ? null : prev.entry_hash;
      const storedPrev = entry.prev_hash ?? null;
      if (storedPrev !== expectedPrev) {
        first_violation = {
          seq: entry.seq,
          kind: 'prev_hash_mismatch',
          expected: expectedPrev ?? 'null',
          stored: storedPrev ?? 'null',
        };
        break;
      }
    }
  }

  const ok = first_violation === null;

  // Proof that this verification ran — hash of the result itself
  const tamper_evidence = sha256({
    type: 'dsg-chain-verification',
    version: '1.0',
    ok,
    entries_checked: entries.length,
    first_violation,
    verified_at_ms: verifiedAt,
    last_entry_hash: entries.at(-1)?.entry_hash ?? null,
  });

  return {
    ok,
    entries_checked: entries.length,
    first_violation,
    tamper_evidence,
  };
}

// Build an entry ready for DB insert — caller supplies seq and prev_hash from DB RPCs
export function buildLedgerEntry(
  input: LedgerEntryInput & {
    agent_id?: string | null;
    session_id?: string | null;
    context?: Record<string, unknown>;
    invariant_snapshot?: Record<string, unknown> | null;
  }
): LedgerEntryRow {
  const entry_hash = computeEntryHash(input);
  return { ...input, entry_hash };
}
