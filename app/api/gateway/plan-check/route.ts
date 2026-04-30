import { NextResponse } from 'next/server';
import { createMonitorPlanCheck } from '../../../../lib/gateway/monitor';
import { normalizeGatewayToolRequest } from '../../../../lib/gateway/executor';

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
    const body = await request.json().catch(() => ({}));
    const gatewayRequest = normalizeGatewayToolRequest(body, request.headers);
    const result = await createMonitorPlanCheck(gatewayRequest);

    return NextResponse.json(result, { status: statusForDecision(result.decision) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        decision: 'block',
        reason: error instanceof Error ? error.message : 'gateway_plan_check_error',
      },
      { status: 500 }
    );
  }
}
