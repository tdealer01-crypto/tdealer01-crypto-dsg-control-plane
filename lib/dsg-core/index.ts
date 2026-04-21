import {
  getInternalDSGCoreHealth,
} from './internal';
import {
  getRemoteDSGCoreAuditEvents,
  getRemoteDSGCoreDeterminism,
  getRemoteDSGCoreHealth,
  getRemoteDSGCoreLedger,
  getRemoteDSGCoreMetrics,
} from './remote';
import type { DSGCoreAuditEvent, DSGCoreMode } from './types';

export type {
  DSGCoreAuditEvent,
  DSGCoreDeterminism,
  DSGCoreExecutionRequest,
} from './types';

function parseMode(): DSGCoreMode {
  const mode = process.env.DSG_CORE_MODE;
  if (mode === 'internal' || mode === 'remote') {
    return mode;
  }
  throw new Error('DSG_CORE_MODE must be explicitly set to "internal" or "remote"');
}

function getRemoteConfig() {
  const url = process.env.DSG_CORE_URL?.replace(/\/$/, '') || '';
  if (!url) {
    throw new Error('DSG_CORE_URL is required when DSG_CORE_MODE=remote');
  }
  return {
    url,
    apiKey: process.env.DSG_CORE_API_KEY || process.env.DSG_API_KEY || '',
  };
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function parseRegionFromEvidence(evidence: unknown) {
  const obj = toObject(evidence);
  const metadata = toObject(obj.metadata);
  return String(
    obj.region_id ?? obj.regionId ?? obj.region ?? metadata.region_id ?? metadata.region ?? 'internal-runtime'
  );
}

async function fetchInternalAuditRows(limit = 20, orgId?: string) {
  const { getSupabaseAdmin } = await import('../supabase-server');
  const admin = getSupabaseAdmin() as any;

  const { data, error } = await admin
    .from('audit_logs')
    .select('id, created_at, decision, evidence')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { ok: false as const, items: [] as DSGCoreAuditEvent[], error: error.message };
  }

  const items = (data ?? []).map((row: any, index: number) => {
    const evidence = toObject(row.evidence);
    const coreResult = toObject(evidence.core_result);
    const sequence =
      toFiniteNumber(evidence.sequence) ??
      toFiniteNumber(coreResult.sequence) ??
      toFiniteNumber(evidence.epoch) ??
      toFiniteNumber(coreResult.epoch) ??
      index + 1;

    return {
      id: toFiniteNumber(row.id) ?? undefined,
      epoch: sequence,
      sequence,
      region_id: parseRegionFromEvidence(row.evidence),
      state_hash:
        (evidence.state_hash as string | null | undefined) ??
        (coreResult.state_hash as string | null | undefined) ??
        (evidence.proof_hash as string | null | undefined) ??
        null,
      entropy:
        toFiniteNumber(evidence.entropy) ??
        toFiniteNumber(coreResult.entropy) ??
        toFiniteNumber(evidence.stability_score) ??
        null,
      gate_result: (row.decision as string | null | undefined) ?? 'ALLOW',
      z3_proof_hash:
        (evidence.z3_proof_hash as string | null | undefined) ??
        (coreResult.z3_proof_hash as string | null | undefined) ??
        null,
      signature:
        (evidence.signature as string | null | undefined) ??
        (coreResult.signature as string | null | undefined) ??
        null,
      metadata: evidence,
      created_at: (row.created_at as string | null | undefined) ?? null,
    } satisfies DSGCoreAuditEvent;
  });

  return { ok: true as const, items };
}

async function getInternalMetrics(orgId?: string) {
  const { getSupabaseAdmin } = await import('../supabase-server');
  const admin = getSupabaseAdmin() as any;

  const [executionsRes, agentsRes] = await Promise.all([
    admin.from('executions').select('id,decision,latency_ms,created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(200),
    admin.from('agents').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active'),
  ]);

  if (executionsRes.error) {
    return { ok: false as const, error: executionsRes.error.message };
  }

  if (agentsRes.error) {
    return { ok: false as const, error: agentsRes.error.message };
  }

  const rows = executionsRes.data ?? [];
  const total = rows.length;
  const avgLatencyMs = total
    ? Math.round(rows.reduce((sum: number, row: any) => sum + Number(row.latency_ms || 0), 0) / total)
    : 0;

  return {
    ok: true as const,
    data: {
      mode: 'internal',
      executions_total: total,
      decisions: {
        ALLOW: rows.filter((row: any) => row.decision === 'ALLOW').length,
        STABILIZE: rows.filter((row: any) => row.decision === 'STABILIZE').length,
        BLOCK: rows.filter((row: any) => row.decision === 'BLOCK').length,
      },
      avg_latency_ms: avgLatencyMs,
      active_agents: Number(agentsRes.count || 0),
      generated_at: new Date().toISOString(),
    },
  };
}



function internalScopeError(operation: string) {
  return { ok: false as const, error: `org_id is required for internal DSG core ${operation}` };
}

export function getDSGCoreConfig() {
  const mode = parseMode();
  const remote = mode === 'remote' ? getRemoteConfig() : { url: '', apiKey: '' };
  return {
    mode,
    url: remote.url,
    apiKey: remote.apiKey,
  };
}

export async function getDSGCoreHealth() {
  const mode = parseMode();
  if (mode === 'internal') return getInternalDSGCoreHealth();
  return getRemoteDSGCoreHealth(getRemoteConfig());
}

export async function executeOnDSGCore(payload: import('./types').DSGCoreExecutionRequest) {
  const { resolveGate } = await import('../gate');
  const gate = resolveGate();
  return gate.evaluate({
    agent_id: payload.agent_id,
    action: payload.action,
    payload: payload.payload,
  });
}

export async function getDSGCoreMetrics(options?: { orgId?: string }) {
  const mode = parseMode();
  if (mode === 'internal') {
    if (!options?.orgId) return internalScopeError('metrics');
    return getInternalMetrics(options.orgId);
  }
  return getRemoteDSGCoreMetrics(getRemoteConfig());
}

export async function getDSGCoreLedger(limit = 20, options?: { orgId?: string }) {
  const mode = parseMode();
  if (mode === 'internal') {
    if (!options?.orgId) return { ok: false as const, items: [], error: internalScopeError('ledger').error };
    const audit = await fetchInternalAuditRows(limit, options.orgId);
    if (!audit.ok) {
      return { ok: false as const, items: [], error: audit.error };
    }

    const items = audit.items.map((item) => ({
      sequence: item.sequence,
      gate_result: item.gate_result,
      state_hash: item.state_hash,
      entropy: item.entropy,
      created_at: item.created_at,
      metadata: {
        region_id: item.region_id,
        ...toObject(item.metadata),
      },
    }));

    return { ok: true as const, items };
  }
  return getRemoteDSGCoreLedger(getRemoteConfig(), limit);
}

export async function getDSGCoreAuditEvents(limit = 20, options?: { orgId?: string }) {
  const mode = parseMode();
  if (mode === 'internal') {
    if (!options?.orgId) return { ok: false as const, items: [], error: internalScopeError('audit events').error };
    return fetchInternalAuditRows(limit, options.orgId);
  }
  return getRemoteDSGCoreAuditEvents(getRemoteConfig(), limit);
}

export async function getDSGCoreDeterminism(sequence: number, options?: { orgId?: string }) {
  const mode = parseMode();
  if (mode === 'internal') {
    if (!options?.orgId) return internalScopeError('determinism');
    const audit = await fetchInternalAuditRows(200, options.orgId);
    if (!audit.ok) {
      return { ok: false as const, error: audit.error };
    }

    const sameSequence = audit.items.filter((item) => item.sequence === sequence);
    if (sameSequence.length === 0) {
      return { ok: false as const, error: `No deterministic sample found for sequence ${sequence}` };
    }

    const uniqueHashes = new Set(
      sameSequence.map((item) => item.state_hash).filter((hash): hash is string => Boolean(hash))
    );

    return {
      ok: true as const,
      data: {
        sequence,
        region_count: new Set(sameSequence.map((item) => item.region_id)).size,
        unique_state_hashes: uniqueHashes.size,
        max_entropy: Math.max(...sameSequence.map((item) => Number(item.entropy ?? 0)), 0),
        deterministic: uniqueHashes.size <= 1,
        gate_action: String(sameSequence[0]?.gate_result ?? 'ALLOW'),
      },
    };
  }
  return getRemoteDSGCoreDeterminism(getRemoteConfig(), sequence);
}
