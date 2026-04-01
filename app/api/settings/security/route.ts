import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { preventDisablingAllRecoveryPaths } from '../../../../lib/auth/admin-safety';

export async function PATCH(req: NextRequest) {
  const access = await requireOrgRole(['org_admin']);
  if (!access.ok) return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
  const body = await req.json().catch(() => ({}));
  const admin = getSupabaseAdmin();

  if (body.sso_enforced === true) {
    try { await preventDisablingAllRecoveryPaths(admin, access.orgId); }
    catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Cannot enforce SSO.' }, { status: 409 }); }
  }

  const { data, error } = await admin
    .from('org_security_settings')
    .upsert({ org_id: access.orgId, sso_enabled: Boolean(body.sso_enabled), sso_enforced: Boolean(body.sso_enforced), break_glass_email_enabled: body.break_glass_email_enabled !== false, sso_metadata: body.sso_metadata || {}, updated_at: new Date().toISOString() }, { onConflict: 'org_id' })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
