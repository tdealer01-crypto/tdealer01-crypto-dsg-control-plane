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
    .from('access_requests')
    .select('id, org_id, email, email_domain, workspace_name, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    logServerError(error, 'settings-access-requests');
    return serverErrorResponse({ headers: PRIVATE_HEADERS });
  }

  const orgDomain = access.email.split('@')[1] || '';
  const scoped = (data || []).filter((row) => row.org_id === access.orgId || (!row.org_id && row.email_domain === orgDomain));

  return NextResponse.json({ requests: scoped }, { headers: PRIVATE_HEADERS });
}
