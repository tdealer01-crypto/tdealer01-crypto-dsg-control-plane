import { NextResponse } from 'next/server';
import { createAppBuilderRuntimeHandoff } from '@/lib/dsg/app-builder/runtime-handoff';
import { getAppBuilderDb, getAuthorizedAppBuilderContext } from '@/lib/dsg/app-builder/server-context';
import { getAppBuilderJob } from '@/lib/dsg/server/repositories/app-builder-repository';

export async function POST(
  req: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await context.params;
    const ctx = getAuthorizedAppBuilderContext(req);
    const db = getAppBuilderDb();
    const job = await getAppBuilderJob({ db, ...ctx }, jobId);
    const data = createAppBuilderRuntimeHandoff(job);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: error instanceof Error ? 'Internal server error' : 'APP_BUILDER_RUNTIME_HANDOFF_FAILED' } },
      { status: 400 },
    );
  }
}
