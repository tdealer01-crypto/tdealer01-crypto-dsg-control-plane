import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { buildGoLiveReadinessReport } from '../../../../lib/readiness/go-live';

export async function GET() {
  const access = await requireOrgRole(['org_admin', 'runtime_auditor']);
  if (!access.ok) return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
  const report = await buildGoLiveReadinessReport(access.orgId);
  return NextResponse.json(report, { headers: { 'cache-control': 'no-store' } });
}
