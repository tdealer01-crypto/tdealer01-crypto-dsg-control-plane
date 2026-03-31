import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { RuntimeRouteRoles } from '../../../lib/runtime/permissions';
import { validateRuntimeRecovery } from '../../../lib/runtime/recovery';

function canUseNonProdBypass(request: Request) {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.ENABLE_DEMO_BOOTSTRAP !== 'true') return false;
  const expected = process.env.DEMO_BOOTSTRAP_TOKEN;
  if (!expected) return false;
  return request.headers.get('x-demo-token') === expected;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const orgId = String(body?.org_id || '');
    const agentId = String(body?.agent_id || '');

    if (!orgId || !agentId) {
      return NextResponse.json({ error: 'org_id and agent_id are required' }, { status: 400 });
    }

    const bypass = canUseNonProdBypass(request);
    if (!bypass) {
      const access = await requireOrgRole(RuntimeRouteRoles.checkpoint);
      if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
      }
      if (orgId !== access.orgId) {
        return NextResponse.json({ error: 'Cross-org access denied' }, { status: 403 });
      }
    }

    const result = await validateRuntimeRecovery({ orgId, agentId });
    return NextResponse.json(result, { status: result.pass ? 200 : 409 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
