import type { AppBuilderJob } from './model';
import { createAppBuilderPlanHash } from './approval';

export type AppBuilderRuntimeHandoff = {
  appBuilderJobId: string;
  workspaceId: string;
  planHash: string;
  approvalHash: string;
  allowedTools: string[];
  allowedPaths: string[];
  allowedCommands: string[];
  requiredSecrets: string[];
  runtimeStatus: 'READY_FOR_RUNTIME';
};

export function createAppBuilderRuntimeHandoff(
  job: AppBuilderJob,
): AppBuilderRuntimeHandoff {
  if (job.status !== 'READY_FOR_RUNTIME') {
    throw new Error('APP_BUILDER_JOB_NOT_READY_FOR_RUNTIME');
  }

  if (!job.approvedPlan) {
    throw new Error('APP_BUILDER_APPROVED_PLAN_REQUIRED');
  }

  const approvedPlan = job.approvedPlan;
  const recomputedPlanHash = createAppBuilderPlanHash({
    proposedPlan: approvedPlan.proposedPlan,
    gateResult: approvedPlan.gateResult,
  });

  if (recomputedPlanHash !== approvedPlan.planHash) {
    throw new Error('APP_BUILDER_PLAN_HASH_MISMATCH');
  }

  if (job.planHash && job.planHash !== approvedPlan.planHash) {
    throw new Error('APP_BUILDER_JOB_PLAN_HASH_MISMATCH');
  }

  if (job.approvalHash && job.approvalHash !== approvedPlan.approvalHash) {
    throw new Error('APP_BUILDER_JOB_APPROVAL_HASH_MISMATCH');
  }

  return {
    appBuilderJobId: job.id,
    workspaceId: job.workspaceId,
    planHash: approvedPlan.planHash,
    approvalHash: approvedPlan.approvalHash,
    allowedTools: approvedPlan.proposedPlan.allowedTools,
    allowedPaths: approvedPlan.proposedPlan.allowedPaths,
    allowedCommands: approvedPlan.proposedPlan.allowedCommands,
    requiredSecrets: approvedPlan.proposedPlan.requiredSecrets,
    runtimeStatus: 'READY_FOR_RUNTIME',
  };
}
