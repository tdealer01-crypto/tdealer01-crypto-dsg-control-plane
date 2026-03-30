import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { type IntentEnvelope, verifyApprovalForExecution } from '../../../lib/runtime/approval';
import { runSpine } from '../../../lib/runtime/spine';

export const dynamic = 'force-dynamic';

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

type SpineExecuteBody = IntentEnvelope & {
  agent_id: string;
  approval_id: string;
  idempotency_key?: string;
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

function isSpineBody(body: Record<string, unknown>): body is Record<string, unknown> & SpineExecuteBody {
  return (
    typeof body.agent_id === 'string' &&
    typeof body.approval_id === 'string' &&
    typeof body.request_id === 'string' &&
    typeof body.action === 'string' &&
    typeof body.next_t === 'number' &&
    typeof body.next_g === 'string' &&
    typeof body.next_i === 'string' &&
    typeof body.next_v === 'object' &&
    body.next_v !== null
  );
}

async function markReservationFailed(supabase: ReturnType<typeof getSupabaseAdmin>, reservationId: string, reason: string) {
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
    if (!body || !isSpineBody(body)) {
      return NextResponse.json({ error: 'Spine payload required: agent_id, approval_id, request/action/next_*' }, { status: 400 });
    }

    const idempotencyKey = getIdempotencyKey(request, body);
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'idempotency_key is required (header idempotency-key or body.idempotency_key)' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, org_id, status, monthly_limit')
      .eq('id', body.agent_id)
      .eq('api_key_hash', apiKeyHash)
      .single();

    if (agentError || !agent) return NextResponse.json({ error: 'Invalid agent_id or API key' }, { status: 401 });
    if (agent.status !== 'active') return NextResponse.json({ error: 'Agent is not active' }, { status: 403 });

    const nowIso = new Date().toISOString();
    const billingPeriod = nowIso.slice(0, 7);

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

    const reservationRows = await supabase.rpc('reserve_execution_quota', {
      p_org_id: agent.org_id,
      p_agent_id: agent.id,
      p_idempotency_key: idempotencyKey,
      p_billing_period: billingPeriod,
      p_org_billing_period: orgBillingPeriod,
      p_monthly_limit: Number(agent.monthly_limit || 0),
      p_included_executions: getIncludedExecutions(subscription?.plan_key || 'trial'),
    });

    const reservation = (Array.isArray(reservationRows.data) ? reservationRows.data[0] : reservationRows.data) as ReservationRow | undefined;
    if (reservationRows.error || !reservation) {
      return NextResponse.json({ error: reservationRows.error?.message || 'Failed to reserve execution quota' }, { status: 500 });
    }

    reservationId = reservation.reservation_id;
    if (reservation.status === 'processed') {
      return NextResponse.json({ ...(reservation.response_payload || {}), idempotency_key: idempotencyKey, idempotency_status: 'processed' });
    }

    if (reservation.status === 'rejected') {
      return NextResponse.json({ error: reservation.error_message || 'Quota exceeded' }, { status: 429 });
    }

    const verify = await verifyApprovalForExecution({
      supabase,
      orgId: agent.org_id,
      agentId: agent.id,
      approvalId: body.approval_id,
      intent: body,
    });

    if (!verify.ok) {
      await markReservationFailed(supabase, reservation.reservation_id, verify.error);
      return NextResponse.json({ error: verify.error }, { status: verify.status });
    }

    const spine = await runSpine({
      supabase,
      orgId: agent.org_id,
      agentId: agent.id,
      approval: {
        id: verify.approval.id,
        approval_hash: verify.approval.approval_hash,
        epoch: Number(verify.approval.epoch || 1),
      },
      intent: body,
    });

    if (!spine.ok) {
      await markReservationFailed(supabase, reservation.reservation_id, spine.error);
      return NextResponse.json({ error: spine.error }, { status: spine.status });
    }

    const executionInsert = await supabase
      .from('executions')
      .insert({
        org_id: agent.org_id,
        agent_id: agent.id,
        idempotency_key: idempotencyKey,
        decision: spine.decision,
        latency_ms: 0,
        request_payload: body,
        context_payload: {
          approval_id: verify.approval.id,
          approval_hash: verify.approval.approval_hash,
          input_hash: spine.input_hash,
          entry_hash: spine.entry_hash,
          effect_id: spine.effect_id,
        },
        policy_version: `udg-epoch-${verify.approval.epoch}`,
        reason: spine.reason,
        created_at: nowIso,
      })
      .select('id')
      .single();

    if (executionInsert.error || !executionInsert.data) {
      await markReservationFailed(supabase, reservation.reservation_id, executionInsert.error?.message || 'Execution write failed');
      return NextResponse.json({ error: executionInsert.error?.message || 'Execution write failed' }, { status: 500 });
    }

    await Promise.all([
      supabase.from('approvals').update({ status: 'used', used_at: nowIso }).eq('id', verify.approval.id),
      supabase.from('audit_logs').insert({
        org_id: agent.org_id,
        agent_id: agent.id,
        execution_id: executionInsert.data.id,
        policy_version: `udg-epoch-${verify.approval.epoch}`,
        decision: spine.decision,
        reason: spine.reason,
        evidence: {
          request_id: body.request_id,
          approval_hash: verify.approval.approval_hash,
          input_hash: spine.input_hash,
          entry_hash: spine.entry_hash,
          effect_id: spine.effect_id,
          gate_metrics: spine.gate_metrics,
        },
        created_at: nowIso,
      }),
      supabase.from('usage_events').insert({
        org_id: agent.org_id,
        agent_id: agent.id,
        execution_id: executionInsert.data.id,
        idempotency_key: idempotencyKey,
        event_type: spine.decision === 'ALLOW' ? 'execution' : 'decision_only',
        quantity: 1,
        unit: 'execution',
        amount_usd: 0,
        metadata: {
          decision: spine.decision,
          request_id: body.request_id,
          entry_hash: spine.entry_hash,
        },
        created_at: nowIso,
      }),
      supabase.from('agents').update({ last_used_at: nowIso, updated_at: nowIso }).eq('id', agent.id),
    ]);

    const responsePayload = {
      request_id: body.request_id,
      decision: spine.decision,
      reason: spine.reason,
      sequence: spine.sequence,
      effect_id: spine.effect_id,
      entry_hash: spine.entry_hash,
      execution_id: executionInsert.data.id,
    };

    const { error: finalizeError } = await supabase.rpc('finalize_execution_reservation', {
      p_reservation_id: reservation.reservation_id,
      p_status: 'processed',
      p_execution_id: executionInsert.data.id,
      p_response_payload: responsePayload,
    });

    if (finalizeError) return NextResponse.json({ error: finalizeError.message }, { status: 500 });

    return NextResponse.json({ ...responsePayload, idempotency_key: idempotencyKey, idempotency_status: 'processed' });
  } catch (error) {
    if (reservationId) {
      await markReservationFailed(getSupabaseAdmin(), reservationId, error instanceof Error ? error.message : 'Unexpected error');
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
