import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { RuntimeRouteRoles } from '../../../lib/runtime/permissions';
import { logServerError, serverErrorResponse } from '../../../lib/security/error-response';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export async function GET() {
  const access = await requireOrgRole(RuntimeRouteRoles.policies_read);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('runtime_policies')
    .select('id, name, version, status, thresholds, governance_state, updated_at')
    .eq('org_id', access.orgId)
    .order('updated_at', { ascending: false });

  if (error) {
    logServerError(error, 'policies-get');
    return serverErrorResponse();
  }
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: Request) {
  const access = await requireOrgRole(RuntimeRouteRoles.policies_write);
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
    logServerError(error, 'policies-post');
    return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 });
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
