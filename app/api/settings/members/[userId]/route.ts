import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../../lib/authz';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { preventRemovingLastOwner } from '../../../../../lib/auth/admin-safety';

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const access = await requireOrgRole(['org_admin']);
  if (!access.ok) return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
  const body = await req.json().catch(() => ({}));
  const role = String(body.role || '').trim();
  if (!role) return NextResponse.json({ error: 'role is required' }, { status: 400 });
  if (role === 'guest_auditor_admin') return NextResponse.json({ error: 'Guest auditor cannot receive admin/security permissions.' }, { status: 400 });
  const admin = getSupabaseAdmin();
  try {
    await preventRemovingLastOwner(admin, access.orgId, params.userId, role);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Owner safety check failed.' }, { status: 409 });
  }
  const { data, error } = await admin.from('users').update({ role, updated_at: new Date().toISOString() }).eq('org_id', access.orgId).eq('id', params.userId).select('id,role').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
