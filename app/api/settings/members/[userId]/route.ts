import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../../lib/authz';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { preventRemovingLastOwner } from '../../../../../lib/auth/admin-safety';
import { internalErrorMessage } from '../../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ userId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const access = await requireOrgRole(['org_admin']);
  if (!access.ok) return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
  const { userId } = await params;
  const body = await req.json().catch(() => ({}));
  const role = String(body.role || '').trim();
  if (!role) return NextResponse.json({ error: 'role is required' }, { status: 400 });
  if (role === 'guest_auditor_admin') return NextResponse.json({ error: 'Guest auditor cannot receive admin/security permissions.' }, { status: 400 });
  const admin = getSupabaseAdmin();
  try {
    await preventRemovingLastOwner(admin, access.orgId, userId, role);
  } catch (e) {
    return NextResponse.json({ error: 'Owner safety check failed.' }, { status: 409 });
  }
  const { data, error } = await admin.from('users').update({ role, updated_at: new Date().toISOString() }).eq('org_id', access.orgId).eq('id', userId).select('id,role').single();
  if (error) return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  return NextResponse.json({ item: data });
}
