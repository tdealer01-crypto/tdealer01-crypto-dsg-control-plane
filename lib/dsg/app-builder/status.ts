export type AppBuilderJobStatus =
  | 'DRAFT'
  | 'GOAL_LOCKED'
  | 'PRD_READY'
  | 'PLAN_READY'
  | 'WAITING_APPROVAL'
  | 'APPROVED'
  | 'READY_FOR_RUNTIME'
  | 'ENVIRONMENT_READY'
  | 'EXECUTING'
  | 'PR_CREATED'
  | 'REJECTED'
  | 'BLOCKED'
  | 'FAILED'
  | 'COMPLETED';

export type AppBuilderClaimStatus =
  | 'NOT_STARTED'
  | 'PLANNED_ONLY'
  | 'APPROVED_ONLY'
  | 'ENVIRONMENT_READY'
  | 'IMPLEMENTED_UNVERIFIED'
  | 'PREVIEW_READY'
  | 'DEPLOYABLE'
  | 'PRODUCTION_BLOCKED'
  | 'PRODUCTION_VERIFIED';

export type AppBuilderRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AppBuilderApprovalDecision = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
export type AppBuilderGateStatus = 'PASS' | 'REVIEW' | 'BLOCK';