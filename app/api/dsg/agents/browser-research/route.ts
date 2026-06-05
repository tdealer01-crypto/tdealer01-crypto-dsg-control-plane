import { NextRequest, NextResponse } from 'next/server';
import { runBrowserResearch } from '@/skills/browser-research/skill';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, workspaceId, researchQuery, targetUrl } = body as {
      jobId: string;
      workspaceId: string;
      researchQuery: string;
      targetUrl?: string;
    };

    if (!jobId || !workspaceId || !researchQuery) {
      return NextResponse.json({ error: 'jobId, workspaceId, researchQuery required' }, { status: 400 });
    }

    const result = await runBrowserResearch({ jobId, workspaceId, researchQuery, targetUrl });
    return NextResponse.json({ ok: result.ok, data: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    agent: 'browser-research',
    description: 'Browser research with SHA256 evidence. No hash = BLOCK.',
    truthBoundary: 'All browser results carry tamper-evident hashes stored in dsg_evidence_items.',
  });
}
