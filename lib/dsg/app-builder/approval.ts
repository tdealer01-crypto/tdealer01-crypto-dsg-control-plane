import type {
  AppBuilderApprovalDecision,
  AppBuilderApprovedPlan,
  AppBuilderGateResult,
  AppBuilderProposedPlan,
} from './model';
import { hashAppBuilderObject } from './hash';

export function createAppBuilderPlanHash(input: {
  proposedPlan: AppBuilderProposedPlan;
  gateResult: AppBuilderGateResult;
}): string {
  return hashAppBuilderObject({
    proposedPlan: input.proposedPlan,
    gateResult: input.gateResult,
  });
}

export function createAppBuilderApprovalHash(input: {
  planHash: string;
  approvedBy: string;
  approvedAt: string;
  decision: 'APPROVE';
}): string {
  return hashAppBuilderObject(input);
}

export function approveAppBuilderPlan(input: {
  proposedPlan: AppBuilderProposedPlan;
  gateResult: AppBuilderGateResult;
  decision: AppBuilderApprovalDecision;
  actorId: string;
}): AppBuilderApprovedPlan {
  if (input.decision !== 'APPROVE') {
    throw new Error('APP_BUILDER_PLAN_NOT_APPROVED');
  }

  if (input.gateResult.status === 'BLOCK') {
    throw new Error('APP_BUILDER_GATE_BLOCKED');
  }

  const approvedAt = new Date().toISOString();
  const decision = 'APPROVE';
  const planHash = createAppBuilderPlanHash(input);
  const approvalHash = createAppBuilderApprovalHash({
    planHash,
    approvedBy: input.actorId,
    approvedAt,
    decision,
  });

  return {
    proposedPlan: input.proposedPlan,
    gateResult: input.gateResult,
    planHash,
    approvalHash,
    approvedBy: input.actorId,
    approvedAt,
    decision,
  };
}
