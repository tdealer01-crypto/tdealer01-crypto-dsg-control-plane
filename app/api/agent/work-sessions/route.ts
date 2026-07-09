// ERROR_HANDLER_EXEMPT: Work session endpoint returns structured JSON and does not throw raw errors.
import { NextRequest, NextResponse } from 'next/server';
import { buildWorkSessionPlan } from '@/lib/agent/work-session';

export const dynamic = 'force-dynamic';

const globalForWorkSessions = globalThis as typeof globalThis & {
  __dsgWorkSessionPlans?: Map<string, ReturnType<typeof buildWorkSessionPlan>>;
};

function plans() {
  if (!globalForWorkSessions.__dsgWorkSessionPlans) globalForWorkSessions.__dsgWorkSessionPlans = new Map();
  return globalForWorkSessions.__dsgWorkSessionPlans;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(request: NextRequest) {
  const body = asRecord(await request.json().catch(() => null));
  const goal = typeof body.goal === 'string' ? body.goal : typeof body.message === 'string' ? body.message : '';
  const actorId = typeof body.actorId === 'string' ? body.actorId : 'owner';
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId : 'android.owner.default';

  try {
    const plan = buildWorkSessionPlan({ goal, actorId, deviceId, sourceKind: 'chat' });
    plans().set(plan.sessionId, plan);
    return NextResponse.json({
      ok: true,
      plan,
      next: 'Owner approves this plan once on the device, then the agent runs allowed steps until done or blocked.',
    }, { status: 201 });
  } catch (error) {
    console.error('[work-sessions] Plan creation failed:', error instanceof Error ? error.stack : error);
    return NextResponse.json({
      ok: false,
      error: 'WORK_SESSION_PLAN_FAILED',
      message: 'Could not create work session plan',
    }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (sessionId) {
    const plan = plans().get(sessionId);
    return NextResponse.json({ ok: Boolean(plan), plan: plan ?? null }, { status: plan ? 200 : 404 });
  }
  return NextResponse.json({
    ok: true,
    count: plans().size,
    plans: Array.from(plans().values()).slice(-20),
  });
}
