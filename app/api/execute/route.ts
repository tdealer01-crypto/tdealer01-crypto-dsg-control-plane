import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { executeOnDSGCore } from '../../../lib/dsg-core';
import { computeEffectId, computeInputHash, type IntentEnvelope } from '../../../lib/runtime/approval';
import { sha256Hex } from '../../../lib/runtime/canonical';
import { evaluateUDGGate, type TruthState } from '../../../lib/runtime/gate';

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

type SpineBody = IntentEnvelope & {
  approval_id: string;
};

const INCLUDED_EXECUTIONS: Record<string, number> = {
  trial: 1000,
  pro: 10000,
  business: 100000,
  enterprise: 1000000,
};

const CORE_SPEC_SHA256 =
  '8d73cf93de5aa71c1cb1b9d93d15fc5124977dc0781cf0c1698216412ba623af';
const ARBITER_SHA256 =
  'e46190a79879ee3ca7ef00db6601998439fb71166b90c9612bf33b9fb4190bef';

function getIncludedExecutions(planKey?: string | null) {
  const normalized = String(planKey || 'trial').toLowerCase();
  return INCLUDED_EXECUTIONS[normalized] || INCLUDED_EXECUTIONS.trial;
}

function getIdempotencyKey(request: Request, body: Record<string, unknown> | null) {
  const headerKey = request.headers.get('idempotency-key')?.trim();
  const bodyKey = typeof body?.idempotency_key === 'string' ? body.idempotency_key.trim() : '';
  return headerKey || bodyKey;
}

function isSpineBody(body: Record<string, unknown>): body is Record<string, unknown> & SpineBody {
  return (
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

async function runSpineExecution(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  agent: { id: string; org_id: string };
  body: SpineBody;
  nowIso: string;
  idempotencyKey: string;
}) {
  const { supabase, agent, body, nowIso, idempotencyKey } = params;

  const inputHash = computeInputHash(body);
  const { data: approval, error: approvalError } = await supabase
    .from('approvals')
    .select('*')
    .eq('id', body.approval_id)
    .eq('org_id', agent.org_id)
    .eq('agent_id', agent.id)
    .single();

  if (approvalError || !approval) {
    return { ok: false as const, status: 400, error: 'ERR_INVALID_APPROVAL' };
  }

  if (approval.status !== 'issued' || approval.used_at) {
    return { ok: false as const, status: 409, error: 'ERR_REPLAY_ATTACK' };
  }

  if (new Date(approval.expires_at).getTime() < Date.now()) {
    return { ok: false as const, status: 400, error: 'ERR_EXPIRED' };
  }

  if (approval.request_id !== body.request_id) {
    return { ok: false as const, status: 400, error: 'ERR_REQUEST_MISMATCH' };
  }

  if (approval.action !== body.action) {
    return { ok: false as const, status: 400, error: 'ERR_ACTION_MISMATCH' };
  }

  if (approval.input_hash !== inputHash) {
    return { ok: false as const, status: 400, error: 'ERR_INTEGRITY_MISMATCH' };
  }

  let { data: currentState } = await supabase
    .from('runtime_truth_state')
    .select('*')
    .eq('org_id', agent.org_id)
    .maybeSingle();

  if (!currentState) {
    const bootstrap = {
      org_id: agent.org_id,
      epoch: 1,
      sequence: 0,
      v_t: { balance: 1000000, invariant_tag: 'transfer', last_direction: 0 },
      t_t: 0,
      g_t: 'zone:origin',
      i_t: 'net:bootstrap',
      s_star_hash: sha256Hex({ balance: 1000000, invariant_tag: 'transfer', last_direction: 0 }),
      updated_at: nowIso,
    };

    const inserted = await supabase.from('runtime_truth_state').insert(bootstrap).select('*').single();
    if (inserted.error || !inserted.data) {
      return {
        ok: false as const,
        status: 500,
        error: inserted.error?.message || 'Failed to bootstrap truth state',
      };
    }
    currentState = inserted.data;
  }

  const truthState: TruthState = {
    epoch: Number(currentState.epoch),
    sequence: Number(currentState.sequence),
    v_t: (currentState.v_t || {}) as Record<string, unknown>,
    t_t: Number(currentState.t_t),
    g_t: String(currentState.g_t),
    i_t: String(currentState.i_t),
    s_star_hash: String(currentState.s_star_hash),
  };

  const gate = evaluateUDGGate(truthState, {
    action: body.action,
    next_v: body.next_v,
    next_t: Number(body.next_t),
    next_g: body.next_g,
    next_i: body.next_i,
  });

  const prevStateHash = sha256Hex(truthState);
  let nextStateHash = prevStateHash;
  let effectId: string | null = null;
  let nextSequence = truthState.sequence;

  if (gate.decision === 'ALLOW') {
    nextSequence = truthState.sequence + 1;
    effectId = computeEffectId({
      epoch: truthState.epoch,
      sequence: nextSequence,
      action: body.action,
      payloadHash: inputHash,
    });

    const effectInsert = await supabase.from('effects').insert({
      org_id: agent.org_id,
      agent_id: agent.id,
      request_id: body.request_id,
      action: body.action,
      effect_id: effectId,
      payload_hash: inputHash,
      status: 'committed',
      external_receipt: {},
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (effectInsert.error) {
      return { ok: false as const, status: 500, error: effectInsert.error.message };
    }

    const currentBalance = Number((truthState.v_t as Record<string, unknown>).balance || 0);
    const nextBalance = Number(body.next_v.balance ?? currentBalance);
    const lastDirection = Math.sign(nextBalance - currentBalance);

    const nextState = {
      org_id: agent.org_id,
      epoch: truthState.epoch,
      sequence: nextSequence,
      v_t: {
        ...body.next_v,
        last_direction: lastDirection,
      },
      t_t: Number(body.next_t),
      g_t: body.next_g,
      i_t: body.next_i,
      s_star_hash: sha256Hex(body.next_v),
      updated_at: nowIso,
    };

    nextStateHash = sha256Hex({
      epoch: nextState.epoch,
      sequence: nextState.sequence,
      v_t: nextState.v_t,
      t_t: nextState.t_t,
      g_t: nextState.g_t,
      i_t: nextState.i_t,
      s_star_hash: nextState.s_star_hash,
    });

    const truthUpdate = await supabase.from('runtime_truth_state').upsert(nextState, { onConflict: 'org_id' });

    if (truthUpdate.error) {
      return { ok: false as const, status: 500, error: truthUpdate.error.message };
    }
  }

  const { data: lastEntry } = await supabase
    .from('ledger_entries')
    .select('entry_hash')
    .eq('org_id', agent.org_id)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseEntry = {
    org_id: agent.org_id,
    agent_id: agent.id,
    request_id: body.request_id,
    approval_hash: approval.approval_hash,
    sequence: nextSequence,
    epoch: truthState.epoch,
    action: body.action,
    input_hash: inputHash,
    decision: gate.decision,
    reason: gate.reason,
    prev_state_hash: prevStateHash,
    next_state_hash: nextStateHash,
    effect_id: effectId,
    logical_ts: Number(body.next_t),
    prev_entry_hash: lastEntry?.entry_hash || 'GENESIS',
    metadata: {
      gate_metrics: gate.metrics,
      core_spec_hash: CORE_SPEC_SHA256,
      arbiter_hash: ARBITER_SHA256,
    },
    created_at: nowIso,
  };

  const entryHash = sha256Hex(baseEntry);

  const ledgerInsert = await supabase.from('ledger_entries').insert({
    ...baseEntry,
    entry_hash: entryHash,
  });

  if (ledgerInsert.error) {
    return { ok: false as const, status: 500, error: ledgerInsert.error.message };
  }

  const approvalUpdate = await supabase
    .from('approvals')
    .update({
      status: gate.decision === 'ALLOW' ? 'used' : 'revoked',
      used_at: nowIso,
      metadata: {
        ...approval.metadata,
        final_decision: gate.decision,
        final_reason: gate.reason,
      },
    })
    .eq('id', approval.id);

  if (approvalUpdate.error) {
    return { ok: false as const, status: 500, error: approvalUpdate.error.message };
  }

  const executionInsert = await supabase
    .from('executions')
    .insert({
      org_id: agent.org_id,
      agent_id: agent.id,
      idempotency_key: idempotencyKey,
      decision: gate.decision,
      latency_ms: 0,
      request_payload: {
        action: body.action,
        next_v: body.next_v,
        next_t: body.next_t,
        next_g: body.next_g,
        next_i: body.next_i,
      },
      context_payload: {
        approval_id: approval.id,
        input_hash: inputHash,
        entry_hash: entryHash,
      },
      policy_version: `udg-epoch-${truthState.epoch}`,
      reason: gate.reason,
      created_at: nowIso,
    })
    .select('id')
    .single();

  if (executionInsert.error || !executionInsert.data) {
    return {
      ok: false as const,
      status: 500,
      error: executionInsert.error?.message || 'Failed to write execution',
    };
  }

  const auditInsert = await supabase.from('audit_logs').insert({
    org_id: agent.org_id,
    agent_id: agent.id,
    execution_id: executionInsert.data.id,
    policy_version: `udg-epoch-${truthState.epoch}`,
    decision: gate.decision,
    reason: gate.reason,
    evidence: {
      approval_id: approval.id,
      approval_hash: approval.approval_hash,
      input_hash: inputHash,
      entry_hash: entryHash,
      prev_state_hash: prevStateHash,
      next_state_hash: nextStateHash,
      effect_id: effectId,
      core_spec_hash: CORE_SPEC_SHA256,
      arbiter_hash: ARBITER_SHA256,
      gate_metrics: gate.metrics,
    },
    created_at: nowIso,
  });

  if (auditInsert.error) {
    return { ok: false as const, status: 500, error: auditInsert.error.message };
  }

  const usageInsert = await supabase.from('usage_events').insert({
    org_id: agent.org_id,
    agent_id: agent.id,
    execution_id: executionInsert.data.id,
    idempotency_key: idempotencyKey,
    event_type: gate.decision === 'ALLOW' ? 'execution' : 'decision_only',
    quantity: 1,
    unit: 'execution',
    amount_usd: 0,
    metadata: {
      decision: gate.decision,
      reason: gate.reason,
      entry_hash: entryHash,
    },
    created_at: nowIso,
  });

  if (usageInsert.error) {
    return { ok: false as const, status: 500, error: usageInsert.error.message };
  }

  return {
    ok: true as const,
    payload: {
      request_id: body.request_id,
      decision: gate.decision,
      reason: gate.reason,
      approval_id: approval.id,
      approval_hash: approval.approval_hash,
      input_hash: inputHash,
      effect_id: effectId,
      sequence: nextSequence,
      entry_hash: entryHash,
      execution_id: executionInsert.data.id,
    },
  };
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

    if (isSpineBody(body)) {
      const spineResult = await runSpineExecution({
        supabase,
        agent,
        body,
        nowIso,
        idempotencyKey,
      });

      if (!spineResult.ok) {
        await markReservationFailed(supabase, reservation.reservation_id, spineResult.error);
        return NextResponse.json({ error: spineResult.error }, { status: spineResult.status });
      }

      const { error: agentUpdateError } = await supabase
        .from('agents')
        .update({ last_used_at: nowIso, updated_at: nowIso })
        .eq('id', agent.id);

      if (agentUpdateError) {
        await markReservationFailed(supabase, reservation.reservation_id, agentUpdateError.message);
        return NextResponse.json({ error: agentUpdateError.message }, { status: 500 });
      }

      const { error: finalizeError } = await supabase.rpc('finalize_execution_reservation', {
        p_reservation_id: reservation.reservation_id,
        p_status: 'processed',
        p_execution_id: spineResult.payload.execution_id,
        p_response_payload: spineResult.payload,
      });

      if (finalizeError) {
        return NextResponse.json({ error: finalizeError.message }, { status: 500 });
      }

      return NextResponse.json(
        {
          ...spineResult.payload,
          idempotency_key: idempotencyKey,
          idempotency_status: 'processed',
        },
        { status: 200 }
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
