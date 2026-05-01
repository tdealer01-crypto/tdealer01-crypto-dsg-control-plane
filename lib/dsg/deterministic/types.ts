export type DeterministicProofStatus = 'PASS' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED';
export type DeterministicSolverName = 'z3' | 'rule_engine' | 'static_check' | 'none';
export type DeterministicGateStatus = 'PASS' | 'BLOCK' | 'REVIEW';
export type DeterministicRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type DeterministicFailureReason = {
  code: string;
  message: string;
  constraintId?: string;
  severity: DeterministicRiskLevel;
};

export type DeterministicConstraintResult = {
  constraintId: string;
  name: string;
  passed: boolean;
  severity: DeterministicRiskLevel;
  evidenceKey: string;
  message: string;
};

export type DeterministicProof = {
  proofId: string;
  status: DeterministicProofStatus;
  timestamp: string;
  solver: {
    name: DeterministicSolverName;
    version: string;
  };
  policyRef: string;
  policyVersion: string;
  constraintsChecked: number;
  inputHash: string;
  constraintSetHash: string;
  proofHash: string;
  previousProofHash?: string;
  model?: Record<string, unknown>;
  failureReasons: DeterministicFailureReason[];
  constraints: DeterministicConstraintResult[];
  evidenceBoundary: {
    statement: string;
    externalSolverInvoked: boolean;
    productionReadyClaim: boolean;
  };
};

export type DeterministicProofRequest = {
  planId?: string;
  policyRef?: string;
  policyVersion?: string;
  riskLevel?: DeterministicRiskLevel;
  previousProofHash?: string;
  context: Record<string, unknown>;
};

export type DeterministicGateDecision = {
  ok: boolean;
  gateStatus: DeterministicGateStatus;
  proofStatus: DeterministicProofStatus;
  riskLevel: DeterministicRiskLevel;
  reason?: string;
  proof: DeterministicProof;
};
