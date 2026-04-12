import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { requireRuntimeAccess } from '../../../lib/authz-runtime';

export async function GET(req: Request) {
  const auth = await requireRuntimeAccess(req, 'monitor');
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const admin = getSupabaseAdmin() as any;
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? '20');

  const { data, error } = await admin
    .from('agent_execution_requests')
    .select('id, workspace_id, org_id, provider, agent_id, status, created_at, updated_at')
    .eq('org_id', auth.orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}
