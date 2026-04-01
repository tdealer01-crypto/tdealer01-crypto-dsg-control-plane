import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../../lib/authz';
import { exportAuditEventsAsJson } from '../../../../../lib/security/audit-export';

export async function GET(req: NextRequest) {
  const access = await requireOrgRole(['org_admin', 'runtime_auditor']);
  if (!access.ok) return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, Number(sp.get('page_size') || '20')));
  const items = await exportAuditEventsAsJson(access.orgId, { start_date: sp.get('start_date'), end_date: sp.get('end_date'), event_type: sp.get('event_type'), email: sp.get('email') });
  const start = (page - 1) * pageSize;
  return NextResponse.json({ items: items.slice(start, start + pageSize), page, page_size: pageSize, total: items.length });
}
