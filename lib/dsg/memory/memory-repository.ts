import { randomUUID } from 'node:crypto';

import { getSupabaseAdmin } from '../../supabase-server';
import { buildMemoryContextPack } from './context-pack';
import { evaluateMemoryGate } from './memory-gate';
import type {
  DsgMemoryEvent,
  MemoryContextPack,
  MemoryGateResult,
  MemoryKind,
  MemoryRetrievalScope,
  MemorySourceType,
  MemoryStatus,
  MemoryTrustLevel,
} from './types';
import type { MemoryRequestContext } from './request-context';

export type IngestMemoryInput = {
  jobId?: string;
  sourceType: MemorySourceType;
  memoryKind: MemoryKind;
  rawText: string;
  normalizedSummary?: string;
  trustLevel?: MemoryTrustLevel;
  status?: MemoryStatus;
  containsSecret?: boolean;
  containsPii?: boolean;
  containsLegalClaim?: boolean;
  containsProductionClaim?: boolean;
  sourceEvidenceId?: string;
  sourceAuditId?: string;
  contentHash: string;
  metadata?: Record<string, unknown>;
};

export type SearchMemoryInput = {
  jobId?: string;
  query?: string;
  memoryKinds?: MemoryKind[];
  statuses?: MemoryStatus[];
  limit?: number;
};

export type BuildContextPackRepositoryInput = {
  id?: string;
  memories: DsgMemoryEvent[];
  scope: MemoryRetrievalScope;
  evidenceIds?: string[];
  auditIds?: string[];
};

function db() {
  return getSupabaseAdmin() as unknown as {
    from: (table: string) => {
      insert: (value: unknown) => { select: (columns?: string) => { single: () => Promise<{ data: unknown; error: { message: string } | null }> } };
      select: (columns?: string) => QueryBuilder;
    };
  };
}

type QueryBuilder = {
  eq: (column: string, value: unknown) => QueryBuilder;
  in: (column: string, values: unknown[]) => QueryBuilder;
  ilike: (column: string, value: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (value: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
};

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function mapMemoryEvent(row: Record<string, unknown>): DsgMemoryEvent {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    jobId: text(row.job_id),
    actorId: String(row.actor_id),
    actorRole: String(row.actor_role),
    sourceType: row.source_type as MemorySourceType,
    memoryKind: row.memory_kind as MemoryKind,
    rawText: String(row.raw_text),
    normalizedSummary: text(row.normalized_summary),
    trustLevel: row.trust_level as MemoryTrustLevel,
    status: row.status as MemoryStatus,
    containsSecret: Boolean(row.contains_secret),
    containsPii: Boolean(row.contains_pii),
    containsLegalClaim: Boolean(row.contains_legal_claim),
    containsProductionClaim: Boolean(row.contains_production_claim),
    sourceEvidenceId: text(row.source_evidence_id),
    sourceAuditId: text(row.source_audit_id),
    contentHash: String(row.content_hash),
    metadata: (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function ensureRawText(rawText: string): void {
  if (!rawText.trim()) {
    throw new Error('MEMORY_RAW_TEXT_REQUIRED');
  }
}

function ensureContentHash(contentHash: string): void {
  if (!contentHash.trim()) {
    throw new Error('MEMORY_CONTENT_HASH_REQUIRED');
  }
}

export async function ingestMemoryEvent(
  context: MemoryRequestContext,
  input: IngestMemoryInput,
): Promise<DsgMemoryEvent> {
  ensureRawText(input.rawText);
  ensureContentHash(input.contentHash);

  const payload = {
    workspace_id: context.workspaceId,
    job_id: input.jobId ?? null,
    actor_id: context.actorId,
    actor_role: context.actorRole,
    source_type: input.sourceType,
    memory_kind: input.memoryKind,
    raw_text: input.rawText,
    normalized_summary: input.normalizedSummary ?? null,
    trust_level: input.trustLevel ?? 'user_supplied',
    status: input.status ?? 'active',
    contains_secret: input.containsSecret ?? false,
    contains_pii: input.containsPii ?? false,
    contains_legal_claim: input.containsLegalClaim ?? false,
    contains_production_claim: input.containsProductionClaim ?? false,
    source_evidence_id: input.sourceEvidenceId ?? null,
    source_audit_id: input.sourceAuditId ?? null,
    content_hash: input.contentHash,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await db()
    .from('dsg_memory_events')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(`MEMORY_INGEST_FAILED:${error.message}`);
  }

  return mapMemoryEvent(data as Record<string, unknown>);
}

export async function searchMemoryEvents(
  context: MemoryRequestContext,
  input: SearchMemoryInput,
): Promise<DsgMemoryEvent[]> {
  const safeLimit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  let query = db()
    .from('dsg_memory_events')
    .select('*')
    .eq('workspace_id', context.workspaceId)
    .order('created_at', { ascending: false });

  if (input.jobId) {
    query = query.eq('job_id', input.jobId);
  }

  if (input.memoryKinds?.length) {
    query = query.in('memory_kind', input.memoryKinds);
  }

  if (input.statuses?.length) {
    query = query.in('status', input.statuses);
  }

  if (input.query?.trim()) {
    query = query.ilike('raw_text', `%${input.query.trim()}%`);
  }

  const { data, error } = await query.limit(safeLimit);

  if (error) {
    throw new Error(`MEMORY_SEARCH_FAILED:${error.message}`);
  }

  return (data ?? []).map((row) => mapMemoryEvent(row as Record<string, unknown>));
}

export async function recordMemoryRetrieval(input: {
  context: MemoryRequestContext;
  queryText: string;
  scope: MemoryRetrievalScope;
  result: MemoryGateResult;
  contextPackId?: string;
}): Promise<void> {
  const { error } = await db()
    .from('dsg_memory_retrievals')
    .insert({
      workspace_id: input.context.workspaceId,
      job_id: input.scope.jobId ?? null,
      actor_id: input.context.actorId,
      query_text: input.queryText,
      retrieval_scope: input.scope,
      retrieved_memory_ids: input.result.allowedMemoryIds,
      blocked_memory_ids: input.result.blockedMemoryIds,
      review_memory_ids: input.result.reviewMemoryIds,
      gate_status: input.result.status,
      gate_reasons: input.result.reasons,
      context_pack_id: input.contextPackId ?? null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`MEMORY_RETRIEVAL_AUDIT_FAILED:${error.message}`);
  }
}

export async function gateMemoryEvents(input: {
  context: MemoryRequestContext;
  memories: DsgMemoryEvent[];
  scope: MemoryRetrievalScope;
  queryText: string;
}): Promise<MemoryGateResult> {
  const result = evaluateMemoryGate({
    memories: input.memories,
    scope: input.scope,
    actorPermissions: input.context.actorPermissions,
  });

  await recordMemoryRetrieval({
    context: input.context,
    queryText: input.queryText,
    scope: input.scope,
    result,
  });

  return result;
}

export async function createMemoryContextPack(
  context: MemoryRequestContext,
  input: BuildContextPackRepositoryInput,
): Promise<MemoryContextPack> {
  const pack = buildMemoryContextPack({
    id: input.id ?? randomUUID(),
    memories: input.memories,
    scope: input.scope,
    actorPermissions: context.actorPermissions,
    evidenceIds: input.evidenceIds,
    auditIds: input.auditIds,
    createdAt: new Date().toISOString(),
  });

  const { error } = await db()
    .from('dsg_memory_context_packs')
    .insert({
      id: pack.id,
      workspace_id: pack.workspaceId,
      job_id: pack.jobId ?? null,
      actor_id: pack.actorId,
      purpose: pack.purpose,
      memory_ids: pack.memoryIds,
      context_text: pack.contextText || '[NO_ALLOWED_MEMORY]',
      context_hash: pack.contextHash,
      gate_status: pack.gateStatus,
      gate_reasons: pack.gateReasons,
      evidence_ids: pack.evidenceIds,
      audit_ids: pack.auditIds,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`MEMORY_CONTEXT_PACK_CREATE_FAILED:${error.message}`);
  }

  await recordMemoryRetrieval({
    context,
    queryText: `context-pack:${pack.purpose}`,
    scope: input.scope,
    result: {
      status: pack.gateStatus,
      reasons: pack.gateReasons,
      allowedMemoryIds: pack.memoryIds,
      blockedMemoryIds: [],
      reviewMemoryIds: [],
    },
    contextPackId: pack.id,
  });

  return pack;
}
