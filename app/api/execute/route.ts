import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { executeOnDSGCore } from '../../../lib/dsg-core';

export const dynamic = 'force-dynamic';

type Decision = 'ALLOW' | 'STABILIZE' | 'BLOCK';

type ReservationRow = {
  reservation_id: string;
  status: 'pending' | 'processed' | 'failed' | 'rejected';
  execution_id: string | null;
  response_payload: Record<string, unknown> | null;
  quota_reserved: boolean;
  error_code: string | null;
  error_message: string | null;
  current_agent_executions: number;
  org_executions: number;
};

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

function getIdempotencyKey(request: Request, body: Record<string, unknown> | null) {
  const headerKey = request.headers.get('idempotency-key')?.trim();
  const bodyKey = typeof body?.idempotency_key === 'string' ? body.idempotency_key.trim() : '';
  return headerKey || bodyKey;
}

async function markReservationFailed(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  reservationId: string,
  reason: string
) {
  await supabase.rpc('finalize_execution_reservation', {
    p_reservation_id: reservationId,
    p_status: 'failed',
    p_execution_id: null,
    p_response_payload: { error: reason },
  });
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
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'idempotency_key is required (header idempotency-key or body.idempotency_key)' },
        { status: 400 }
      );
    }

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

    const { data: reservationRows, error: reserveError } = await supabase.rpc('reserve_execution_quota', {
      p_org_id: agent.org_id,
      p_agent_id: agent.id,
      p_idempotency_key: idempotencyKey,
      p_billing_period: billingPeriod,
      p_org_billing_period: orgBillingPeriod,
      p_monthly_limit: Number(agent.monthly_limit || 0),
      p_included_executions: includedExecutions,
    });

    if (reserveError) {
      return NextResponse.json({ error: reserveError.message }, { status: 500 });
    }

    const reservation = (Array.isArray(reservationRows) ? reservationRows[0] : reservationRows) as
      | ReservationRow
      | undefined;

    if (!reservation) {
      return NextResponse.json({ error: 'Failed to reserve execution quota' }, { status: 500 });
    }

    reservationId = reservation.reservation_id;

    if (reservation.status === 'rejected') {
      const isAgentScope = reservation.error_code === 'agent_quota_exceeded';
      return NextResponse.json(
        {
          error: reservation.error_message || 'Quota exceeded',
          quota: {
            scope: isAgentScope ? 'agent' : 'organization',
            billing_period: isAgentScope ? billingPeriod : orgBillingPeriod,
            executions: isAgentScope
              ? Number(reservation.current_agent_executions || 0)
              : Number(reservation.org_executions || 0),
            monthly_limit: isAgentScope ? Number(agent.monthly_limit || 0) : undefined,
            included_executions: isAgentScope ? undefined : includedExecutions,
            plan_key: String(subscription?.plan_key || 'trial').toLowerCase(),
            subscription_status: subscription?.status || 'trialing',
          },
        },
        { status: 429 }
      );
    }

    if (reservation.status === 'processed') {
      return NextResponse.json(
        {
          ...(reservation.response_payload || {}),
          idempotency_key: idempotencyKey,
          idempotency_status: 'processed',
        },
        { status: 200 }
      );
    }

    if (!reservation.quota_reserved) {
      return NextResponse.json(
        {
          idempotency_key: idempotencyKey,
          idempotency_status: 'in_flight',
          reservation_id: reservation.reservation_id,
        },
        { status: 202 }
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
        idempotency_key: idempotencyKey,
        decision,
        latency_ms: latencyMs,
        request_payload: input,
        context_payload: {
          ...((context as Record<string, unknown>) || {}),
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
      await markReservationFailed(
        supabase,
        reservation.reservation_id,
        executionError?.message || 'Failed to insert execution'
      );
      return NextResponse.json(
        { error: executionError?.message || 'Failed to insert execution' },
        { status: 500 }
      );
    }

    const responsePayload = {
      request_id: execution.id,
      decision: execution.decision,
      reason: execution.reason,
      latency_ms: execution.latency_ms,
      policy_version: execution.policy_version,
      stability_score: stabilityScore,
      core: {
        decision: coreResult.decision,
        evaluated_at: coreResult.evaluated_at,
      },
    };

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
          idempotency_key: idempotencyKey,
          stability_score: stabilityScore,
          core_result: coreResult,
        },
        created_at: nowIso,
      })
      .select('id')
      .single();

    if (auditError) {
      await markReservationFailed(supabase, reservation.reservation_id, auditError.message);
      return NextResponse.json({ error: auditError.message }, { status: 500 });
    }

    const { error: usageEventError } = await supabase.from('usage_events').insert({
      org_id: agent.org_id,
      agent_id: agent.id,
      execution_id: execution.id,
      idempotency_key: idempotencyKey,
      event_type: 'execution',
      quantity: 1,
      unit: 'execution',
      amount_usd: 0.001,
      metadata: { decision, idempotency_key: idempotencyKey, stability_score: stabilityScore },
      created_at: nowIso,
    });

    if (usageEventError) {
      await markReservationFailed(supabase, reservation.reservation_id, usageEventError.message);
      return NextResponse.json({ error: usageEventError.message }, { status: 500 });
    }

    const { error: agentUpdateError } = await supabase
      .from('agents')
      .update({ last_used_at: nowIso, updated_at: nowIso })
      .eq('id', agent.id);

    if (agentUpdateError) {
      await markReservationFailed(supabase, reservation.reservation_id, agentUpdateError.message);
      return NextResponse.json({ error: agentUpdateError.message }, { status: 500 });
    }

    const finalizedPayload = {
      ...responsePayload,
      audit_id: auditRow?.id ?? null,
      usage_counted: true,
    };

    const { error: finalizeError } = await supabase.rpc('finalize_execution_reservation', {
      p_reservation_id: reservation.reservation_id,
      p_status: 'processed',
      p_execution_id: execution.id,
      p_response_payload: finalizedPayload,
    });

    if (finalizeError) {
      return NextResponse.json({ error: finalizeError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        ...finalizedPayload,
        idempotency_key: idempotencyKey,
        idempotency_status: 'processed',
      },
      { status: 200 }
    );
  } catch (error) {
    if (reservationId) {
      try {
        await markReservationFailed(
          getSupabaseAdmin(),
          reservationId,
          error instanceof Error ? error.message : 'Unexpected error'
        );
      } catch {
        // no-op
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
