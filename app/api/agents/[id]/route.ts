import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { logServerError, serverErrorResponse } from '../../../../lib/security/error-response';
import { requireActiveProfile } from '../../../../lib/auth/require-active-profile';
import { resolvePolicyId } from '../../../../lib/supabase/resolve-policy';

const AGENT_DETAIL_RATE_LIMIT = 60;
const AGENT_DETAIL_RATE_WINDOW_MS = 60 * 1000;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const rateLimit = await applyRateLimit({ key: getRateLimitKey(request, 'agents-detail'), limit: AGENT_DETAIL_RATE_LIMIT, windowMs: AGENT_DETAIL_RATE_WINDOW_MS });
  const headers = buildRateLimitHeaders(rateLimit, AGENT_DETAIL_RATE_LIMIT);
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });

  try {
    const access = await requireActiveProfile();
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status, headers });

    const { id } = params;
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString().slice(0, 7);

    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, name, policy_id, status, monthly_limit, created_at, updated_at, last_used_at')
      .eq('org_id', access.orgId)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logServerError(error, 'agents-id-get');
      return serverErrorResponse({ headers });
    }
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404, headers });

    const { data: usage } = await supabase
      .from('usage_counters')
      .select('executions')
      .eq('org_id', access.orgId)
      .eq('agent_id', id)
      .eq('billing_period', now)
      .maybeSingle();

    return NextResponse.json({
      agent_id: agent.id,
      name: agent.name,
      policy_id: agent.policy_id,
      status: agent.status,
      monthly_limit: agent.monthly_limit,
      usage_this_month: Number(usage?.executions || 0),
      created_at: agent.created_at,
      updated_at: agent.updated_at,
      last_used_at: agent.last_used_at,
      api_key_preview: 'hidden',
    }, { headers });
  } catch (error) {
    logServerError(error, 'agents-id-get');
    return serverErrorResponse({ headers });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const rateLimit = await applyRateLimit({ key: getRateLimitKey(request, 'agents-detail'), limit: AGENT_DETAIL_RATE_LIMIT, windowMs: AGENT_DETAIL_RATE_WINDOW_MS });
  const headers = buildRateLimitHeaders(rateLimit, AGENT_DETAIL_RATE_LIMIT);
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });

  try {
    const access = await requireActiveProfile();
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status, headers });

    const { id } = params;
    const body = await request.json().catch(() => null);
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof body?.name !== 'undefined') {
      const name = String(body.name || '').trim();
      if (!name || name.length < 2 || name.length > 80) {
        return NextResponse.json({ error: 'name must be between 2 and 80 characters' }, { status: 400, headers });
      }
      update.name = name;
    }

    if (typeof body?.status !== 'undefined') {
      const status = String(body.status || '').trim().toLowerCase();
      if (!['active', 'disabled'].includes(status)) {
        return NextResponse.json({ error: 'status must be active or disabled' }, { status: 400, headers });
      }
      update.status = status;
    }

    if (typeof body?.monthly_limit !== 'undefined') {
      const monthlyLimit = Number(body.monthly_limit);
      if (!Number.isFinite(monthlyLimit) || monthlyLimit < 1 || monthlyLimit > 1000000) {
        return NextResponse.json({ error: 'monthly_limit must be between 1 and 1000000' }, { status: 400, headers });
      }
      update.monthly_limit = Math.floor(monthlyLimit);
    }

    if (typeof body?.policy_id !== 'undefined') {
      const policyId = String(body.policy_id || '').trim();
      if (!policyId) return NextResponse.json({ error: 'policy_id cannot be empty' }, { status: 400, headers });
      const resolvedPolicyId = await resolvePolicyId(access.orgId, policyId);
      if (!resolvedPolicyId) return NextResponse.json({ error: 'policy_id is invalid' }, { status: 400, headers });
      update.policy_id = resolvedPolicyId;
    }

    if (Object.keys(update).length === 1) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400, headers });
    }

    const supabase = getSupabaseAdmin();
    const { data: updated, error } = await supabase
      .from('agents')
      .update(update)
      .eq('org_id', access.orgId)
      .eq('id', id)
      .select('id, name, policy_id, status, monthly_limit, updated_at')
      .maybeSingle();

    if (error) {
      logServerError(error, 'agents-id-patch');
      return serverErrorResponse({ headers });
    }
    if (!updated) return NextResponse.json({ error: 'Agent not found' }, { status: 404, headers });

    return NextResponse.json({
      agent_id: updated.id,
      name: updated.name,
      policy_id: updated.policy_id,
      status: updated.status,
      monthly_limit: updated.monthly_limit,
      updated_at: updated.updated_at,
    }, { headers });
  } catch (error) {
    logServerError(error, 'agents-id-patch');
    return serverErrorResponse({ headers });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const rateLimit = await applyRateLimit({ key: getRateLimitKey(request, 'agents-detail'), limit: AGENT_DETAIL_RATE_LIMIT, windowMs: AGENT_DETAIL_RATE_WINDOW_MS });
  const headers = buildRateLimitHeaders(rateLimit, AGENT_DETAIL_RATE_LIMIT);
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });

  try {
    const access = await requireActiveProfile();
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status, headers });

    const { id } = params;
    const supabase = getSupabaseAdmin();

    const { data: updated, error } = await supabase
      .from('agents')
      .update({ status: 'disabled', updated_at: new Date().toISOString() })
      .eq('org_id', access.orgId)
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      logServerError(error, 'agents-id-delete');
      return serverErrorResponse({ headers });
    }
    if (!updated) return NextResponse.json({ error: 'Agent not found' }, { status: 404, headers });

    return NextResponse.json({ ok: true, agent_id: updated.id, disabled: true }, { headers });
  } catch (error) {
    logServerError(error, 'agents-id-delete');
    return serverErrorResponse({ headers });
  }
}
