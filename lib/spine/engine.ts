import { resolveAgentFromApiKey } from '../agent-auth';
import { getOverageRateUsd, INCLUDED_EXECUTIONS } from '../billing/overage-config';
import { getSupabaseAdmin } from '../supabase-server';
import { buildApprovalKey } from '../runtime/approval';
import { canonicalHash, canonicalJson, type CanonicalInput } from '../runtime/canonical';
import { runPipeline, SpineInfraError } from './pipeline';
import type { SpineIntentPayload, TruthState } from './types';

function getIncludedExecutions(planKey?: string | null) {
  const normalized = String(planKey || 'trial').toLowerCase();
  return INCLUDED_EXECUTIONS[normalized] || INCLUDED_EXECUTIONS.trial;
}

function rpcErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return '';
}

function mapRpcError(error: unknown) {
  const message = rpcErrorMessage(error).toLowerCase();
  const hasAny = (...patterns: string[]) => patterns.some((pattern) => message.includes(pattern));

  if (
    hasAny(
      'runtime_commit_execution',
      'function public.runtime_commit_execution',
      'could not find the function public.runtime_commit_execution'
    )
  ) {
    return {
      status: 500,
      body: { error: 'Runtime commit RPC is missing. Apply latest Supabase migrations.' },
    };
  }

  if (hasAny('runtime_approval_requests', 'relation "runtime_approval_requests" does not exist')) {
    return {
      status: 500,
      body: { error: 'Runtime spine tables are missing. Apply latest Supabase migrations.' },
    };
  }

  if (hasAny('agent_quota_exceeded', 'agent quota exceeded')) {
    return { status: 429, body: { error: 'Agent monthly quota exceeded' } };
  }
  if (hasAny('org_quota_exceeded', 'org quota exceeded')) {
    return { status: 429, body: { error: 'Organization execution quota exceeded' } };
  }
  if (hasAny('approval_request_expired', 'approval request expired')) {
    return { status: 409, body: { error: 'Runtime intent expired' } };
  }
  if (hasAny('approval_request_not_pending', 'approval request not pending')) {
    return { status: 409, body: { error: 'Runtime intent is not pending' } };
  }
  if (hasAny('approval_request_not_found', 'approval request not found')) {
    return { status: 409, body: { error: 'Runtime intent not found' } };
  }
  if (hasAny('approval_consumed_without_ledger_lineage', 'approval consumed without ledger lineage')) {
    return { status: 500, body: { error: 'Approval consumed without ledger lineage' } };
  }
  if (hasAny('approval_consumption_failed', 'approval consumption failed')) {
    return { status: 409, body: { error: 'Approval consumption failed' } };
  }
  if (hasAny('invalid_decision', 'invalid decision')) {
    return { status: 500, body: { error: 'Pipeline returned invalid decision' } };
  }

  return { status: 500, body: { error: 'Internal server error' } };
}

function isMissingTableError(error: unknown, relation: string) {
  const message = rpcErrorMessage(error).toLowerCase();
  return (
    message.includes(`relation "${relation.toLowerCase()}" does not exist`) ||
    (message.includes('could not find the table') && message.includes(relation.toLowerCase())) ||
    (message.includes('schema cache') && message.includes(relation.toLowerCase()))
  );
}

async function resolveActiveAgent(orgId: string, agentId: string, apiKey: string) {
  const agent = await resolveAgentFromApiKey(agentId, apiKey);
  if (!agent || agent.org_id !== orgId) {
    return { ok: false as const, status: 401, body: { error: 'Invalid agent_id or API key' } };
  }
  if (agent.status !== 'active') {
    return { ok: false as const, status: 403, body: { error: 'Agent is not active' } };
  }
  return { ok: true as const, agent };
}

export async function issueSpineIntent(params: {
  orgId: string;
  apiKey: string;
  payload: SpineIntentPayload;
}) {
  const resolved = await resolveActiveAgent(params.orgId, params.payload.agentId, params.apiKey);
  if (!resolved.ok) return resolved;

  const supabase = getSupabaseAdmin();
  const approvalKey = buildApprovalKey({
    orgId: resolved.agent.org_id,
    agentId: resolved.agent.id,
    request: params.payload.canonicalRequest as CanonicalInput,
  });

  const { data: prior, error: priorError } = await supabase
    .from('runtime_approval_requests')
    .select('id, status, expires_at')
    .eq('org_id', resolved.agent.org_id)
    .eq('agent_id', resolved.agent.id)
    .eq('approval_key', approvalKey)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (priorError) {
    return { ok: false as const, status: 500, body: { error: 'Internal server error' } };
  }

  if (prior && prior.status !== 'pending') {
    return {
      ok: false as const,
      status: 409,
      body: {
        error: 'Intent already consumed/revoked/expired and cannot be revived',
        request_id: prior.id,
        status: prior.status,
      },
    };
  }

  if (prior && prior.status === 'pending') {
    return {
      ok: true as const,
      status: 200,
      body: { request_id: prior.id, status: prior.status, expires_at: prior.expires_at, reused: true },
    };
  }

  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
  const { data: created, error: createError } = await supabase
    .from('runtime_approval_requests')
    .insert({
      org_id: resolved.agent.org_id,
      agent_id: resolved.agent.id,
      approval_key: approvalKey,
      request_payload: params.payload.canonicalRequest,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id, status, expires_at')
    .single();

  if (createError || !created) {
    return { ok: false as const, status: 500, body: { error: 'Internal server error' } };
  }

  return {
    ok: true as const,
    status: 200,
    body: { request_id: created.id, status: created.status, expires_at: created.expires_at },
  };
}

export async function executeSpineIntent(params: {
  orgId: string;
  apiKey: string;
  payload: SpineIntentPayload;
}) {
  const resolved = await resolveActiveAgent(params.orgId, params.payload.agentId, params.apiKey);
  if (!resolved.ok) return resolved;

  const agent = resolved.agent;
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const billingPeriod = nowIso.slice(0, 7);
  const approvalKey = buildApprovalKey({
    orgId: agent.org_id,
    agentId: agent.id,
    request: params.payload.canonicalRequest as CanonicalInput,
  });

  const { data: approvalRequest, error: approvalError } = await supabase
    .from('runtime_approval_requests')
    .select('id, status, expires_at')
    .eq('org_id', agent.org_id)
    .eq('agent_id', agent.id)
    .eq('approval_key', approvalKey)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (approvalError) {
    return { ok: false as const, status: 500, body: { error: 'Internal server error' } };
  }

  if (!approvalRequest) {
    return { ok: false as const, status: 409, body: { error: 'No pending runtime intent for request' } };
  }

  if (approvalRequest.expires_at && new Date(approvalRequest.expires_at).getTime() < Date.now()) {
    await supabase
      .from('runtime_approval_requests')
      .update({ status: 'expired' })
      .eq('id', approvalRequest.id)
      .eq('status', 'pending');
    return {
      ok: false as const,
      status: 409,
      body: { error: 'Runtime intent expired', request_id: approvalRequest.id },
    };
  }

  const { data: counter, error: counterReadError } = await supabase
    .from('usage_counters')
    .select('executions')
    .eq('agent_id', agent.id)
    .eq('billing_period', billingPeriod)
    .maybeSingle();
  if (counterReadError) {
    return { ok: false as const, status: 500, body: { error: 'Internal server error' } };
  }

  const currentAgentExecutions = Number(counter?.executions || 0);
  const monthlyLimit = Number(agent.monthly_limit || 0);
  if (monthlyLimit > 0 && currentAgentExecutions >= monthlyLimit) {
    return { ok: false as const, status: 429, body: { error: 'Agent monthly quota exceeded' } };
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from('billing_subscriptions')
    .select('plan_key, status, current_period_start')
    .eq('org_id', agent.org_id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError && !isMissingTableError(subscriptionError, 'billing_subscriptions')) {
    return { ok: false as const, status: 500, body: { error: 'Internal server error' } };
  }

  const orgBillingPeriod = subscription?.current_period_start
    ? String(subscription.current_period_start).slice(0, 7)
    : billingPeriod;

  const { data: orgCounters, error: orgCounterError } = await supabase
    .from('usage_counters')
    .select('executions')
    .eq('org_id', agent.org_id)
    .eq('billing_period', orgBillingPeriod);

  if (orgCounterError) {
    return { ok: false as const, status: 500, body: { error: 'Internal server error' } };
  }

  const orgExecutions = (orgCounters || []).reduce((sum, row) => sum + Number(row.executions || 0), 0);
  if (orgExecutions >= getIncludedExecutions(subscription?.plan_key || 'trial')) {
    return { ok: false as const, status: 429, body: { error: 'Organization execution quota exceeded' } };
  }

  const { data: latestTruthRow } = await supabase
    .from('runtime_truth_states')
    .select('id, canonical_hash, canonical_json, created_at')
    .eq('org_id', agent.org_id)
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const truthState = (latestTruthRow || null) as TruthState;
  let pipeline;
  try {
    pipeline = await runPipeline({
      org_id: agent.org_id,
      agent_id: agent.id,
      action: params.payload.action,
      payload: {
        input: params.payload.input,
        context: params.payload.context,
      },
      truth_state: truthState,
      approval: {
        approval_id: approvalRequest.id,
        approval_key: approvalKey,
        expires_at: approvalRequest.expires_at,
      },
      spine: {
        request_id: String(approvalRequest.id),
        received_at: nowIso,
        billing_period: billingPeriod,
      },
    });
  } catch (error) {
    if (error instanceof SpineInfraError) {
      const message = error.message;
      if (message.includes('GATE_PLUGIN_NOT_FOUND') || message.includes('GATE_PLUGIN_INVALID_KIND')) {
        return {
          ok: false as const,
          status: 500,
          body: { error: 'Spine gate plugin is not available' },
        };
      }
    }
    return {
      ok: false as const,
      status: 500,
      body: { error: 'Internal server error' },
    };
  }

  const canonical = {
    action: params.payload.action,
    input: params.payload.input,
    context: params.payload.context,
    decision: pipeline.final_decision,
    policy_version: pipeline.final_policy_version,
    reason: pipeline.final_reason,
    pipeline_trace: pipeline.stages,
    proof_hash: pipeline.proof.proof_hash,
  };

  const auditEvidence = {
    action: params.payload.action,
    input: params.payload.input,
    context: params.payload.context,
    proof: pipeline.proof,
    authoritative_plugin_id: pipeline.authoritative_plugin_id,
    pipeline_trace: pipeline.stages,
    anti_replay: {
      approval_request_id: approvalRequest.id,
      approval_key: approvalKey,
    },
    spine: {
      billing_period: billingPeriod,
      received_at: nowIso,
    },
  };

  const { data: commitResult, error: rpcError } = await supabase.rpc('runtime_commit_execution', {
    p_org_id: agent.org_id,
    p_agent_id: agent.id,
    p_request_id: approvalRequest.id,
    p_decision: pipeline.final_decision,
    p_reason: pipeline.final_reason,
    p_metadata: {
      action: params.payload.action,
      authoritative_plugin_id: pipeline.authoritative_plugin_id,
      pipeline_trace: pipeline.stages,
    },
    p_canonical_hash: canonicalHash(canonical as CanonicalInput),
    p_canonical_json: JSON.parse(canonicalJson(canonical as CanonicalInput)),
    p_latency_ms: pipeline.total_latency_ms,
    p_request_payload: params.payload.input,
    p_context_payload: {
      ...params.payload.context,
      action: params.payload.action,
      authoritative_plugin_id: pipeline.authoritative_plugin_id,
      pipeline_trace: pipeline.stages,
      proof: pipeline.proof,
    },
    p_policy_version: pipeline.final_policy_version,
    p_audit_evidence: auditEvidence,
    p_usage_amount_usd: getOverageRateUsd(),
    p_created_at: nowIso,
    p_agent_monthly_limit: monthlyLimit,
    p_org_plan_limit: getIncludedExecutions(subscription?.plan_key || 'trial'),
  });

  if (rpcError) {
    const mapped = mapRpcError(rpcError);
    return { ok: false as const, status: mapped.status, body: mapped.body };
  }

  const commitRow = Array.isArray(commitResult) ? commitResult[0] : commitResult;
  if (!commitRow?.execution_id) {
    return { ok: false as const, status: 500, body: { error: 'Runtime commit did not return execution id' } };
  }

  await supabase.from('agents').update({ last_used_at: nowIso, updated_at: nowIso }).eq('id', agent.id);

  return {
    ok: true as const,
    status: 200,
    body: {
      request_id: String(commitRow.execution_id),
      decision: pipeline.final_decision,
      reason: pipeline.final_reason,
      latency_ms: pipeline.total_latency_ms,
      policy_version: pipeline.final_policy_version,
      replayed: Boolean(commitRow.replayed),
      ledger_sequence: Number(commitRow.ledger_sequence || 0),
      truth_sequence: Number(commitRow.truth_sequence || 0),
      proof: pipeline.proof,
      authoritative_plugin_id: pipeline.authoritative_plugin_id,
      pipeline_trace: pipeline.stages,
    },
  };
}
