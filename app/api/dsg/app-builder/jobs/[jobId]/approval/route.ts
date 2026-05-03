import { NextResponse } from 'next/server';
import { handleAppBuilderApproval } from '@/lib/dsg/app-builder/approval-handler';
import { getAppBuilderDb, getDevSmokeAppBuilderContext } from '@/lib/dsg/app-builder/server-context';

export async function POST(
  req: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await context.params;
    const body = await req.json();
    const ctx = getDevSmokeAppBuilderContext(req);
    const db = getAppBuilderDb();
    const data = await handleAppBuilderApproval({ db, ...ctx }, { jobId, ...body });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: error instanceof Error ? error.message : 'APP_BUILDER_APPROVAL_FAILED' } },
      { status: 400 },
    );
  }
}
