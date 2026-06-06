/**
 * Pure helpers for shaping and gating DSG memory before it is injected into a
 * prompt context. No I/O — these operate on in-memory rows only.
 *
 * The memory gate enforces the boundary that memory is context, not evidence:
 * it filters out secret-bearing rows, downgrades or excludes unverified claims
 * when verified evidence is required, and reports the reasons for its decision.
 */

import { createHash } from 'crypto';
import type { DsgMemoryEvent } from './types';

/** SHA-256 hex digest of a raw string. */
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export type MemoryGateOptions = {
  /** What the memory is being assembled for (informational, recorded in reasons). */
  purpose: string;
  /** When true, only verified-evidence-grade rows may carry legal/production claims. */
  requireVerifiedEvidence: boolean;
};

export type MemoryGateResult = {
  /** Ids of memories cleared for inclusion in the context. */
  allowedMemoryIds: string[];
  /** Overall gate status. */
  status: 'allow' | 'partial' | 'block';
  /** Human-readable reasons for the decision. */
  reasons: string[];
};

/**
 * Decide which memory rows may be injected into the context.
 *
 * Rules:
 *  - Rows flagged `containsSecret` are always excluded.
 *  - Rows with status `rejected` or `archived` are excluded.
 *  - When `requireVerifiedEvidence` is true, rows carrying legal or production
 *    claims are excluded unless their trust level is `verified_evidence`.
 *  - Remaining rows are allowed.
 */
export function evaluateMemoryGate(
  memories: DsgMemoryEvent[],
  opts: MemoryGateOptions,
): MemoryGateResult {
  const allowedMemoryIds: string[] = [];
  const reasons: string[] = [`purpose:${opts.purpose}`];
  let excluded = 0;

  for (const memory of memories) {
    if (memory.containsSecret) {
      excluded += 1;
      reasons.push(`excluded:${memory.id}:CONTAINS_SECRET`);
      continue;
    }
    if (memory.status === 'rejected' || memory.status === 'archived') {
      excluded += 1;
      reasons.push(`excluded:${memory.id}:STATUS_${memory.status.toUpperCase()}`);
      continue;
    }
    if (
      opts.requireVerifiedEvidence &&
      (memory.containsLegalClaim || memory.containsProductionClaim) &&
      memory.trustLevel !== 'verified_evidence'
    ) {
      excluded += 1;
      reasons.push(`excluded:${memory.id}:UNVERIFIED_CLAIM_REQUIRES_EVIDENCE`);
      continue;
    }
    allowedMemoryIds.push(memory.id);
  }

  let status: MemoryGateResult['status'];
  if (allowedMemoryIds.length === 0 && memories.length > 0) {
    status = 'block';
  } else if (excluded > 0) {
    status = 'partial';
  } else {
    status = 'allow';
  }

  if (excluded === 0) reasons.push('no_rows_excluded');

  return { allowedMemoryIds, status, reasons };
}

/**
 * Render the allowed memories into a compact text block for prompt injection.
 * Only rows present in `gate.allowedMemoryIds` are included.
 */
export function buildContextText(
  memories: DsgMemoryEvent[],
  gate: MemoryGateResult,
): string {
  const allowed = new Set(gate.allowedMemoryIds);
  const lines = memories
    .filter((memory) => allowed.has(memory.id))
    .map((memory) => {
      const summary = (memory.normalizedSummary || memory.rawText).replace(/\s+/g, ' ').trim();
      return `- [${memory.memoryKind}] (${memory.trustLevel}) ${summary}`;
    });

  if (!lines.length) {
    return '[NO_ALLOWED_PERSISTENT_MEMORY]';
  }

  return [
    `Persistent memory (gate: ${gate.status}, ${lines.length} item${lines.length === 1 ? '' : 's'}):`,
    ...lines,
  ].join('\n');
}
