import { sha256Json } from './hash';
import type { GateStatus } from './types';

export type AuditLedgerEntry = {
  id: string;
  previousHash?: string;
  currentHash: string;
  actorId: string;
  action: string;
  decision: GateStatus;
  evidenceIds: string[];
  payload: Record<string, unknown>;
  createdAt: string;
};

export type CreateAuditLedgerEntryInput = {
  id: string;
  previousHash?: string;
  actorId: string;
  action: string;
  decision: GateStatus;
  evidenceIds?: string[];
  payload?: Record<string, unknown>;
  createdAt?: string;
};

export function createAuditLedgerEntry(input: CreateAuditLedgerEntryInput): AuditLedgerEntry {
  const entryWithoutHash = {
    id: input.id,
    previousHash: input.previousHash,
    actorId: input.actorId,
    action: input.action,
    decision: input.decision,
    evidenceIds: [...(input.evidenceIds ?? [])].sort(),
    payload: input.payload ?? {},
    createdAt: input.createdAt ?? new Date(0).toISOString(),
  };

  return {
    ...entryWithoutHash,
    currentHash: sha256Json(entryWithoutHash),
  };
}

export function verifyAuditHashChain(entries: AuditLedgerEntry[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

  for (let index = 0; index < sorted.length; index += 1) {
    const entry = sorted[index];
    const expectedPrevious = index === 0 ? undefined : sorted[index - 1].currentHash;
    if (entry.previousHash !== expectedPrevious) {
      errors.push(`AUDIT_PREVIOUS_HASH_MISMATCH:${entry.id}`);
    }

    const recomputed = createAuditLedgerEntry({
      id: entry.id,
      previousHash: entry.previousHash,
      actorId: entry.actorId,
      action: entry.action,
      decision: entry.decision,
      evidenceIds: entry.evidenceIds,
      payload: entry.payload,
      createdAt: entry.createdAt,
    });

    if (recomputed.currentHash !== entry.currentHash) {
      errors.push(`AUDIT_CURRENT_HASH_MISMATCH:${entry.id}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
