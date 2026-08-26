export const AGENTIC_ORG_SCHEMA_VERSION = 'dsg-agentic-improvement-v1' as const;

export type EvidenceKind =
  | 'commit'
  | 'workflow_run'
  | 'test_output'
  | 'build_output'
  | 'contract_check'
  | 'observation'
  | 'metric'
  | 'candidate'
  | 'proof'
  | 'pr'
  | 'deployment'
  | 'replay';

export interface EvidenceRef {
  kind: EvidenceKind;
  uri: string;
  sha256?: string;
  repository?: string;
  commitSha?: string;
}

export interface MetricValue {
  name: string;
  value: number;
  unit?: string;
  direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
}

export interface ImprovementCandidateEnvelope {
  schemaVersion: typeof AGENTIC_ORG_SCHEMA_VERSION;
  candidateId: string;
  goalId: string;
  approvedPlanHash: string;
  targetRepository: string;
  baselineCommit: string;
  candidateCommit: string;
  allowedPaths: string[];
  baselineMetric: MetricValue;
  candidateMetric: MetricValue;
  constraintsPassed: boolean;
  planAligned: boolean;
  testsPassed: boolean;
  buildPassed: boolean;
  evidence: EvidenceRef[];
  simulationHash?: string;
  candidateAuthority: 'SIMULATION_ONLY';
  promotionAuthority: 'DSG_CONTROL_PLANE';
  selfPromotionAllowed: false;
  cinemaProof?: {
    proofId: string;
    proofHash: string;
    verified: boolean;
    verification: 'VERIFIED_ENVELOPE_BINDING' | 'VERIFIED_RAW_EVIDENCE';
    rawEvidenceVerified: boolean;
    boundCandidateCommit: string;
  };
  requestedPromotion: 'PR' | 'DEPLOY';
}

export type PromotionVerdict = 'ALLOW' | 'BLOCK' | 'REVIEW';

export interface PromotionGateFailure {
  code:
    | 'SCHEMA_VERSION_MISMATCH'
    | 'PLAN_HASH_MISSING'
    | 'COMMIT_BINDING_MISSING'
    | 'SAME_BASELINE_AND_CANDIDATE'
    | 'PATH_SCOPE_MISSING'
    | 'PLAN_MISMATCH'
    | 'CONSTRAINTS_FAILED'
    | 'TESTS_FAILED'
    | 'BUILD_FAILED'
    | 'METRIC_REGRESSION'
    | 'EVIDENCE_INCOMPLETE'
    | 'SELF_PROMOTION_AUTHORITY_INVALID'
    | 'CINEMA_PROOF_MISSING'
    | 'CINEMA_PROOF_INVALID'
    | 'CINEMA_COMMIT_MISMATCH'
    | 'CINEMA_RAW_EVIDENCE_REQUIRED';
  message: string;
}

export interface PromotionGateResult {
  verdict: PromotionVerdict;
  failures: PromotionGateFailure[];
  metricDelta: number;
  evaluatedAt: string;
  schemaVersion: typeof AGENTIC_ORG_SCHEMA_VERSION;
}
