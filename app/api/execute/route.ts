import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { executeOnDSGCore } from '../../../lib/dsg-core';
import { resolveAgentFromApiKey } from '../../../lib/agent-auth';
import { buildApprovalKey } from '../../../lib/runtime/approval';
import { canonicalHash, canonicalJson } from '../../../lib/runtime/canonical';
import { requireOrgRole } from '../../../lib/authz';
import { RuntimeRouteRoles } from '../../../lib/runtime/permissions';
import { getOverageRateUsd, INCLUDED_EXECUTIONS } from '../../../lib/billing/overage-config';

export const dynamic = 'force-dynamic';

type Decision = 'ALLOW' | 'STABILIZE' | 'BLOCK';


function getIncludedExecutions(planKey?: string | null) {
  const normalized = String(planKey || 'trial').toLowerCase();
  return INCLUDED_EXECUTIONS[normalized] || INCLUDED_EXECUTIONS.trial;
}

export async function POST(request: Request) {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.execute);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Bearer token' }, { status: 401 });
    }

    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'Empty API key' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.agent_id) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
    }

    const agentId = String(body.agent_id);
    const input = body.input ?? {};
    const context = body.context ?? {};
    const action = String(body.action || context.action || 'scan');

    const supabase = getSupabaseAdmin();

    const agent = await resolveAgentFromApiKey(agentId, apiKey);
    if (!agent || agent.org_id !== access.orgId) {
      return NextResponse.json({ error: 'Invalid agent_id or API key' }, { status: 401 });
    }

    if (agent.status !== 'active') {
      return NextResponse.json({ error: 'Agent is not active' }, { status: 403 });
    }

    const nowIso = new Date().toISOString();
    const billingPeriod = nowIso.slice(0, 7);

    const approvalKey = buildApprovalKey({ orgId: agent.org_id, agentId: agent.id, request: { action, input, context } });
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
      return NextResponse.json({ error: approvalError.message }, { status: 500 });
    }

    if (!approvalRequest) {
      return NextResponse.json({ error: 'No pending runtime intent for request' }, { status: 409 });
    }

    if (approvalRequest.expires_at && new Date(approvalRequest.expires_at).getTime() < Date.now()) {
      await supabase
        .from('runtime_approval_requests')
        .update({ status: 'expired' })
        .eq('id', approvalRequest.id)
        .eq('status', 'pending');
      return NextResponse.json({ error: 'Runtime intent expired', request_id: approvalRequest.id }, { status: 409 });
    }

    const { data: counter, error: counterReadError } = await supabase
      .from('usage_counters')
      .select('executions')
      .eq('agent_id', agent.id)
      .eq('billing_period', billingPeriod)
      .maybeSingle();
    if (counterReadError) return NextResponse.json({ error: counterReadError.message }, { status: 500 });

    const currentAgentExecutions = Number(counter?.executions || 0);
    const monthlyLimit = Number(agent.monthly_limit || 0);
    if (monthlyLimit > 0 && currentAgentExecutions >= monthlyLimit) {
      return NextResponse.json({ error: 'Agent monthly quota exceeded' }, { status: 429 });
    }

    const { data: subscription } = await supabase
      .from('billing_subscriptions')
      .select('plan_key, status, current_period_start')
      .eq('org_id', agent.org_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const orgBillingPeriod = subscription?.current_period_start
      ? String(subscription.current_period_start).slice(0, 7)
      : billingPeriod;

    const { data: orgCounters, error: orgCounterError } = await supabase
      .from('usage_counters')
      .select('executions')
      .eq('org_id', agent.org_id)
      .eq('billing_period', orgBillingPeriod);

    if (orgCounterError) return NextResponse.json({ error: orgCounterError.message }, { status: 500 });

    const orgExecutions = (orgCounters || []).reduce((sum, row) => sum + Number(row.executions || 0), 0);
    if (orgExecutions >= getIncludedExecutions(subscription?.plan_key || 'trial')) {
      return NextResponse.json({ error: 'Organization execution quota exceeded' }, { status: 429 });
    }

    const coreResult = await executeOnDSGCore({
      agent_id: agentId,
      action,
      payload: { input, context },
    });

    const decision = String(coreResult.decision || 'BLOCK') as Decision;
    const reason = String(coreResult.reason || 'Decision returned by DSG core');
    const latencyMs = Number(coreResult.latency_ms || 0);
    const policyVersion = String(coreResult.policy_version || 'dsg-core-v1');
    const stabilityScore = Number(coreResult.stability_score ?? 0);
    const proofHash = String(coreResult.proof_hash || '');
    const proofVersion = String(coreResult.proof_version || '');

    const canonical = { action, input, context, decision, policyVersion, reason };

    const auditEvidence = {
      action,
      input,
      context,
      stability_score: stabilityScore,
      proof_hash: proofHash,
      proof_version: proofVersion,
      core_result: coreResult,
      anti_replay: { approval_request_id: approvalRequest.id },
    };

    const { data: commitResult, error: rpcError } = await supabase.rpc('runtime_commit_execution', {
      p_org_id: agent.org_id,
      p_agent_id: agent.id,
      p_request_id: approvalRequest.id,
      p_decision: decision,
      p_reason: reason,
      p_metadata: { action, stability_score: stabilityScore },
      p_canonical_hash: canonicalHash(canonical),
      p_canonical_json: JSON.parse(canonicalJson(canonical)),
      p_latency_ms: latencyMs,
      p_request_payload: input,
      p_context_payload: { ...context, action, stability_score: stabilityScore, core_result: coreResult },
      p_policy_version: policyVersion,
      p_audit_evidence: auditEvidence,
      p_usage_amount_usd: getOverageRateUsd(),
      p_created_at: nowIso,
      p_agent_monthly_limit: monthlyLimit,
      p_org_plan_limit: getIncludedExecutions(subscription?.plan_key || 'trial'),
    });

    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });
    const commitRow = Array.isArray(commitResult) ? commitResult[0] : commitResult;
    if (!commitRow?.execution_id) {
      return NextResponse.json({ error: 'Runtime commit did not return execution id' }, { status: 500 });
    }

    const executionId = String(commitRow.execution_id);

    await supabase.from('agents').update({ last_used_at: nowIso, updated_at: nowIso }).eq('id', agent.id);

    return NextResponse.json({
      request_id: executionId,
      decision,
      reason,
      latency_ms: latencyMs,
      policy_version: policyVersion,
      stability_score: stabilityScore,
      audit_id: null,
      usage_counted: true,
      replayed: Boolean(commitRow.replayed),
      ledger_sequence: Number(commitRow.ledger_sequence || 0),
      truth_sequence: Number(commitRow.truth_sequence || 0),
      proof_hash: proofHash || null,
      proof_version: proofVersion || null,
      core: { decision: coreResult.decision, evaluated_at: coreResult.evaluated_at },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
