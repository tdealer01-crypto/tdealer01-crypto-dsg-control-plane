import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../../lib/authz';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { internalErrorMessage } from '../../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const access = await requireOrgRole(['org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('org_domains')
    .update({
      status: body.status,
      claim_mode: body.claim_mode,
      auto_join_mode: body.auto_join_mode,
      notes: body.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('org_id', access.orgId)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  return NextResponse.json({ item: data });
}
