import type { DsgPlanDraft, DsgPlanObserverResult } from '@/lib/dsg/app-builder/plan/types';

export type DsgAppBuilderApprovalStatus = 'APPROVABLE' | 'BLOCKED' | 'REVIEW';

export type DsgAppBuilderApprovalGate = {
  status: DsgAppBuilderApprovalStatus;
  pass: boolean;
  approvalRequired: boolean;
  approved: boolean;
  reasons: Array<{
    code: string;
    message: string;
    actionId?: string;
  }>;
  summary: {
    totalActions: number;
    highRiskActions: number;
    blockedReasons: number;
  };
};

export type DsgRuntimeHandoffDraft = {
  ready: boolean;
  status: 'RUNTIME_HANDOFF_READY' | 'RUNTIME_HANDOFF_BLOCKED';
  jobId: string;
  workspaceId: string;
  planHash: string;
  approvalHash: string;
  allowedActions: string[];
  blockedActions: string[];
  claimBoundary: {
    claimStatus: 'RUNTIME_HANDOFF_DRAFT_ONLY';
    runtimeExecutionStarted: false;
    productionReadyClaim: false;
  };
};

export type DsgApprovalHandoffResult = {
  ok: true;
  approvalGate: DsgAppBuilderApprovalGate;
  handoff: DsgRuntimeHandoffDraft;
  plan: DsgPlanDraft;
  observer: DsgPlanObserverResult;
};
