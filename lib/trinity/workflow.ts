import crypto from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { transferSOL } from '@/lib/solana/client';

export type TrinityRole = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface TrinityActorContext {
  orgId: string;
  actorId: string;
  role: TrinityRole;
  walletAddress?: string;
}

export interface TrinityGovernanceResult {
  approved: boolean;
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  policyVersion: string;
  violations: string[];
  constraints: Array<{ name: string; satisfied: boolean; detail?: string }>;
}

const MUTATION_ROLES = new Set<TrinityRole>(['OWNER', 'ADMIN', 'OPERATOR']);
const VERIFY_ROLES = new Set<TrinityRole>(['OWNER', 'ADMIN']);

function normalizeRole(value: string | null): TrinityRole {
  const normalized = String(value ?? '').toUpperCase();
  if (normalized === 'OWNER' || normalized === 'ADMIN' || normalized === 'OPERATOR' || normalized === 'VIEWER') {
    return normalized;
  }
  return 'VIEWER';
}

export function parseActorContext(headers: Headers): TrinityActorContext {
  return {
    orgId: headers.get('x-trinity-org-id') || process.env.TRINITY_DEFAULT_ORG_ID || 'default-org',
    actorId: headers.get('x-trinity-actor-id') || headers.get('x-agent-id') || 'anonymous-agent',
    role: normalizeRole(headers.get('x-trinity-role')),
    walletAddress: headers.get('x-trinity-wallet-address') || undefined,
  };
}

export function assertMutationRole(actor: TrinityActorContext): void {
  if (!MUTATION_ROLES.has(actor.role)) {
    throw new Error(`RBAC denied: ${actor.role} cannot mutate Trinity jobs`);
  }
}

export function assertVerifyRole(actor: TrinityActorContext): void {
  if (!VERIFY_ROLES.has(actor.role)) {
    throw new Error(`RBAC denied: ${actor.role} cannot verify/settle Trinity jobs`);
  }
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export function normalizeSeverity(value?: string): 'critical' | 'high' | 'medium' | 'low' | 'unknown' {
  const severity = String(value ?? '').toLowerCase();
  if (severity === 'critical' || severity === 'high' || severity === 'medium' || severity === 'low') {
    return severity;
  }
  return 'unknown';
}

export function createHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 44);
}

export function evaluateGovernance(
  job: {
    rewardAmount: number;
    deadline: string;
    requirements: string[];
    severity?: string;
    exploitCid?: string;
  },
  agent: { reputation: number; skills: string[] },
): TrinityGovernanceResult {
  const severity = normalizeSeverity(job.severity);
  const riskThreshold = severity === 'critical' ? 85 : severity === 'high' ? 70 : 0;
  const constraints = [
    { name: 'Agent Active', satisfied: agent.reputation >= 0 },
    { name: 'Job Amount Valid', satisfied: job.rewardAmount > 0 && job.rewardAmount < 100_000 },
    { name: 'Deadline Valid', satisfied: new Date(job.deadline) > new Date() },
    { name: 'Agent Qualified', satisfied: agent.skills.length > 0 },
    { name: 'No Sanctions', satisfied: agent.reputation >= 0 },
    {
      name: 'Severity Gate',
      satisfied: riskThreshold === 0 || agent.reputation >= riskThreshold,
      detail: `severity=${severity} min_reputation=${riskThreshold}`,
    },
    {
      name: 'Exploit CID Required',
      satisfied: severity === 'critical' || severity === 'high' ? Boolean(job.exploitCid) : true,
      detail: 'required for high/critical',
    },
  ];

  const violations = constraints.filter((c) => !c.satisfied).map((c) => c.name);
  const decision: 'ALLOW' | 'REVIEW' | 'BLOCK' = violations.length > 0 ? 'BLOCK' : severity === 'unknown' ? 'REVIEW' : 'ALLOW';

  return {
    approved: decision === 'ALLOW',
    decision,
    policyVersion: '2.0',
    violations,
    constraints,
  };
}

export async function appendAuditEvent(params: {
  supabase: SupabaseClient | null;
  orgId: string;
  jobId: string;
  eventType: string;
  actorId: string;
  payload?: unknown;
}) {
  if (!params.supabase) return;
  await params.supabase.from('trinity_audit_events').insert({
    org_id: params.orgId,
    job_id: params.jobId,
    event_type: params.eventType,
    actor_id: params.actorId,
    payload: params.payload ?? {},
    event_hash: createHash(
      `${params.jobId}:${params.eventType}:${JSON.stringify(params.payload ?? {})}:${crypto.randomUUID()}`,
    ),
  });
}

export async function settleJob(params: {
  supabase: SupabaseClient | null;
  orgId: string;
  actorId: string;
  jobId: string;
  idempotencyKey: string;
}) {
  const { supabase, orgId, actorId, jobId, idempotencyKey } = params;
  if (!supabase) {
    return {
      ok: false,
      status: 'pending_manual_review' as const,
      reason: 'Supabase not configured',
    };
  }

  const { data: existing } = await supabase
    .from('trinity_settlements')
    .select('id, status, tx_signature, idempotency_key, reason')
    .eq('org_id', orgId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      status: existing.status,
      txSignature: existing.tx_signature,
      idempotencyKey: existing.idempotency_key,
      reason: existing.reason,
      replaySafe: true,
    };
  }

  const { data: job } = await supabase
    .from('trinity_jobs')
    .select('id, reward_amount, reward_currency, worker_wallet_address')
    .eq('org_id', orgId)
    .eq('id', jobId)
    .maybeSingle();

  if (!job) {
    return { ok: false, status: 'failed' as const, reason: 'job not found' };
  }

  let status: 'pending_manual_review' | 'failed' = 'pending_manual_review';
  let txSignature: string | null = null;
  let reason: string | null = 'pending_manual_review';

  await supabase
    .from('trinity_jobs')
    .update({ status: 'pending_settlement_review' })
    .eq('org_id', orgId)
    .eq('id', jobId);

  await supabase.from('trinity_settlements').insert({
    org_id: orgId,
    job_id: jobId,
    idempotency_key: idempotencyKey,
    status,
    tx_signature: txSignature,
    reason,
    settled_by: actorId,
  });

  await appendAuditEvent({
    supabase,
    orgId,
    jobId,
    eventType: 'settlement.attempted',
    actorId,
    payload: { status, txSignature, reason, idempotencyKey },
  });

  return {
    ok: status === 'paid',
    status,
    txSignature,
    idempotencyKey,
    reason,
    replaySafe: true,
  };
}
