import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { RuntimeRouteRoles } from '../../../../lib/runtime/permissions';
import { buildEnterpriseProofReport } from '../../../../lib/enterprise/proof';

function canUseDemo(request: Request) {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.ENABLE_DEMO_BOOTSTRAP !== 'true') return false;
  const expected = process.env.DEMO_BOOTSTRAP_TOKEN;
  if (!expected) return false;
  return request.headers.get('x-demo-token') === expected;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orgId = String(url.searchParams.get('org_id') || '');
    const agentId = String(url.searchParams.get('agent_id') || '');
    if (!orgId || !agentId) {
      return NextResponse.json({ error: 'org_id and agent_id are required' }, { status: 400 });
    }

    const demoBypass = canUseDemo(request);
    if (!demoBypass) {
      const access = await requireOrgRole(RuntimeRouteRoles.runtime_summary);
      if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
      if (orgId !== access.orgId) return NextResponse.json({ error: 'Cross-org access denied' }, { status: 403 });
    }

    const report = await buildEnterpriseProofReport({ orgId, agentId });
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
