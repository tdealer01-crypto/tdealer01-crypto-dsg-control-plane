import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { memoryBoundary } from './context';
import type { DsgMemoryEvent, DsgMemoryGateResult, DsgMemoryPurpose, DsgMemoryScope } from './types';

const PURPOSES: DsgMemoryPurpose[] = ['planning', 'approval_review', 'runtime_execution', 'verification', 'completion_report', 'support'];

export function jsonOk(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...payload, boundary: memoryBoundary() }, { status });
}

export function jsonFail(error: unknown, status = 400) {
  const code = error instanceof Error ? error.message : String(error || 'MEMORY_ROUTE_FAILED');
  return NextResponse.json({ ok: false, error: { code, message: code }, boundary: memoryBoundary() }, { status });
}

export function statusForError(error: unknown): number {
  const code = error instanceof Error ? error.message : String(error || '');
  if (code.includes('DISABLED') || code.includes('REQUIRED') || code.includes('PERMISSION')) return 403;
  return 400;
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function parseScope(raw: unknown, fallbackPurpose: DsgMemoryPurpose): DsgMemoryScope {
  const record = asRecord(raw);
  const rawPurpose = optionalString(record.purpose);
  const purpose = rawPurpose && PURPOSES.includes(rawPurpose as DsgMemoryPurpose) ? (rawPurpose as DsgMemoryPurpose) : fallbackPurpose;
  return {
    purpose,
    jobId: optionalString(record.jobId),
    requireVerifiedEvidence: record.requireVerifiedEvidence === true,
  };
}

export function parseMemories(value: unknown): DsgMemoryEvent[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => item as DsgMemoryEvent).filter((item) => Boolean(item?.id && item.rawText));
}

export function evaluateMemoryGate(memories: DsgMemoryEvent[], scope: DsgMemoryScope): DsgMemoryGateResult {
  const reasons: string[] = [];
  const allowedMemoryIds: string[] = [];
  const blockedMemoryIds: string[] = [];
  const reviewMemoryIds: string[] = [];

  for (const memory of memories) {
    if (memory.status === 'blocked' || memory.status === 'deleted' || memory.containsSecret) {
      blockedMemoryIds.push(memory.id);
      reasons.push(`BLOCKED_MEMORY:${memory.id}`);
      continue;
    }
    if (memory.containsProductionClaim || memory.containsLegalClaim || memory.status === 'conflicted') {
      reviewMemoryIds.push(memory.id);
      reasons.push(`REVIEW_MEMORY:${memory.id}`);
      continue;
    }
    if (scope.requireVerifiedEvidence && memory.trustLevel !== 'verified' && memory.trustLevel !== 'observed') {
      reviewMemoryIds.push(memory.id);
      reasons.push(`MEMORY_NOT_VERIFIED:${memory.id}`);
      continue;
    }
    allowedMemoryIds.push(memory.id);
  }

  const status = blockedMemoryIds.length ? 'BLOCK' : reviewMemoryIds.length ? 'REVIEW' : 'PASS';
  if (!reasons.length) reasons.push('MEMORY_GATE_PASS');
  return { status, reasons, allowedMemoryIds, blockedMemoryIds, reviewMemoryIds };
}

export function buildContextText(memories: DsgMemoryEvent[], gate: DsgMemoryGateResult): string {
  const allowed = new Set(gate.allowedMemoryIds);
  const lines = memories
    .filter((memory) => allowed.has(memory.id))
    .map((memory) => `- [${memory.memoryKind}/${memory.trustLevel}] ${memory.normalizedSummary || memory.rawText}`);
  return lines.join('\n') || '[NO_ALLOWED_MEMORY]';
}
