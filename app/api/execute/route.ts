import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { executeOnDSGCore } from '../../../lib/dsg-core';

export const dynamic = 'force-dynamic';

type Decision = 'ALLOW' | 'STABILIZE' | 'BLOCK';

const INCLUDED_EXECUTIONS: Record<string, number> = {
  trial: 1000,
  pro: 10000,
  business: 100000,
  enterprise: 1000000,
};

function getIncludedExecutions(planKey?: string | null) {
  const normalized = String(planKey || 'trial').toLowerCase();
  return INCLUDED_EXECUTIONS[normalized] || INCLUDED_EXECUTIONS.trial;
}

function getIdempotencyKey(request: Request, body: Record<string, unknown>) {
  const headerKey = request.headers.get('idempotency-key');
  const bodyKey = typeof body.idempotency_key === 'string' ? body.idempotency_key : null;
  const key = (headerKey || bodyKey || '').trim();
  return key || `auto_${randomUUID()}`;
}

export async function POST(request: Request) {
  let reservationId: string | null = null;

  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Bearer token' }, { status: 401 });
    }

    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'Empty API key' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || !body.agent_id) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
    }

    const idempotencyKey = getIdempotencyKey(request, body);
    const agentId = String(body.agent_id);
    const input = body.input ?? {};
    const context = body.context ?? {};
    const action = String(body.action || (context as Record<string, unknown>).action || 'scan');

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
    const billingPeriod = nowIso.slice(0, 7);

    const { data: subscription, error: subscriptionError } = await supabase
      .from('billing_subscriptions')
      .select('plan_key, status, current_period_start')
      .eq('org_id', agent.org_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError && !/relation .* does not exist/i.test(subscriptionError.message)) {
      return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
    }

    const orgBillingPeriod = subscription?.current_period_start
      ? String(subscription.current_period_start).slice(0, 7)
      : billingPeriod;
    const includedExecutions = getIncludedExecutions(subscription?.plan_key || 'trial');

    const { data: reservationRows, error: reservationError } = await supabase.rpc(
      'reserve_execution_quota',
      {
        p_agent_id: agent.id,
        p_org_id: agent.org_id,
        p_billing_period: billingPeriod,
        p_org_billing_period: orgBillingPeriod,
        p_monthly_limit: Number(agent.monthly_limit || 0),
        p_included_executions: includedExecutions,
        p_idempotency_key: idempotencyKey,
        p_refund_policy: 'refund_on_failure',
      }
    );

    if (reservationError) {
      return NextResponse.json({ error: reservationError.message }, { status: 500 });
    }

    const reservation = Array.isArray(reservationRows)
      ? (reservationRows[0] as Record<string, unknown> | undefined)
      : undefined;

    if (!reservation) {
      return NextResponse.json(
        { error: 'Failed to reserve execution quota', idempotency_key: idempotencyKey },
        { status: 500 }
      );
    }

    if (reservation.code === 'agent_quota_exceeded') {
      return NextResponse.json(
        {
          error: 'Agent monthly quota exceeded',
          quota: {
            scope: 'agent',
            billing_period: billingPeriod,
            executions: Number(reservation.agent_executions || 0),
            monthly_limit: Number(agent.monthly_limit || 0),
          },
          idempotency_key: idempotencyKey,
        },
        { status: 429 }
      );
    }

    if (reservation.code === 'org_quota_exceeded') {
      return NextResponse.json(
        {
          error: 'Organization execution quota exceeded',
          quota: {
            scope: 'organization',
            billing_period: orgBillingPeriod,
            executions: Number(reservation.org_executions || 0),
            included_executions: includedExecutions,
            plan_key: String(subscription?.plan_key || 'trial').toLowerCase(),
            subscription_status: subscription?.status || 'trialing',
          },
          idempotency_key: idempotencyKey,
        },
        { status: 429 }
      );
    }

    reservationId = String(reservation.reservation_id || '');
    if (!reservationId) {
      return NextResponse.json(
        { error: 'Quota reservation did not return reservation_id', idempotency_key: idempotencyKey },
        { status: 500 }
      );
    }

    if (reservation.code === 'idempotent_replay') {
      if (reservation.reservation_status === 'consumed' && reservation.execution_id) {
        const executionId = String(reservation.execution_id);
        const { data: existingExecution, error: existingExecutionError } = await supabase
          .from('executions')
          .select('id, decision, latency_ms, policy_version, reason, created_at')
          .eq('id', executionId)
          .maybeSingle();

        if (existingExecutionError) {
          return NextResponse.json({ error: existingExecutionError.message }, { status: 500 });
        }

        if (existingExecution) {
          return NextResponse.json(
            {
              request_id: existingExecution.id,
              decision: existingExecution.decision,
              reason: existingExecution.reason,
              latency_ms: existingExecution.latency_ms,
              policy_version: existingExecution.policy_version,
              replayed: true,
              idempotency_key: idempotencyKey,
              reservation_id: reservationId,
            },
            { status: 200 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Request with same idempotency key is already in-flight',
          idempotency_key: idempotencyKey,
          reservation_id: reservationId,
        },
        { status: 409 }
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
          ...((context as Record<string, unknown>) || {}),
          action,
          stability_score: stabilityScore,
          core_result: coreResult,
          reservation_id: reservationId,
          idempotency_key: idempotencyKey,
        },
        policy_version: policyVersion,
        reason,
        created_at: nowIso,
      })
      .select('id, decision, latency_ms, policy_version, reason, created_at')
      .single();

    if (executionError || !execution) {
      await supabase.rpc('finalize_execution_reservation', {
        p_reservation_id: reservationId,
        p_outcome: 'failed',
        p_error_message: executionError?.message || 'Failed to insert execution',
      });

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
          reservation_id: reservationId,
          idempotency_key: idempotencyKey,
        },
        created_at: nowIso,
      })
      .select('id')
      .single();

    if (auditError) {
      await supabase.rpc('finalize_execution_reservation', {
        p_reservation_id: reservationId,
        p_outcome: 'failed',
        p_error_message: auditError.message,
      });
      return NextResponse.json({ error: auditError.message }, { status: 500 });
    }

    const { error: usageEventError } = await supabase.from('usage_events').insert({
      org_id: agent.org_id,
      agent_id: agent.id,
      execution_id: execution.id,
      event_type: 'execution',
      quantity: 1,
      unit: 'execution',
      amount_usd: 0.001,
      metadata: {
        decision,
        stability_score: stabilityScore,
        reservation_id: reservationId,
        idempotency_key: idempotencyKey,
      },
      created_at: nowIso,
    });

    if (usageEventError) {
      await supabase.rpc('finalize_execution_reservation', {
        p_reservation_id: reservationId,
        p_outcome: 'failed',
        p_error_message: usageEventError.message,
      });
      return NextResponse.json({ error: usageEventError.message }, { status: 500 });
    }

    const { error: finalizeError } = await supabase.rpc('finalize_execution_reservation', {
      p_reservation_id: reservationId,
      p_outcome: 'consumed',
      p_execution_id: execution.id,
    });

    if (finalizeError) {
      return NextResponse.json({ error: finalizeError.message }, { status: 500 });
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
        reservation_id: reservationId,
        idempotency_key: idempotencyKey,
        core: {
          decision: coreResult.decision,
          evaluated_at: coreResult.evaluated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (reservationId) {
      const supabase = getSupabaseAdmin();
      await supabase.rpc('finalize_execution_reservation', {
        p_reservation_id: reservationId,
        p_outcome: 'failed',
        p_error_message: error instanceof Error ? error.message : 'Unexpected error',
      });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
