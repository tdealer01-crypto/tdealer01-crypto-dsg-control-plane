import { NextRequest, NextResponse } from 'next/server';
import { runCodeEvolution } from '@/skills/code-evolution/skill';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, workspaceId, goal, planApproved, isDestructiveWrite, destructionProof } = body as {
      jobId: string;
      workspaceId: string;
      goal: string;
      planApproved: boolean;
      isDestructiveWrite?: boolean;
      destructionProof?: boolean;
    };

    if (!jobId || !workspaceId || !goal) {
      return NextResponse.json({ error: 'jobId, workspaceId, goal required' }, { status: 400 });
    }

    const result = await runCodeEvolution({ jobId, workspaceId, goal, planApproved: planApproved ?? false, isDestructiveWrite, destructionProof });
    return NextResponse.json({ ok: result.ok, data: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    agent: 'code-evolution',
    description: 'Writes code with approved plan. Seeded with real codebase state.',
    truthBoundary: 'Creates PR evidence only. CI and deployment proof are separate.',
  });
}
