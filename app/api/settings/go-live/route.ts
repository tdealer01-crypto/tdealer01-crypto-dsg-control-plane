import { NextResponse } from 'next/server';
import { requireOrgPermission } from '../../../../lib/auth/require-org-permission';
import { logServerError, serverErrorResponse } from '../../../../lib/security/error-response';
import { buildGoLiveReadinessReport } from '../../../../lib/readiness/go-live';

export const dynamic = 'force-dynamic';

const PRIVATE_HEADERS = {
  'cache-control': 'private, no-store, max-age=0',
};

export async function GET() {
  const access = await requireOrgPermission('org.view_reports');
  if (access.ok === false) {
    return NextResponse.json({ error: access.error }, { status: access.status, headers: PRIVATE_HEADERS });
  }

  try {
    const report = await buildGoLiveReadinessReport(access.orgId);
    return NextResponse.json(report, { headers: PRIVATE_HEADERS });
  } catch (error) {
    logServerError(error, 'settings-go-live');
    return serverErrorResponse({ headers: PRIVATE_HEADERS });
  }
}
