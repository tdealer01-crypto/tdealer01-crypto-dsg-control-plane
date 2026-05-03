export const appBuilderStatuses = [
  'DRAFT',
  'GOAL_LOCKED',
  'PRD_READY',
  'PLAN_READY',
  'WAITING_APPROVAL',
  'APPROVED',
  'READY_FOR_RUNTIME',
  'REJECTED',
  'BLOCKED',
  'FAILED',
  'COMPLETED',
] as const;

export type AppBuilderJobStatus = (typeof appBuilderStatuses)[number];

export const appBuilderClaimStatuses = [
  'NOT_STARTED',
  'PLANNED_ONLY',
  'APPROVED_ONLY',
  'PREVIEW_READY',
  'DEPLOYABLE',
  'PRODUCTION_BLOCKED',
  'PRODUCTION_VERIFIED',
] as const;

export type AppBuilderClaimStatus = (typeof appBuilderClaimStatuses)[number];

export const appBuilderRiskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export type AppBuilderRiskLevel = (typeof appBuilderRiskLevels)[number];

export const appBuilderApprovalDecisions = [
  'APPROVE',
  'REJECT',
  'REQUEST_CHANGES',
] as const;

export type AppBuilderApprovalDecision =
  (typeof appBuilderApprovalDecisions)[number];
