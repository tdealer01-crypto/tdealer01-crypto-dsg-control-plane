import { NextResponse } from 'next/server';
import { requireOrgPermission } from '../../../../../lib/auth/require-org-permission';
import { logServerError, serverErrorResponse } from '../../../../../lib/security/error-response';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';

const PRIVATE_HEADERS = {
  'cache-control': 'private, no-store, max-age=0',
};

export async function GET() {
  const access = await requireOrgPermission('org.manage_access');
  if (access.ok === false) {
    return NextResponse.json({ error: access.error }, { status: access.status, headers: PRIVATE_HEADERS });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('guest_access_grants')
    .select('id, email, status, expires_at, scope, created_at')
    .eq('org_id', access.orgId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    logServerError(error, 'settings-access-guests');
    return serverErrorResponse({ headers: PRIVATE_HEADERS });
  }

  return NextResponse.json({ guests: data || [] }, { headers: PRIVATE_HEADERS });
}
