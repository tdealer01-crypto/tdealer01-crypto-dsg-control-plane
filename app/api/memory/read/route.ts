import { NextResponse } from 'next/server';
import { requireActiveAgentFromBearer } from '../../../../lib/agent-auth';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentId = url.searchParams.get('agent_id');
  const memoryKey = url.searchParams.get('memory_key');
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '20'), 1), 100);

  const access = await requireActiveAgentFromBearer(request, agentId);
  if (access.ok === false) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('agent_memory')
    .select('id, request_id, memory_key, memory_value, lineage_hash, created_at')
    .eq('org_id', access.orgId)
    .eq('agent_id', access.agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (memoryKey) {
    query = query.eq('memory_key', memoryKey);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    items: data || [],
  });
}
