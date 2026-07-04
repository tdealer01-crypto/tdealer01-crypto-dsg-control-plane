import { NextResponse } from 'next/server';
import { createMonitorPlanCheck } from '../../../../lib/gateway/monitor';
import { normalizeGatewayToolRequest } from '../../../../lib/gateway/executor';
import { requireOrgPermission } from '../../../../lib/auth/require-org-permission';

export const dynamic = 'force-dynamic';

function statusForDecision(decision: string) {
  if (decision === 'allow') {
    return 200;
  }

  if (decision === 'review' || decision === 'ask_more_info') {
    return 202;
  }

  return 403;
}

export async function POST(request: Request) {
  try {
    const access = await requireOrgPermission('org.execute');
    if (access.ok !== true) {
      return NextResponse.json({ ok: false, decision: 'block', reason: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => ({}));
    // Identity comes only from the verified access context, never from
    // caller-supplied headers/body fields — normalizeGatewayToolRequest would
    // otherwise trust orgId/actorId/actorRole asserted by anyone.
    const gatewayRequest = normalizeGatewayToolRequest(
      {
        ...body,
        orgId: access.orgId,
        actorId: access.userId ?? access.agentId,
        actorRole: access.role,
      },
      new Headers(),
    );
    const result = await createMonitorPlanCheck(gatewayRequest);

    return NextResponse.json(result, { status: statusForDecision(result.decision) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        decision: 'block',
        reason: error instanceof Error ? 'Internal server error' : 'gateway_plan_check_error',
      },
      { status: 500 }
    );
  }
}
