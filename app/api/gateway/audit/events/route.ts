import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

function header(request: Request, name: string) {
  return request.headers.get(name)?.trim() ?? '';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = header(request, 'x-org-id') || searchParams.get('orgId')?.trim() || '';
  const limit = Math.min(Number(searchParams.get('limit') ?? 50) || 50, 100);

  if (!orgId) {
    return NextResponse.json({ ok: false, error: 'missing_org_id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin() as any;
  const { data, error } = await supabase
    .from('gateway_monitor_events')
    .select('id, org_id, plan_id, tool_name, action, mode, decision, actor_id, actor_role, risk, status, request_hash, decision_hash, record_hash, audit_token, result, created_at, committed_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, events: data ?? [] }, { status: 200 });
}
