import { NextRequest, NextResponse } from 'next/server';
import { runDeployMonitor } from '@/skills/deploy-monitor/skill';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, workspaceId, deploymentUrl, gateAllow, mockState } = body as {
      jobId: string;
      workspaceId: string;
      deploymentUrl: string;
      gateAllow: boolean;
      mockState?: boolean;
    };

    if (!jobId || !workspaceId || !deploymentUrl) {
      return NextResponse.json({ error: 'jobId, workspaceId, deploymentUrl required' }, { status: 400 });
    }

    const result = await runDeployMonitor({ jobId, workspaceId, deploymentUrl, gateAllow: gateAllow ?? false, mockState });
    return NextResponse.json({ ok: result.ok, data: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    agent: 'deploy-monitor',
    description: 'Watches Vercel. Triggers deploy only after gate_allow + evidence + no mock_state.',
    truthBoundary: 'Never claims production-ready without deployment proof hash.',
  });
}
