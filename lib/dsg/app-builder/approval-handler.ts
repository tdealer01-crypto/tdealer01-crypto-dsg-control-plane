import { approveAppBuilderPlan } from './approval';
import type { AppBuilderApprovalDecision } from './status';
import type { AppBuilderRepositoryContext } from '../server/repositories/app-builder-repository';
import {
  getAppBuilderJob,
  recordAppBuilderApproval,
} from '../server/repositories/app-builder-repository';

export async function handleAppBuilderApproval(
  repoCtx: AppBuilderRepositoryContext,
  input: { jobId: string; decision: AppBuilderApprovalDecision; reason?: string },
) {
  const job = await getAppBuilderJob(repoCtx, input.jobId);

  if (!job.proposedPlan) throw new Error('APP_BUILDER_PLAN_REQUIRED');
  if (!job.gateResult) throw new Error('APP_BUILDER_GATE_RESULT_REQUIRED');
  if (job.gateResult.status === 'BLOCK' && input.decision === 'APPROVE') {
    throw new Error('APP_BUILDER_GATE_BLOCKED');
  }

  const approvedPlan = input.decision === 'APPROVE'
    ? approveAppBuilderPlan({
        proposedPlan: job.proposedPlan,
        gateResult: job.gateResult,
        decision: input.decision,
        actorId: repoCtx.actorId,
      })
    : undefined;

  return recordAppBuilderApproval(repoCtx, {
    jobId: input.jobId,
    decision: input.decision,
    reason: input.reason,
    approvedPlan,
    gateResult: job.gateResult,
  });
}
