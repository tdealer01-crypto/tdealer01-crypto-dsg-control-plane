/**
 * Supabase-backed repository for DSG persistent memory events.
 *
 * Reads and writes the `dsg_memory_events` table via the server-side PostgREST
 * helpers. Server-only (uses the service-role config). On any database or
 * configuration failure these functions throw; callers are expected to catch
 * and degrade gracefully. They never fabricate rows.
 *
 * Note: this assumes a `dsg_memory_events` table scoped by `workspace_id` with
 * the columns mapped below. If the table is absent the underlying REST call
 * throws and the caller treats memory as unavailable.
 */

import {
  getDsgSupabaseRpcConfig,
  readDsgRest,
} from '@/lib/dsg/server/supabase-rpc';
import type { DsgMemoryRequestContext } from './context';
import type {
  DsgMemoryEvent,
  DsgMemoryIngestInput,
  DsgMemoryKind,
  DsgMemorySourceType,
  DsgMemoryStatus,
  DsgMemoryTrustLevel,
} from './types';

const TABLE = 'dsg_memory_events';

/** Raw PostgREST row shape (snake_case columns). */
type MemoryRow = {
  id: string;
  workspace_id: string;
  actor_id: string;
  memory_kind: string;
  source_type: string;
  raw_text: string;
  normalized_summary: string | null;
  trust_level: string;
  status: string;
  contains_secret: boolean | null;
  contains_pii: boolean | null;
  contains_legal_claim: boolean | null;
  contains_production_claim: boolean | null;
  content_hash: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function toEvent(row: MemoryRow): DsgMemoryEvent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    actorId: row.actor_id,
    memoryKind: row.memory_kind as DsgMemoryKind,
    sourceType: row.source_type as DsgMemorySourceType,
    rawText: row.raw_text,
    normalizedSummary: row.normalized_summary ?? '',
    trustLevel: row.trust_level as DsgMemoryTrustLevel,
    status: row.status as DsgMemoryStatus,
    containsSecret: Boolean(row.contains_secret),
    containsPii: Boolean(row.contains_pii),
    containsLegalClaim: Boolean(row.contains_legal_claim),
    containsProductionClaim: Boolean(row.contains_production_claim),
    contentHash: row.content_hash,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS =
  'id,workspace_id,actor_id,memory_kind,source_type,raw_text,normalized_summary,trust_level,status,contains_secret,contains_pii,contains_legal_claim,contains_production_claim,content_hash,metadata,created_at';

/**
 * Insert a memory event for the actor/workspace in `ctx` and return the stored
 * row. Uses a PostgREST insert with `Prefer: return=representation`.
 */
export async function ingestMemory(
  ctx: DsgMemoryRequestContext,
  payload: DsgMemoryIngestInput,
): Promise<DsgMemoryEvent> {
  const config = getDsgSupabaseRpcConfig();

  const body = {
    workspace_id: ctx.workspaceId,
    actor_id: ctx.actorId,
    memory_kind: payload.memoryKind,
    source_type: payload.sourceType,
    raw_text: payload.rawText,
    normalized_summary: payload.normalizedSummary,
    trust_level: payload.trustLevel,
    status: payload.status,
    contains_secret: payload.containsSecret,
    contains_pii: payload.containsPii,
    contains_legal_claim: payload.containsLegalClaim,
    contains_production_claim: payload.containsProductionClaim,
    content_hash: payload.contentHash,
    metadata: payload.metadata ?? {},
  };

  const res = await fetch(`${config.url}/rest/v1/${TABLE}?select=${encodeURIComponent(SELECT_COLUMNS)}`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Memory ingest failed (${res.status}): ${detail}`);
  }

  const rows = (await res.json()) as MemoryRow[];
  if (!rows.length) {
    throw new Error('Memory ingest returned no row');
  }
  return toEvent(rows[0]);
}

/**
 * Search memory events for the workspace in `ctx`. When `query` is provided it
 * is matched (case-insensitive substring) against `normalized_summary` via
 * PostgREST `ilike`. Results are newest-first and limited by `opts.limit`.
 */
export async function searchMemory(
  ctx: DsgMemoryRequestContext,
  opts: { query?: string; limit: number },
): Promise<DsgMemoryEvent[]> {
  const config = getDsgSupabaseRpcConfig();

  const params: Record<string, string> = {
    select: SELECT_COLUMNS,
    workspace_id: `eq.${ctx.workspaceId}`,
    order: 'created_at.desc',
    limit: String(Math.max(1, opts.limit)),
  };

  const query = opts.query?.trim();
  if (query) {
    // Escape PostgREST ilike wildcards in the user-provided fragment.
    const safe = query.replace(/[%*,]/g, ' ').trim();
    if (safe) params.normalized_summary = `ilike.*${safe}*`;
  }

  const rows = await readDsgRest<MemoryRow[]>(config, TABLE, params);
  return rows.map(toEvent);
}
