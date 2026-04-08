import { NextResponse } from 'next/server';
import { randomUUID, createHash } from 'crypto';
import { createClient } from '../../../lib/supabase/server';
import { logServerError, serverErrorResponse } from '../../../lib/security/error-response';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const AGENTS_RATE_LIMIT = 60;
const AGENTS_RATE_WINDOW_MS = 60 * 1000;
const DEFAULT_LIMIT = 10;
const MAX_PER_PAGE = 50;
const MAX_AGENTS_PER_ORG = 100;

function buildApiKey() {
  return `dsg_live_${randomUUID().replace(/-/g, '')}`;
}

function buildPreview(apiKey: string) {
  return `${apiKey.slice(0, 12)}...`;
}

function isMissingRelationError(error: unknown) {
  const message = String((error as { message?: unknown })?.message || '').toLowerCase();
  return message.includes('does not exist') || message.includes('undefined table') || message.includes('relation');
}

function parsePagination(request: Request) {
  const url = new URL(request.url);
  const rawPage = Number.parseInt(url.searchParams.get('page') || '1', 10);
  const rawPerPage = Number.parseInt(url.searchParams.get('per_page') || String(DEFAULT_LIMIT), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const boundedPerPage = Number.isFinite(rawPerPage) && rawPerPage > 0 ? rawPerPage : DEFAULT_LIMIT;
  const perPage = Math.min(boundedPerPage, MAX_PER_PAGE);
  return { page, perPage, from: (page - 1) * perPage, to: (page - 1) * perPage + perPage - 1 };
}

async function resolvePolicyId(orgId: string, requestedPolicyId?: string | null) {
  const supabase = getSupabaseAdmin();

  if (requestedPolicyId) {
    const { data: runtimePolicy, error: runtimeError } = await supabase
      .from('runtime_policies')
      .select('id')
      .eq('org_id', orgId)
      .eq('id', requestedPolicyId)
      .maybeSingle();

    if (!runtimeError && runtimePolicy?.id) return String(runtimePolicy.id);
    if (runtimeError && !isMissingRelationError(runtimeError)) throw runtimeError;

    const { data: legacyPolicy, error: legacyError } = await supabase
      .from('policies')
      .select('id')
      .eq('id', requestedPolicyId)
      .maybeSingle();

    if (legacyError) throw legacyError;
    if (legacyPolicy?.id) return String(legacyPolicy.id);

    return null;
  }

  const { data: runtimeLatest, error: runtimeLatestError } = await supabase
    .from('runtime_policies')
    .select('id')
    .eq('org_id', orgId)
    .in('status', ['active', 'approved', 'draft', 'proposed'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!runtimeLatestError && runtimeLatest?.id) return String(runtimeLatest.id);
  if (runtimeLatestError && !isMissingRelationError(runtimeLatestError)) throw runtimeLatestError;

  const { data: legacyAny, error: legacyAnyError } = await supabase
    .from('policies')
    .select('id')
    .in('status', ['active', 'draft'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (legacyAnyError) throw legacyAnyError;
  return legacyAny?.id ? String(legacyAny.id) : null;
}

async function requireActiveProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profileError || !profile?.org_id || !profile.is_active) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }

  return { ok: true as const, orgId: String(profile.org_id) };
}

export async function GET(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'agents'),
    limit: AGENTS_RATE_LIMIT,
    windowMs: AGENTS_RATE_WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, AGENTS_RATE_LIMIT);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  try {
    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status, headers });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString().slice(0, 7);
    const { page, perPage, from, to } = parsePagination(request);

    const { data: agents, error, count } = await supabase
      .from('agents')
      .select('id, name, policy_id, status, monthly_limit', { count: 'exact' })
      .eq('org_id', access.orgId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logServerError(error, 'agents-get');
      return serverErrorResponse({ headers });
    }

    const agentIds = (agents || []).map((agent) => String(agent.id));
    const usageByAgent = new Map<string, number>();

    if (agentIds.length > 0) {
      const { data: usageRows, error: usageError } = await supabase
        .from('usage_counters')
        .select('agent_id, executions')
        .eq('org_id', access.orgId)
        .eq('billing_period', now)
        .in('agent_id', agentIds);

      if (usageError) {
        logServerError(usageError, 'agents-get-usage');
        return serverErrorResponse({ headers });
      }

      for (const row of usageRows || []) {
        usageByAgent.set(String(row.agent_id), Number(row.executions || 0));
      }
    }

    const items = (agents || []).map((agent) => ({
      agent_id: agent.id,
      name: agent.name,
      policy_id: agent.policy_id,
      status: agent.status,
      monthly_limit: agent.monthly_limit,
      usage_this_month: usageByAgent.get(String(agent.id)) || 0,
      api_key_preview: 'hidden',
    }));

    return NextResponse.json({
      items,
      pagination: {
        page,
        per_page: perPage,
        total: Number(count || 0),
        total_pages: Math.max(Math.ceil(Number(count || 0) / perPage), 1),
      },
    }, { headers });
  } catch (error) {
    logServerError(error, 'agents-get');
    return serverErrorResponse({ headers });
  }
}

export async function POST(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'agents'),
    limit: AGENTS_RATE_LIMIT,
    windowMs: AGENTS_RATE_WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, AGENTS_RATE_LIMIT);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  try {
    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status, headers });
    }

    const body = await request.json().catch(() => null);
    const name = String(body?.name || '').trim();
    const monthlyLimit = Number(body?.monthly_limit ?? 10000);
    const requestedPolicyId = body?.policy_id ? String(body.policy_id).trim() : null;

    if (!name || name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: 'name must be between 2 and 80 characters' }, { status: 400, headers });
    }

    if (!Number.isFinite(monthlyLimit) || monthlyLimit < 1 || monthlyLimit > 1000000) {
      return NextResponse.json({ error: 'monthly_limit must be between 1 and 1000000' }, { status: 400, headers });
    }

    const supabase = getSupabaseAdmin();
    const { count: existingCount, error: countError } = await supabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', access.orgId);

    if (countError) {
      logServerError(countError, 'agents-post-count');
      return serverErrorResponse({ headers });
    }

    if (Number(existingCount || 0) >= MAX_AGENTS_PER_ORG) {
      return NextResponse.json({ error: `Maximum ${MAX_AGENTS_PER_ORG} agents per organization` }, { status: 400, headers });
    }

    const resolvedPolicyId = await resolvePolicyId(access.orgId, requestedPolicyId);
    if (!resolvedPolicyId) {
      return NextResponse.json({ error: 'policy_id is invalid or no policy is available' }, { status: 400, headers });
    }

    const apiKey = buildApiKey();
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');
    const agentId = `agt_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();

    const { data: inserted, error } = await supabase
      .from('agents')
      .insert({
        id: agentId,
        org_id: access.orgId,
        name,
        policy_id: resolvedPolicyId,
        status: 'active',
        monthly_limit: Math.floor(monthlyLimit),
        api_key_hash: apiKeyHash,
        created_at: now,
        updated_at: now,
      })
      .select('id, name, policy_id, status, monthly_limit')
      .single();

    if (error || !inserted) {
      logServerError(error, 'agents-post');
      return serverErrorResponse({ headers });
    }

    return NextResponse.json({
      agent_id: inserted.id,
      name: inserted.name,
      policy_id: inserted.policy_id,
      status: inserted.status,
      monthly_limit: inserted.monthly_limit,
      api_key: apiKey,
      api_key_preview: buildPreview(apiKey),
    }, { headers, status: 201 });
  } catch (error) {
    logServerError(error, 'agents-post');
    return serverErrorResponse({ headers });
  }
}
