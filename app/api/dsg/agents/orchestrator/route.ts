import { NextRequest, NextResponse } from 'next/server';
import { runOrchestrator } from '@/skills/orchestrator/skill';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, workspaceId, goal, goalLocked, subGoals } = body as {
      jobId: string;
      workspaceId: string;
      goal: string;
      goalLocked: boolean;
      subGoals: Array<{ agentType: string; goal: string }>;
    };

    if (!jobId || !workspaceId || !goal) {
      return NextResponse.json({ error: 'jobId, workspaceId, goal required' }, { status: 400 });
    }

    const result = await runOrchestrator({ jobId, workspaceId, goal, goalLocked: goalLocked ?? false, subGoals: subGoals ?? [] });
    return NextResponse.json({ ok: result.ok, data: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    agent: 'orchestrator',
    description: 'Coordinates all agents. Requires goal_locked before dispatch.',
    truthBoundary: 'Manages dispatch order only. Does not execute code or deploy.',
  });
}
