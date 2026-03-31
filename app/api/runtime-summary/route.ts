import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { RuntimeRouteRoles } from '../../../lib/runtime/permissions';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export async function GET(request: Request) {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.runtime_summary);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const url = new URL(request.url);
    const orgId = url.searchParams.get('org_id');
    const agentId = url.searchParams.get('agent_id');

    if (!orgId || !agentId || orgId !== access.orgId) {
      return NextResponse.json({ error: 'org_id and agent_id are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const [{ data: truth }, { data: ledger }] = await Promise.all([
      supabase
        .from('runtime_truth_states')
        .select('id, canonical_hash, created_at')
        .eq('org_id', orgId)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('runtime_ledger_entries')
        .select('id, decision, ledger_sequence, truth_sequence, created_at')
        .eq('org_id', orgId)
        .eq('agent_id', agentId)
        .order('ledger_sequence', { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      org_id: orgId,
      agent_id: agentId,
      truth_state: truth || null,
      latest_ledger: (ledger || [])[0] || null,
      entries: ledger || [],
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
