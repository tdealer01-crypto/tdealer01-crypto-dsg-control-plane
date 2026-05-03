import { NextResponse } from 'next/server';
import { createDeterministicAppBuilderPrd } from '@/lib/dsg/app-builder/prd-generator';
import { createAppBuilderProposedPlan } from '@/lib/dsg/app-builder/plan-generator';
import { gateAppBuilderPlan } from '@/lib/dsg/app-builder/gate';
import { getAppBuilderDb, getDevSmokeAppBuilderContext } from '@/lib/dsg/app-builder/server-context';
import {
  attachAppBuilderPlan,
  getAppBuilderJob,
} from '@/lib/dsg/server/repositories/app-builder-repository';

export async function POST(
  req: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await context.params;
    const ctx = getDevSmokeAppBuilderContext(req);
    const db = getAppBuilderDb();
    const repoCtx = { db, ...ctx };
    const job = await getAppBuilderJob(repoCtx, jobId);

    if (!job.goal) throw new Error('APP_BUILDER_GOAL_NOT_LOCKED');

    const prd = job.prd ?? createDeterministicAppBuilderPrd(job.goal);
    const proposedPlan = createAppBuilderProposedPlan({ goal: job.goal, prd });
    const gateResult = gateAppBuilderPlan(proposedPlan);
    const data = await attachAppBuilderPlan(repoCtx, {
      jobId,
      prd,
      proposedPlan,
      gateResult,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: error instanceof Error ? error.message : 'APP_BUILDER_PLAN_FAILED' } },
      { status: 400 },
    );
  }
}
