export type DeterministicProofStatus = 'PASS' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED';
export type DeterministicSolverName = 'z3' | 'rule_engine' | 'static_check' | 'none';

// Canonical DSG gate output intentionally excludes UNSUPPORTED.
// UNSUPPORTED can appear in a proof, but the gate must convert it to REVIEW or BLOCK.
export type DeterministicGateStatus = 'PASS' | 'BLOCK' | 'REVIEW';
export type DeterministicRiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Compatibility aliases for the uploaded ZIP/UI vocabulary.
export type ProofStatus = DeterministicProofStatus;
export type GateStatus = DeterministicGateStatus;
export type LegacyZipGateStatus = DeterministicProofStatus;

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

export type DeterministicReplayProtection = {
  nonce: string;
  idempotencyKey: string;
  requestHash: string;
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
  replayProtection: DeterministicReplayProtection;
  model?: Record<string, unknown>;
  failureReasons: DeterministicFailureReason[];
  constraints: DeterministicConstraintResult[];
  evidenceBoundary: {
    statement: string;
    externalSolverInvoked: boolean;
    productionReadyClaim: boolean;
  };
};

// Original ZIP proof shape. Kept for adapter/UI migration only.
// Canonical DSG proof should use DeterministicProof above.
export interface LegacyZipDeterministicProof {
  status: ProofStatus;
  timestamp: string;
  solverVersion: string;
  constraintsChecked: number;
  model?: Record<string, string>;
  failureReasons: string[];
  hashChain: string;
}

export type AuditDecision = 'allow' | 'deny' | 'review' | 'block';
export type ResourceClassification = 'public' | 'internal' | 'secret' | 'top_secret';

export interface DeterministicAuditEntry {
  entryId: string;
  timestamp: string;
  action: string;
  actor: {
    userId: string;
    sessionId: string;
    ipAddress: string;
    deviceFingerprint: string;
    role: string;
  };
  resource: {
    type: string;
    id: string;
    classification: ResourceClassification;
  };
  decision: AuditDecision;
  policyRef: string;
  policyVersion: string;
  proofHash: string;
  previousHash: string;
  currentHash: string;
  signature: string;
  metadata?: Record<string, unknown>;
}

// Original ZIP audit shape. Kept for adapter/UI migration only.
// z3ProofHash should be renamed to proofHash when written into DSG evidence.
export interface LegacyZipAuditEntry {
  entryId: string;
  timestamp: string;
  action: string;
  actor: {
    userId: string;
    sessionId: string;
    ipAddress: string;
    deviceFingerprint: string;
    role: string;
  };
  resource: {
    type: string;
    id: string;
    classification: ResourceClassification;
  };
  decision: AuditDecision;
  policyRef: string;
  z3ProofHash: string;
  previousHash: string;
  currentHash: string;
  signature: string;
}

export type DeterministicProofRequest = {
  planId?: string;
  policyRef?: string;
  policyVersion?: string;
  riskLevel?: DeterministicRiskLevel;
  previousProofHash?: string;
  nonce: string;
  idempotencyKey: string;
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
