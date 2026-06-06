import { randomUUID } from 'node:crypto';
import { supabaseRest } from '../app-builder/supabase-rest';
import type { DsgMemoryContextPack, DsgMemoryEvent, DsgMemoryGateResult, DsgMemoryKind, DsgMemoryScope, DsgMemorySourceType, DsgMemoryStatus, DsgMemoryTrustLevel } from './types';
import type { DsgMemoryRequestContext } from './context';
import { buildContextText, evaluateMemoryGate, sha256 } from './route-utils';

type Row = Record<string, unknown>;

export type IngestMemoryInput = {
  jobId?: string;
  sourceType: DsgMemorySourceType;
  memoryKind: DsgMemoryKind;
  rawText: string;
  normalizedSummary?: string;
  trustLevel?: DsgMemoryTrustLevel;
  status?: DsgMemoryStatus;
  containsSecret?: boolean;
  containsPii?: boolean;
  containsLegalClaim?: boolean;
  containsProductionClaim?: boolean;
  sourceEvidenceId?: string;
  sourceAuditId?: string;
  contentHash: string;
  metadata?: Record<string, unknown>;
};

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function mapMemory(row: Row): DsgMemoryEvent {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    jobId: text(row.job_id),
    actorId: String(row.actor_id),
    actorRole: String(row.actor_role),
    sourceType: row.source_type as DsgMemorySourceType,
    memoryKind: row.memory_kind as DsgMemoryKind,
    rawText: String(row.raw_text),
    normalizedSummary: text(row.normalized_summary),
    trustLevel: row.trust_level as DsgMemoryTrustLevel,
    status: row.status as DsgMemoryStatus,
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

export async function ingestMemory(ctx: DsgMemoryRequestContext, input: IngestMemoryInput): Promise<DsgMemoryEvent> {
  const rows = await supabaseRest<Row[]>({
    method: 'POST',
    path: 'dsg_memory_events',
    body: {
      workspace_id: ctx.workspaceId,
      job_id: input.jobId ?? null,
      actor_id: ctx.actorId,
      actor_role: ctx.actorRole,
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
    },
  });
  return mapMemory(rows[0]);
}

export async function searchMemory(ctx: DsgMemoryRequestContext, input: { query?: string; jobId?: string; limit?: number }): Promise<DsgMemoryEvent[]> {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const filters = [`workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}`, 'select=*', 'order=created_at.desc', `limit=${limit}`];
  if (input.jobId) filters.push(`job_id=eq.${encodeURIComponent(input.jobId)}`);
  if (input.query) filters.push(`raw_text=ilike.*${encodeURIComponent(input.query)}*`);
  const rows = await supabaseRest<Row[]>({ path: 'dsg_memory_events', query: `?${filters.join('&')}` });
  return rows.map(mapMemory);
}

export async function recordRetrieval(ctx: DsgMemoryRequestContext, input: { queryText: string; scope: DsgMemoryScope; gate: DsgMemoryGateResult; contextPackId?: string }): Promise<void> {
  await supabaseRest<Row[]>({
    method: 'POST',
    path: 'dsg_memory_retrievals',
    body: {
      workspace_id: ctx.workspaceId,
      job_id: input.scope.jobId ?? null,
      actor_id: ctx.actorId,
      query_text: input.queryText,
      retrieval_scope: input.scope,
      retrieved_memory_ids: input.gate.allowedMemoryIds,
      blocked_memory_ids: input.gate.blockedMemoryIds,
      review_memory_ids: input.gate.reviewMemoryIds,
      gate_status: input.gate.status,
      gate_reasons: input.gate.reasons,
      context_pack_id: input.contextPackId ?? null,
    },
  });
}

export async function gateMemory(ctx: DsgMemoryRequestContext, input: { memories: DsgMemoryEvent[]; scope: DsgMemoryScope; queryText: string }): Promise<DsgMemoryGateResult> {
  const gate = evaluateMemoryGate(input.memories, input.scope);
  await recordRetrieval(ctx, { queryText: input.queryText, scope: input.scope, gate });
  return gate;
}

export async function createContextPack(ctx: DsgMemoryRequestContext, input: { memories: DsgMemoryEvent[]; scope: DsgMemoryScope; evidenceIds?: string[]; auditIds?: string[] }): Promise<DsgMemoryContextPack> {
  const gate = evaluateMemoryGate(input.memories, input.scope);
  const contextText = buildContextText(input.memories, gate);
  const contextHash = sha256(JSON.stringify({ scope: input.scope, memoryIds: gate.allowedMemoryIds, contextText }));
  const pack: DsgMemoryContextPack = {
    id: randomUUID(),
    workspaceId: ctx.workspaceId,
    jobId: input.scope.jobId,
    actorId: ctx.actorId,
    purpose: input.scope.purpose,
    memoryIds: gate.allowedMemoryIds,
    contextText,
    contextHash,
    gateStatus: gate.status,
    gateReasons: gate.reasons,
    evidenceIds: input.evidenceIds ?? [],
    auditIds: input.auditIds ?? [],
    createdAt: new Date().toISOString(),
  };

  await supabaseRest<Row[]>({
    method: 'POST',
    path: 'dsg_memory_context_packs',
    body: {
      id: pack.id,
      workspace_id: pack.workspaceId,
      job_id: pack.jobId ?? null,
      actor_id: pack.actorId,
      purpose: pack.purpose,
      memory_ids: pack.memoryIds,
      context_text: pack.contextText,
      context_hash: pack.contextHash,
      gate_status: pack.gateStatus,
      gate_reasons: pack.gateReasons,
      evidence_ids: pack.evidenceIds,
      audit_ids: pack.auditIds,
    },
  });

  await recordRetrieval(ctx, { queryText: `context-pack:${pack.purpose}`, scope: input.scope, gate, contextPackId: pack.id });
  return pack;
}
