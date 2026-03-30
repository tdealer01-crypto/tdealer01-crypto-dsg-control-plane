import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { executeOnDSGCore } from '../../../lib/dsg-core';

export const dynamic = 'force-dynamic';

type Decision = 'ALLOW' | 'STABILIZE' | 'BLOCK';

export async function POST(request: Request) {
  try {
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
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, org_id, policy_id, status, monthly_limit')
      .eq('id', agentId)
      .eq('api_key_hash', apiKeyHash)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Invalid agent_id or API key' }, { status: 401 });
    }

    if (agent.status !== 'active') {
      return NextResponse.json({ error: 'Agent is not active' }, { status: 403 });
    }

    const nowIso = new Date().toISOString();

    const { data: quotaReservation, error: quotaReservationError } = await supabase.rpc(
      'reserve_execution_quota',
      {
        p_agent_id: agent.id,
        p_now: nowIso,
      }
    );

    if (quotaReservationError) {
      return NextResponse.json({ error: quotaReservationError.message }, { status: 500 });
    }

    const reservationOk = Boolean(quotaReservation?.ok);
    const reservationError = quotaReservation?.error ?? null;
    const reservation = quotaReservation?.reservation ?? null;

    if (!reservationOk) {
      const quotaCode = String(reservationError?.code || 'QUOTA_RESERVATION_FAILED');
      const status =
        quotaCode === 'AGENT_NOT_FOUND'
          ? 401
          : quotaCode === 'AGENT_INACTIVE'
            ? 403
            : quotaCode.endsWith('_QUOTA_EXCEEDED')
              ? 429
              : 400;

      return NextResponse.json(
        {
          error: reservationError?.message || 'Quota reservation failed',
          quota: reservationError,
        },
        { status }
      );
    }

    const coreResult = await executeOnDSGCore({
      agent_id: agentId,
      action,
      payload: {
        input,
        context,
      },
    });

    const decision = String(coreResult.decision || 'BLOCK') as Decision;
    const latencyMs = Number(coreResult.latency_ms || 0);
    const reason = String(coreResult.reason || 'Decision returned by DSG core');
    const policyVersion = String(coreResult.policy_version || 'dsg-core-v1');
    const stabilityScore = Number(coreResult.stability_score ?? 0);

    const { data: execution, error: executionError } = await supabase
      .from('executions')
      .insert({
        org_id: agent.org_id,
        agent_id: agent.id,
        decision,
        latency_ms: latencyMs,
        request_payload: input,
        context_payload: {
          ...context,
          action,
          stability_score: stabilityScore,
          core_result: coreResult,
        },
        policy_version: policyVersion,
        reason,
        created_at: nowIso,
      })
      .select('id, decision, latency_ms, policy_version, reason, created_at')
      .single();

    if (executionError || !execution) {
      return NextResponse.json(
        { error: executionError?.message || 'Failed to insert execution' },
        { status: 500 }
      );
    }

    const { data: auditRow, error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        org_id: agent.org_id,
        agent_id: agent.id,
        execution_id: execution.id,
        policy_version: policyVersion,
        decision,
        reason,
        evidence: {
          action,
          input,
          context,
          stability_score: stabilityScore,
          core_result: coreResult,
        },
        created_at: nowIso,
      })
      .select('id')
      .single();

    if (auditError) {
      return NextResponse.json({ error: auditError.message }, { status: 500 });
    }

    const { error: usageEventError } = await supabase
      .from('usage_events')
      .insert({
        org_id: agent.org_id,
        agent_id: agent.id,
        execution_id: execution.id,
        event_type: 'execution',
        quantity: 1,
        unit: 'execution',
        amount_usd: 0.001,
        metadata: { decision, stability_score: stabilityScore },
        created_at: nowIso,
      });

    if (usageEventError) {
      return NextResponse.json({ error: usageEventError.message }, { status: 500 });
    }

    const { error: agentUpdateError } = await supabase
      .from('agents')
      .update({ last_used_at: nowIso, updated_at: nowIso })
      .eq('id', agent.id);

    if (agentUpdateError) {
      return NextResponse.json({ error: agentUpdateError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        request_id: execution.id,
        decision: execution.decision,
        reason: execution.reason,
        latency_ms: execution.latency_ms,
        policy_version: execution.policy_version,
        stability_score: stabilityScore,
        audit_id: auditRow?.id ?? null,
        usage_counted: true,
        quota_reservation: reservation,
        core: {
          decision: coreResult.decision,
          evaluated_at: coreResult.evaluated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
