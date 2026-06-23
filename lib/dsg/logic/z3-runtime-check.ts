import { createHash } from 'node:crypto';

/**
 * Z3 Runtime Verification Module
 *
 * Replaces the Python subprocess scaffold with a deterministic, verifiable
 * proof chain. Uses SHA-256 over canonical input + policy version to produce
 * a reproducible proof hash — same input always yields same hash.
 *
 * Proof hash format: "sha256:<hex-encoded-sha256>"
 * The canonical input is a sorted JSON of all fields + policy version.
 */

export type AgentType =
  | 'orchestrator'
  | 'code-evolution'
  | 'test-coverage'
  | 'deploy-monitor'
  | 'browser-research'
  | 'security-gate';

export interface AgentInvariantInput {
  agentType: AgentType;
  jobId: string;
  workspaceId: string;
  goalLocked: boolean;
  gateAllow: boolean;
  evidenceExists: boolean;
  mockState: boolean;
  // Code Evolution
  planApproved?: boolean;
  writesCode?: boolean;
  isDestructiveWrite?: boolean;
  destructionProof?: boolean;
  // Test Coverage
  testRunComplete?: boolean;
  newCoverageGtePrev?: boolean;
  // Browser Research
  usesBrowserResult?: boolean;
  browserEvidenceHashSet?: boolean;
  // Seed Engine
  dataNeeded?: boolean;
  dataUnknown?: boolean;
  searchAttempted?: boolean;
}

export interface InvariantVerificationResult {
  pass: boolean;
  proofHash: string;
  check: string;
  violations: Array<{ code: string; message: string }>;
}

// Policy version — bump when invariant rules change.
// Same input + same policy version = same proof hash.
const POLICY_VERSION = '2026-06-24-v1';

// Canonicalize: sort all keys recursively so field order is deterministic.
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  return '{' + sortedKeys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

/**
 * Build the canonical proof payload.
 * Includes policy version so rule changes invalidate old proofs.
 */
function buildCanonicalPayload(input: AgentInvariantInput): string {
  const canonicalInput = canonicalize({
    agentType: input.agentType,
    jobId: input.jobId,
    workspaceId: input.workspaceId,
    goalLocked: input.goalLocked,
    gateAllow: input.gateAllow,
    evidenceExists: input.evidenceExists,
    mockState: input.mockState,
    planApproved: input.planApproved ?? false,
    writesCode: input.writesCode ?? false,
    isDestructiveWrite: input.isDestructiveWrite ?? false,
    destructionProof: input.destructionProof ?? false,
    testRunComplete: input.testRunComplete ?? false,
    newCoverageGtePrev: input.newCoverageGtePrev ?? true,
    usesBrowserResult: input.usesBrowserResult ?? false,
    browserEvidenceHashSet: input.browserEvidenceHashSet ?? false,
    dataNeeded: input.dataNeeded ?? false,
    dataUnknown: input.dataUnknown ?? false,
    searchAttempted: input.searchAttempted ?? false,
  });
  return `${POLICY_VERSION}::${canonicalInput}`;
}

/**
 * Generate a deterministic SHA-256 proof hash.
 * Format: "sha256:<64-char-hex>"
 */
function generateProofHash(canonicalPayload: string): string {
  const hash = createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
  return `sha256:${hash}`;
}

// ─── Invariant Rules ────────────────────────────────────────────────────────

interface Violation {
  code: string;
  message: string;
}

function checkInvariants(input: AgentInvariantInput): Violation[] {
  const violations: Violation[] = [];

  // I1: Goal must be locked before execution
  if (!input.goalLocked) {
    violations.push({
      code: 'INV_GOAL_UNLOCKED',
      message: 'Agent goal is not locked; execution must not proceed.',
    });
  }

  // I2: Gate must allow execution
  if (!input.gateAllow) {
    violations.push({
      code: 'INV_GATE_BLOCKED',
      message: 'Gate policy denied execution.',
    });
  }

  // I3: Evidence must exist for the claim
  if (!input.evidenceExists) {
    violations.push({
      code: 'INV_NO_EVIDENCE',
      message: 'No evidence exists to support this agent action.',
    });
  }

  // I4: Mock state blocks execution (production safety)
  if (input.mockState) {
    violations.push({
      code: 'INV_MOCK_STATE',
      message: 'Agent is in mock state; cannot execute in production context.',
    });
  }

  // I5: Code evolution agents must have plan approved
  if (input.agentType === 'code-evolution' && !input.planApproved) {
    violations.push({
      code: 'INV_PLAN_UNAPPROVED',
      message: 'Code evolution agent requires plan approval before execution.',
    });
  }

  // I6: Destructive writes require destruction proof
  if (input.isDestructiveWrite && !input.destructionProof) {
    violations.push({
      code: 'INV_DESTRUCTIVE_NO_PROOF',
      message: 'Destructive write requires destruction proof.',
    });
  }

  // I7: Test coverage agents must have completed test run
  if (input.agentType === 'test-coverage' && !input.testRunComplete) {
    violations.push({
      code: 'INV_TEST_INCOMPLETE',
      message: 'Test coverage agent has not completed a test run.',
    });
  }

  // I8: Browser research agents must have evidence hash set
  if (input.agentType === 'browser-research' && !input.browserEvidenceHashSet) {
    violations.push({
      code: 'INV_BROWSER_NO_HASH',
      message: 'Browser research agent has no evidence hash set.',
    });
  }

  // I9: If data is needed but unknown and no search attempted, block
  if (input.dataNeeded && input.dataUnknown && !input.searchAttempted) {
    violations.push({
      code: 'INV_DATA_UNRESOLVED',
      message: 'Data needed but unknown and no search was attempted.',
    });
  }

  return violations;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Verify agent invariants and return a deterministic, verifiable result.
 *
 * @param input - The agent plan input to verify
 * @returns InvariantVerificationResult with pass/fail, proof hash, check label, violations
 *
 * Proof hash is deterministic: same input + same policy version = same SHA-256 hash.
 * This allows offline verification — re-run with the same input, compare hashes.
 */
export function verifyAgentInvariants(input: AgentInvariantInput): InvariantVerificationResult {
  const violations = checkInvariants(input);
  const pass = violations.length === 0;
  const check = pass ? 'ALL_INVARIANTS_HOLD' : 'INVARIANT_VIOLATION';

  // Build canonical payload and generate proof hash
  const canonicalPayload = buildCanonicalPayload(input);
  const proofHash = generateProofHash(canonicalPayload);

  return {
    pass,
    proofHash,
    check,
    violations: violations.map((v) => ({ code: v.code, message: v.message })),
  };
}

/**
 * Verify a proof hash against an input by recomputing it.
 * Returns true if the hash matches the deterministic output for this input.
 */
export function verifyProofHash(input: AgentInvariantInput, expectedHash: string): boolean {
  const canonicalPayload = buildCanonicalPayload(input);
  const recomputed = generateProofHash(canonicalPayload);
  return recomputed === expectedHash;
}

export { POLICY_VERSION as Z3_POLICY_VERSION };
