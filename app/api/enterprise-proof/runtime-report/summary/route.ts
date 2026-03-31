import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../../lib/authz';
import { RuntimeRouteRoles } from '../../../../../lib/runtime/permissions';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { buildVerifiedRuntimeProofReport, summarizeVerifiedRuntimeReport } from '../../../../../lib/enterprise/proof-runtime';

export const dynamic = 'force-dynamic';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

export async function GET(request: Request) {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.runtime_summary);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status, headers: PRIVATE_HEADERS });
    }

    const url = new URL(request.url);
    const orgId = url.searchParams.get('org_id');
    const agentId = url.searchParams.get('agent_id');

    if (!orgId || !agentId) {
      return NextResponse.json({ error: 'org_id and agent_id are required' }, { status: 400, headers: PRIVATE_HEADERS });
    }

    if (orgId !== access.orgId) {
      return NextResponse.json({ error: 'Cross-org access is forbidden' }, { status: 403, headers: PRIVATE_HEADERS });
    }

    const supabase = getSupabaseAdmin();
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .eq('org_id', orgId)
      .maybeSingle();

    if (agentError) {
      return NextResponse.json({ error: agentError.message }, { status: 500, headers: PRIVATE_HEADERS });
    }

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found in org scope' }, { status: 404, headers: PRIVATE_HEADERS });
    }

    const report = await buildVerifiedRuntimeProofReport({ orgId, agentId });
    return NextResponse.json(summarizeVerifiedRuntimeReport(report), { headers: PRIVATE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500, headers: PRIVATE_HEADERS }
    );
  }
}
