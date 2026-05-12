import { NextResponse } from 'next/server';
import { requireRuntimeAccess } from '../../../lib/authz-runtime';
import { logServerError, serverErrorResponse } from '../../../lib/security/error-response';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { isMissingRelationError } from '../../../lib/supabase/resolve-policy';

type PolicyRecord = {
  id?: string | null;
  name?: string | null;
  version?: string | null;
  status?: string | null;
  thresholds?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  governance_state?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

function isMissingColumnError(error: unknown) {
  const message = String((error as { message?: unknown })?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

function normalizePolicy(policy: PolicyRecord, source: string) {
  const thresholds = policy.thresholds || policy.config || {};

  return {
    id: String(policy.id || ''),
    name: String(policy.name || 'Unnamed policy'),
    version: String(policy.version || 'v1'),
    status: String(policy.status || 'active'),
    thresholds,
    governance_state: String(policy.governance_state || (source === 'runtime_policies' ? 'active_in_runtime' : 'legacy_ready')),
    updated_at: String(policy.updated_at || policy.created_at || new Date().toISOString()),
  };
}

async function loadLegacyPolicies(supabase: ReturnType<typeof getSupabaseAdmin>, orgId: string) {
  const scoped = await supabase
    .from('policies')
    .select('id, org_id, name, version, status, config, updated_at, created_at')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false });

  if (!scoped.error && scoped.data && scoped.data.length > 0) {
    return { items: scoped.data.map((item) => normalizePolicy(item, 'policies_legacy')), source: 'policies_legacy_scoped' };
  }

  if (scoped.error && !isMissingColumnError(scoped.error)) {
    throw scoped.error;
  }

  const global = await supabase
    .from('policies')
    .select('id, name, version, status, config, updated_at, created_at')
    .order('updated_at', { ascending: false });

  if (global.error) {
    if (!isMissingColumnError(global.error)) throw global.error;

    const minimal = await supabase
      .from('policies')
      .select('id, name, version, updated_at, created_at')
      .order('updated_at', { ascending: false });

    if (minimal.error) throw minimal.error;
    return { items: (minimal.data || []).map((item) => normalizePolicy(item, 'policies_legacy_minimal')), source: 'policies_legacy_minimal' };
  }

  return { items: (global.data || []).map((item) => normalizePolicy(item, 'policies_legacy_global')), source: 'policies_legacy_global' };
}

export async function GET(request: Request) {
  const access = await requireRuntimeAccess(request, 'policies_read');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = getSupabaseAdmin();

  try {
    const runtimeRes = await supabase
      .from('runtime_policies')
      .select('id, name, version, status, thresholds, governance_state, updated_at, created_at')
      .eq('org_id', access.orgId)
      .order('updated_at', { ascending: false });

    if (!runtimeRes.error && runtimeRes.data && runtimeRes.data.length > 0) {
      return NextResponse.json({
        items: runtimeRes.data.map((item) => normalizePolicy(item, 'runtime_policies')),
        source: 'runtime_policies',
      });
    }

    if (runtimeRes.error && !isMissingRelationError(runtimeRes.error) && !isMissingColumnError(runtimeRes.error)) {
      logServerError(runtimeRes.error, 'policies-get-runtime-fallback');
    }

    const legacy = await loadLegacyPolicies(supabase, access.orgId);
    return NextResponse.json(legacy);
  } catch (error) {
    logServerError(error, 'policies-get');
    return serverErrorResponse();
  }
}

export async function POST(request: Request) {
  const access = await requireRuntimeAccess(request, 'policies_write');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => null);
  const supabase = getSupabaseAdmin();

  const payload = {
    org_id: access.orgId,
    name: String(body?.name || 'Unnamed policy'),
    version: String(body?.version || 'v1'),
    status: String(body?.status || 'draft'),
    thresholds: body?.thresholds || {},
    governance_state: String(body?.governance_state || 'proposed'),
    created_by: access.userId,
    updated_by: access.userId,
  };

  const { data, error } = await supabase
    .from('runtime_policies')
    .insert(payload)
    .select('id, name, version, status, thresholds, governance_state, updated_at')
    .single();

  if (error || !data) {
    if (isMissingRelationError(error)) {
      return NextResponse.json(
        { error: 'runtime_policies table is unavailable. Run runtime policy migrations before creating policies.' },
        { status: 503 },
      );
    }

    logServerError(error, 'policies-post');
    return serverErrorResponse();
  }

  const event = await supabase.from('runtime_policy_governance_events').insert({
    org_id: access.orgId,
    policy_id: data.id,
    actor_user_id: access.userId,
    event_type: 'policy_created',
    metadata: { governance_state: data.governance_state, source: 'dashboard_policies' },
  });

  if (event.error && !isMissingRelationError(event.error)) {
    logServerError(event.error, 'policies-post-event');
  }

  return NextResponse.json(normalizePolicy(data, 'runtime_policies'), { status: 201 });
}
