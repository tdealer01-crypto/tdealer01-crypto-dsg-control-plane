import type {
  SecurityExecutionRisk,
  SecuritySeverity,
} from '@/lib/dsg/security-remediation/types';

export const VERIFIED_REPAIR_SCHEMA = 'dsg.verified-repair.v1' as const;

export type RepairSolverMode = 'pinned' | 'live';
export type RepairValidationProfile = 'none' | 'fast' | 'full';
export type VerifiedRepairStatus =
  | 'READY_FOR_CONTROLLED_EXECUTION'
  | 'VERIFIED_IN_SIMULATION'
  | 'BLOCKED';

export type RepairEvidenceType =
  | 'finding'
  | 'scan_output'
  | 'test_output'
  | 'file_snapshot'
  | 'api_response'
  | 'manual_note';

export interface RepairEvidenceRef {
  id: string;
  type: RepairEvidenceType;
  contentHash: string;
  summary?: string;
}
export interface RepairFinding {
  id: string;
  summary: string;
  severity: SecuritySeverity;
  executionRisk: SecurityExecutionRisk;
  affectedFiles: string[];
  affectedLines?: Array<{
    file: string;
    start: number;
    end: number;
  }>;
  evidence: RepairEvidenceRef[];
  reported?: boolean;
}

/**
 * A candidate is an exact, text-addressed change. The simulator never accepts
 * a free-form shell command or an unbounded diff as an executable repair.
 */
export interface RepairCandidate {
  id: string;
  changeGroup: string;
  file: string;
  expected: string;
  replacement: string;
  rationale: string;
  score?: number;
  conflictsWith?: string[];
  requires?: string[];
  touchesSensitive?: boolean;
}

export interface RepairSolverConfig {
  mode?: RepairSolverMode;
  seed?: number;
  timeoutMs?: number;
}

export interface RepairApprovals {
  human?: boolean;
  security?: boolean;
}

export interface VerifiedRepairRequest {
  jobId: string;
  actorId?: string;
  source?: 'api' | 'mcp' | 'cli' | 'test';
  createdAt?: string;

  finding: RepairFinding;
  candidates: RepairCandidate[];
  allowedFiles: string[];
  approvals?: RepairApprovals;
  solver?: RepairSolverConfig;

  /**
   * When true, run the selected plan in a disposable git worktree. The base
   * checkout is never modified by this feature.
   */
  execute?: boolean;
  repoRoot?: string;
  baseCommit?: string;
  validationProfile?: RepairValidationProfile;
}

export interface RepairQuboSummary {
  problemHash: string;
  variableCount: number;
  constraintCount: number;
  groups: string[];
  candidateOrder: string[];
}

export interface RepairSolverResult {
  mode: 'deterministic-local' | 'nvidia-live';
  solverVersion: string;
  solution: Record<string, number>;
  energy: number;
  confidence?: number;
  solveTimeMs: number;
  quboHash: string;
  solutionHash: string;
  replayHash?: string;
}

export type RepairExactStatus = 'sat' | 'unsat' | 'timeout' | 'error';

export interface RepairExactVerification {
  status: RepairExactStatus;
  valid: boolean;
  proof: string;
  proofHash: string;
  z3Version: string;
  verifyTimeMs: number;
  constraints: string[];
  counterexample: string[];
}

export interface RepairValidationResult {
  name: 'diff' | 'typecheck' | 'unit' | 'build' | 'security';
  ok: boolean;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  outputHash: string;
  outputBytes: number;
  summary: string;
}

export interface RepairExecutionResult {
  controlledExecutorUsed: boolean;
  patchApplied: boolean;
  baseCommit: string;
  worktreeCommit: string;
  changedFiles: string[];
  diffHash: string;
  diffBytes: number;
  validations: RepairValidationResult[];
  cleanupOk: boolean;
  error?: string;
}

export interface VerifiedRepairEvidencePack {
  schema: typeof VERIFIED_REPAIR_SCHEMA;
  jobId: string;
  source: 'api' | 'mcp' | 'cli' | 'test';
  findingHash: string;
  planHash: string;
  qubo: RepairQuboSummary;
  selectedCandidateIds: string[];
  solver: RepairSolverResult;
  exactVerification: RepairExactVerification;
  validation: RepairValidationResult[];
  evidenceIds: string[];
  evidenceManifest: {
    id: string;
    manifestHash: string;
    status: 'COMPLETE' | 'BLOCKED';
  };
  audit: {
    entryIds: string[];
    chainValid: boolean;
  };
  replay: {
    status: 'PASS' | 'BLOCK' | 'FAILED';
    replayHash: string;
    errors: string[];
  };
  determinism: {
    status: 'PASS' | 'REVIEW';
    proofHash?: string;
    reason?: string;
  };
}

export interface VerifiedRepairResult {
  schema: typeof VERIFIED_REPAIR_SCHEMA;
  jobId: string;
  status: VerifiedRepairStatus;
  verdict: 'PASS' | 'REVIEW' | 'BLOCK';
  planningOnly: boolean;
  selectedCandidateIds: string[];
  gate: {
    finalDecision: string;
    allowed: boolean;
    claimAllowed: boolean;
    reasons: string[];
    nextRequiredEvidence: string[];
  };
  exactVerification?: RepairExactVerification;
  execution?: RepairExecutionResult;
  evidencePack?: VerifiedRepairEvidencePack;
  counterexample?: string[];
  nextAction: string;
  userOutcome: string;
}
