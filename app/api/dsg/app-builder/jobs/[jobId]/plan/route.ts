import { NextResponse } from 'next/server';
import { createDeterministicAppBuilderPrd } from '@/lib/dsg/app-builder/prd-generator';
import { createAppBuilderProposedPlan } from '@/lib/dsg/app-builder/plan-generator';
import { gateAppBuilderPlan } from '@/lib/dsg/app-builder/gate';
import { gateAppBuilderExternalEvidence } from '@/lib/dsg/app-builder/external-evidence-gate';
import { getAppBuilderRequestContext } from '@/lib/dsg/server/app-builder/context';
import { getAppBuilderJob, updateAppBuilderJob } from '@/lib/dsg/server/app-builder/repository';

function fail(error: unknown) {
  const code = error instanceof Error ? error.message : 'APP_BUILDER_PLAN_FAILED';
  const status = code.startsWith('DSG_') ? 401 : 400;
  return NextResponse.json({ ok: false, error: { code, message: code } }, { status });
}

export async function POST(req: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;
    const ctx = await getAppBuilderRequestContext(req, 'job:plan');
    const job = await getAppBuilderJob(ctx, jobId);
    if (!job.goal) throw new Error('APP_BUILDER_GOAL_NOT_LOCKED');

    const externalEvidenceGate = await gateAppBuilderExternalEvidence(job);
    if (externalEvidenceGate.status === 'BLOCK') {
      await updateAppBuilderJob({
        ctx,
        id: jobId,
        patch: {
          status: 'BLOCKED',
          claim_status: 'NOT_STARTED',
          metadata: {
            ...(job.metadata ?? {}),
            externalEvidenceGate,
            externalEvidenceGatedAt: new Date().toISOString(),
          },
        },
      });
      throw new Error('APP_BUILDER_EXTERNAL_EVIDENCE_REQUIRED');
    }

    const prd = job.prd ?? createDeterministicAppBuilderPrd(job.goal);
    const proposedPlan = createAppBuilderProposedPlan({ goal: job.goal, prd });
    const gateResult = gateAppBuilderPlan(proposedPlan);
    const status = gateResult.status === 'BLOCK' ? 'BLOCKED' : gateResult.approvalRequired ? 'WAITING_APPROVAL' : 'PLAN_READY';

    const updated = await updateAppBuilderJob({
      ctx,
      id: jobId,
      patch: {
        status,
        claim_status: 'PLANNED_ONLY',
        prd,
        proposed_plan: proposedPlan,
        gate_result: gateResult,
        metadata: {
          ...(job.metadata ?? {}),
          externalEvidenceGate,
          externalEvidenceGatedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return fail(error);
  }
}
