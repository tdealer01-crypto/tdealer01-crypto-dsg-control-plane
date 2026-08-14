/**
 * Encoding Proof Gate Type Definitions
 *
 * The proof validates the structural QUBO/Ising encoding that is about to be
 * sent to a solver. It deliberately does not claim semantic equivalence to the
 * user's original problem; that belongs to the preceding semantic/formal gate.
 */

export type EncodingType = 'qubo-v1' | 'ising-v1';
export type CheckStatus = 'PASS' | 'BLOCK' | 'REVIEW';
export type Coefficient = string | number;

export interface LinearTerm {
  index: number;
  weight: Coefficient;
}

export interface IsingLinearTerm {
  index: number;
  weight: Coefficient;
}

export interface QuadraticTerm {
  i: number;
  j: number;
  weight: Coefficient;
}

export interface QuboEncoding {
  kind: 'qubo-v1';
  variableCount: number;
  constant?: Coefficient;
  linear?: LinearTerm[];
  quadratic?: QuadraticTerm[];
  objective?: 'min' | 'max';
}

export interface IsingEncoding {
  kind: 'ising-v1';
  variableCount: number;
  constant?: Coefficient;
  h?: IsingLinearTerm[];
  j?: QuadraticTerm[];
  objective?: 'min' | 'max';
}

export type ProblemEncoding = QuboEncoding | IsingEncoding;

export interface EncodingCheck {
  name:
    | 'linear_terms_valid'
    | 'quadratic_terms_valid'
    | 'dimension_within_bounds'
    | 'coefficient_magnitude_bounded'
    | 'no_nan_or_infinity'
    | 'no_duplicate_edges'
    | 'variable_naming_consistent'
    | 'encoding_type_matches';
  passed: boolean;
  severity: 'critical' | 'high' | 'medium';
  reason?: string;
}

export interface EncodingChecks {
  linear_terms_valid: boolean;
  quadratic_terms_valid: boolean;
  dimension_within_bounds: boolean;
  coefficient_magnitude_bounded: boolean;
  no_nan_or_infinity: boolean;
  no_duplicate_edges: boolean;
  variable_naming_consistent: boolean;
  encoding_type_matches: boolean;
}

export interface EncodingMetadata {
  dimensionCount: number;
  linearTermsCount: number;
  quadraticTermsCount: number;
  maxCoefficientValue: string;
}

export interface EvidenceBoundary {
  statement: string;
  externalVerifierInvoked: boolean;
  certificationClaim: false;
}

/**
 * Request identity bound into every proof. Raw nonce/idempotency values are not
 * emitted in the proof; their hashes are sufficient for integrity/replay audit.
 */
export interface EncodingProofSubject {
  problemId: string;
  encodingType: EncodingType;
  requestHash: string;
  nonceHash: string;
  idempotencyKeyHash: string;
}

export interface EncodingProof {
  proofId: string;
  proofHash: string;
  encodingHash: string;
  subject: EncodingProofSubject;
  checks: EncodingChecks;
  status: CheckStatus;
  failedChecks?: string[];
  failureReasons?: string[];
  constraintSetHash: string;
  previousProofHash: string;
  timestamp: string;
  policyVersion: string;
  metadata: EncodingMetadata;
  evidenceBoundary: EvidenceBoundary;
}

export interface EncodingProveRequest {
  problemId: string;
  encodingType: EncodingType;
  encoding: ProblemEncoding;
  nonce: string;
  idempotencyKey: string;
}

export interface EncodingProveSuccessResponse {
  ok: true;
  proofId: string;
  status: CheckStatus;
  proof: EncodingProof;
  idempotentReplay?: boolean;
}

export interface EncodingProveErrorResponse {
  ok: false;
  error: string;
  status: CheckStatus;
  failedChecks?: string[];
  failureReasons?: string[];
}

export type EncodingProveResponse =
  | EncodingProveSuccessResponse
  | EncodingProveErrorResponse;

// Backward-compatible aliases used by the older integration suites.
export type EncodingProofRequest = EncodingProveRequest;
export type EncodingProofResponse = EncodingProveResponse;

export interface EncodingPolicyConstraint {
  id: string;
  name: string;
  description: string;
  checkName: keyof EncodingChecks;
  severity: 'critical' | 'high' | 'medium';
  maxVariables?: number;
  maxCoefficientMagnitude?: number;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
}

export interface CachedEncodingProof {
  proof: EncodingProof;
  cachedAt: number;
  expiresAt: number;
  ttlSeconds: number;
}

export interface HashChainEntry {
  sequence: number;
  proofHash: string;
  previousProofHash: string;
  timestamp: string;
  organizationId: string;
  problemId: string;
}
