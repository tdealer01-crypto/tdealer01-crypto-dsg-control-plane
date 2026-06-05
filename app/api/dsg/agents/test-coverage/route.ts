import { NextRequest, NextResponse } from 'next/server';
import { runTestCoverage } from '@/skills/test-coverage/skill';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, workspaceId, previousCoveragePct, currentCoveragePct, threshold } = body as {
      jobId: string;
      workspaceId: string;
      previousCoveragePct: number;
      currentCoveragePct: number;
      threshold?: number;
    };

    if (!jobId || !workspaceId || previousCoveragePct === undefined || currentCoveragePct === undefined) {
      return NextResponse.json({ error: 'jobId, workspaceId, previousCoveragePct, currentCoveragePct required' }, { status: 400 });
    }

    const result = await runTestCoverage({ jobId, workspaceId, previousCoveragePct, currentCoveragePct, threshold });
    return NextResponse.json({ ok: result.ok, data: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    agent: 'test-coverage',
    description: 'Monitors coverage. Z3 enforces coverage is monotonically non-decreasing.',
    truthBoundary: 'Coverage monotonicity is verified by Z3. Cannot claim full coverage without proof.',
  });
}
