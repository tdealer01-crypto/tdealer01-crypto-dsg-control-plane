export type DsgPlanGateStatus = 'PASS' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED';
export type DsgPlanRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DsgPlanActionType =
  | 'read_file'
  | 'write_file'
  | 'run_command'
  | 'call_api'
  | 'deploy'
  | 'create_database'
  | 'change_permission'
  | 'charge_payment';

export type DsgPlanAction = {
  id: string;
  label: string;
  type: DsgPlanActionType;
  risk: DsgPlanRiskLevel;
  wave: number;
  dependsOn: string[];
  reads: string[];
  writes: string[];
  command?: string;
  requiredSecrets: string[];
  approved: boolean;
};

export type DsgPlanDraft = {
  jobId: string;
  workspaceId: string;
  goalLocked: boolean;
  planExists: boolean;
  allowedPaths: string[];
  allowedCommands: string[];
  availableSecrets: string[];
  actions: DsgPlanAction[];
  claimBoundary: {
    claimStatus: 'PLAN_DRAFT_ONLY';
    productionReadyClaim: false;
    runtimeExecutionReady: false;
  };
};

export type DsgPlanObserverReason = {
  code: string;
  message: string;
  actionId?: string;
  details?: Record<string, unknown>;
};

export type DsgPlanObserverResult = {
  gateName: 'PLAN_FEASIBILITY_OBSERVER';
  status: DsgPlanGateStatus;
  pass: boolean;
  z3RuntimeProof: false;
  observerMode: 'typescript_precheck_from_z3_contract';
  reasons: DsgPlanObserverReason[];
  summary: {
    jobId: string;
    workspaceId: string;
    actions: number;
    waves: number[];
    blockedReasons: number;
  };
};
