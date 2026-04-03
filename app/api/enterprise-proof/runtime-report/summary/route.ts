import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../../lib/authz';
import { RuntimeRouteRoles } from '../../../../../lib/runtime/permissions';
import { buildVerifiedRuntimeProofReport, summarizeVerifiedRuntimeReport } from '../../../../../lib/enterprise/proof-runtime';
import { validateOrgAgentScope } from '../../../../../lib/enterprise/proof-access';
import { internalErrorMessage, logApiError } from '../../../../../lib/security/api-error';

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

    const scope = await validateOrgAgentScope({ orgId, agentId });
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status, headers: PRIVATE_HEADERS });
    }

    const report = await buildVerifiedRuntimeProofReport({ orgId, agentId });
    return NextResponse.json(summarizeVerifiedRuntimeReport(report), { headers: PRIVATE_HEADERS });
  } catch (error) {
    logApiError('api/enterprise-proof/runtime-report/summary', error, { stage: 'unhandled' });
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500, headers: PRIVATE_HEADERS }
    );
  }
}
