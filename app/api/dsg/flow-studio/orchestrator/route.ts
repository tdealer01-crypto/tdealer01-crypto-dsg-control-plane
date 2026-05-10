import { NextResponse } from 'next/server';
import { createFlowStudioPlan } from '@/lib/dsg/flow-studio/orchestrator';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { goal?: unknown } | null;
    const goal = typeof body?.goal === 'string' ? body.goal.trim() : '';
    if (!goal) return NextResponse.json({ ok: false, error: { code: 'FLOW_STUDIO_GOAL_REQUIRED' } }, { status: 400 });
    if (goal.length > 2000) return NextResponse.json({ ok: false, error: { code: 'FLOW_STUDIO_GOAL_TOO_LONG' } }, { status: 400 });

    const data = await createFlowStudioPlan(goal);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FLOW_STUDIO_ORCHESTRATOR_FAILED';
    return NextResponse.json({ ok: false, error: { code: message, message } }, { status: 500 });
  }
}
