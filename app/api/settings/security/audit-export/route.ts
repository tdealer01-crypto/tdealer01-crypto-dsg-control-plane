import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../../lib/authz';
import { exportAuditEventsAsCsv, exportAuditEventsAsJson } from '../../../../../lib/security/audit-export';

export async function GET(req: NextRequest) {
  const access = await requireOrgRole(['org_admin', 'runtime_auditor']);
  if (!access.ok) return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
  const sp = new URL(req.url).searchParams;
  const format = sp.get('format') || 'json';
  const filters = { start_date: sp.get('start_date'), end_date: sp.get('end_date'), event_type: sp.get('event_type'), email: sp.get('email') };
  if (format === 'csv') {
    const csv = await exportAuditEventsAsCsv(access.orgId, filters);
    return new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="audit-export.csv"' } });
  }
  return NextResponse.json({ items: await exportAuditEventsAsJson(access.orgId, filters) }, { headers: { 'cache-control': 'no-store' } });
}
