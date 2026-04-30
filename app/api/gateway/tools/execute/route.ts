import { NextResponse } from 'next/server';
import { executeGatewayTool, normalizeGatewayToolRequest } from '../../../../../lib/gateway/executor';

export const dynamic = 'force-dynamic';

function statusForDecision(result: Awaited<ReturnType<typeof executeGatewayTool>>) {
  if (result.ok) {
    return 200;
  }

  if (result.decision === 'review' || result.decision === 'ask_more_info') {
    return 202;
  }

  if (result.reason === 'plan_not_entitled') {
    return 402;
  }

  if (result.reason === 'missing_org_id' || result.reason === 'missing_actor_id' || result.reason === 'missing_actor_role' || result.reason === 'missing_org_plan') {
    return 400;
  }

  if (result.reason === 'role_not_allowed') {
    return 403;
  }

  if (result.reason === 'tool_not_registered' || result.reason === 'tool_action_mismatch') {
    return 404;
  }

  return 502;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const gatewayRequest = normalizeGatewayToolRequest(body, request.headers);
    const result = await executeGatewayTool(gatewayRequest);

    return NextResponse.json(result, { status: statusForDecision(result) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        decision: 'block',
        reason: error instanceof Error ? error.message : 'gateway_execution_error',
      },
      { status: 500 }
    );
  }
}
