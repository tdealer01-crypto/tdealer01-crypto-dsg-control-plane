import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

function header(request: Request, name: string) {
  return request.headers.get(name)?.trim() ?? '';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = header(request, 'x-org-id') || searchParams.get('orgId')?.trim() || '';
  const auditToken = searchParams.get('auditToken')?.trim() || '';

  if (!orgId) {
    return NextResponse.json({ ok: false, error: 'missing_org_id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin() as any;
  let query = supabase
    .from('gateway_monitor_events')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (auditToken) {
    query = query.eq('audit_token', auditToken).limit(1);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      type: 'gateway-monitor-audit-export',
      exportedAt: new Date().toISOString(),
      orgId,
      count: Array.isArray(data) ? data.length : 0,
      events: data ?? [],
    },
    {
      status: 200,
      headers: {
        'content-disposition': 'attachment; filename="gateway-monitor-audit-export.json"',
      },
    }
  );
}
