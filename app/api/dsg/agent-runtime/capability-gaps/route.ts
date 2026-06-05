import { NextResponse } from 'next/server';
import { resolveAgentCapabilityGap } from '@/lib/dsg/agent-runtime/capability-gap-resolver';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as {
    requestedAction?: string;
    currentCapability?: string;
    userBenefit?: string;
    evidenceRequired?: string[];
  } | null;

  if (!body?.requestedAction) {
    return NextResponse.json({ ok: false, error: { message: 'REQUESTED_ACTION_REQUIRED' } }, { status: 400 });
  }

  try {
    return NextResponse.json({
      ok: true,
      data: resolveAgentCapabilityGap({
        requestedAction: body.requestedAction,
        currentCapability: body.currentCapability,
        userBenefit: body.userBenefit,
        evidenceRequired: body.evidenceRequired,
      }),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: { message: error instanceof Error ? error.message : 'CAPABILITY_GAP_RESOLUTION_FAILED' },
    }, { status: 400 });
  }
}
