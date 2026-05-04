import { NextResponse } from 'next/server';

import type {
  DsgMemoryEvent,
  MemoryKind,
  MemoryRetrievalScope,
  MemoryStatus,
  MemoryUsePurpose,
} from './types';
import type { MemoryRequestContext } from './request-context';
import { memoryContextBoundary } from './request-context';

const PURPOSES: MemoryUsePurpose[] = [
  'planning',
  'approval_review',
  'runtime_execution',
  'verification',
  'completion_report',
  'support',
];

export function jsonOk(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      ok: true,
      ...payload,
      boundary: memoryContextBoundary(),
    },
    { status },
  );
}

export function jsonFail(error: string, status = 400, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(details ? { details } : {}),
      boundary: memoryContextBoundary(),
    },
    { status },
  );
}

export function errorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes('REQUIRED') ||
    message.includes('DISABLED') ||
    message.includes('PERMISSION')
  ) {
    return 403;
  }

  return 500;
}

export function safeErrorCode(error: unknown): string {
  if (error instanceof Error) {
    const [code] = error.message.split(':');
    return code || 'MEMORY_ROUTE_FAILED';
  }

  return 'MEMORY_ROUTE_FAILED';
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

  return items.length ? items : undefined;
}

export function parseScope(
  context: MemoryRequestContext,
  raw: unknown,
  fallbackPurpose: MemoryUsePurpose,
): MemoryRetrievalScope {
  const value = asRecord(raw);
  const purpose = typeof value.purpose === 'string' && PURPOSES.includes(value.purpose as MemoryUsePurpose)
    ? value.purpose as MemoryUsePurpose
    : fallbackPurpose;

  return {
    workspaceId: context.workspaceId,
    jobId: optionalString(value.jobId),
    projectId: optionalString(value.projectId),
    actorId: context.actorId,
    purpose,
    allowedMemoryKinds: stringArray(value.allowedMemoryKinds) as MemoryKind[] | undefined,
    includeStale: value.includeStale === true,
    includeConflicted: value.includeConflicted === true,
    requireVerifiedEvidence: value.requireVerifiedEvidence === true,
  };
}

export function parseBodyMemory(value: unknown): DsgMemoryEvent | null {
  const record = asRecord(value);
  const id = optionalString(record.id);
  const workspaceId = optionalString(record.workspaceId);
  const actorId = optionalString(record.actorId);
  const actorRole = optionalString(record.actorRole);
  const rawText = optionalString(record.rawText);
  const contentHash = optionalString(record.contentHash);

  if (!id || !workspaceId || !actorId || !actorRole || !rawText || !contentHash) {
    return null;
  }

  return {
    id,
    workspaceId,
    jobId: optionalString(record.jobId),
    actorId,
    actorRole,
    sourceType: (optionalString(record.sourceType) ?? 'manual_note') as DsgMemoryEvent['sourceType'],
    memoryKind: (optionalString(record.memoryKind) ?? 'unknown') as DsgMemoryEvent['memoryKind'],
    rawText,
    normalizedSummary: optionalString(record.normalizedSummary),
    trustLevel: (optionalString(record.trustLevel) ?? 'user_supplied') as DsgMemoryEvent['trustLevel'],
    status: (optionalString(record.status) ?? 'active') as MemoryStatus,
    containsSecret: record.containsSecret === true,
    containsPii: record.containsPii === true,
    containsLegalClaim: record.containsLegalClaim === true,
    containsProductionClaim: record.containsProductionClaim === true,
    sourceEvidenceId: optionalString(record.sourceEvidenceId),
    sourceAuditId: optionalString(record.sourceAuditId),
    contentHash,
    metadata: asRecord(record.metadata),
    createdAt: optionalString(record.createdAt) ?? new Date(0).toISOString(),
    updatedAt: optionalString(record.updatedAt) ?? new Date(0).toISOString(),
  };
}

export function parseBodyMemories(value: unknown): DsgMemoryEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => parseBodyMemory(item))
    .filter((item): item is DsgMemoryEvent => item !== null);
}
