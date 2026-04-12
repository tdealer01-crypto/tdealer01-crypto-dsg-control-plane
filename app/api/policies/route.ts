import { NextResponse } from 'next/server';
import { requireRuntimeAccess } from '../../../lib/authz-runtime';
import { logServerError, serverErrorResponse } from '../../../lib/security/error-response';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { isMissingRelationError } from '../../../lib/supabase/resolve-policy';

function isMissingColumnError(error: unknown) {
  const message = String((error as { message?: unknown })?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

export async function GET(request: Request) {
  const access = await requireRuntimeAccess(request, 'policies_read');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = getSupabaseAdmin();
  const runtimeRes = await supabase
    .from('runtime_policies')
    .select('id, name, version, status, thresholds, governance_state, updated_at')
    .eq('org_id', access.orgId)
    .order('updated_at', { ascending: false });

  if (!runtimeRes.error) {
    return NextResponse.json({ items: runtimeRes.data || [], source: 'runtime_policies' });
  }

  if (!isMissingRelationError(runtimeRes.error)) {
    logServerError(runtimeRes.error, 'policies-get-runtime');
    return serverErrorResponse();
  }

  const scopedLegacyRes = await supabase
    .from('policies')
    .select('id, name, version, status, config, updated_at')
    .eq('org_id', access.orgId)
    .order('updated_at', { ascending: false });

  let legacyData = scopedLegacyRes.data;
  if (scopedLegacyRes.error) {
    if (!isMissingColumnError(scopedLegacyRes.error)) {
      logServerError(scopedLegacyRes.error, 'policies-get-legacy');
      return serverErrorResponse();
    }

    const legacyRes = await supabase
      .from('policies')
      .select('id, name, version, status, config, updated_at')
      .order('updated_at', { ascending: false });

    if (legacyRes.error) {
      logServerError(legacyRes.error, 'policies-get-legacy-global');
      return serverErrorResponse();
    }
    legacyData = legacyRes.data;
  }

  const items = (legacyData || []).map((policy) => ({
    id: policy.id,
    name: policy.name,
    version: policy.version,
    status: policy.status,
    thresholds: policy.config || {},
    governance_state: 'legacy',
    updated_at: policy.updated_at,
  }));

  return NextResponse.json({ items, source: 'policies_legacy' });
}

export async function POST(request: Request) {
  const access = await requireRuntimeAccess(request, 'policies_write');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => null);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('runtime_policies')
    .insert({
      org_id: access.orgId,
      name: String(body?.name || 'Unnamed policy'),
      version: String(body?.version || 'v1'),
      status: String(body?.status || 'draft'),
      thresholds: body?.thresholds || {},
      governance_state: String(body?.governance_state || 'proposed'),
      created_by: access.userId,
      updated_by: access.userId,
    })
    .select('id, name, version, status, thresholds, governance_state')
    .single();

  if (error || !data) {
    if (isMissingRelationError(error)) {
      return NextResponse.json(
        { error: 'runtime_policies table is unavailable. Run runtime RBAC migrations before creating policies.' },
        { status: 503 }
      );
    }

    logServerError(error, 'policies-post');
    return serverErrorResponse();
  }

  await supabase.from('runtime_policy_governance_events').insert({
    org_id: access.orgId,
    policy_id: data.id,
    actor_user_id: access.userId,
    event_type: 'policy_created',
    metadata: { governance_state: data.governance_state },
  });

  return NextResponse.json(data, { status: 201 });
}
