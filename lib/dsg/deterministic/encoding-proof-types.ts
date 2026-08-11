/**
 * Encoding Proof Gate Type Definitions
 *
 * This module defines all types for the Encoding Proof Gate, which validates
 * QUBO and Ising problem encodings before solver execution.
 */

/**
 * Supported encoding types
 */
export type EncodingType = 'qubo-v1' | 'ising-v1';

/**
 * Validation check result status
 */
export type CheckStatus = 'PASS' | 'BLOCK' | 'REVIEW';

/**
 * A linear term in a QUBO encoding: coefficient for variable x_i
 */
export interface LinearTerm {
  index: number;
  weight: string; // Stored as string for precision
}

/**
 * A linear term in an Ising encoding: coefficient for spin s_i
 */
export interface IsingLinearTerm {
  index: number;
  weight: string;
}

/**
 * A quadratic term: coefficient for x_i * x_j or s_i * s_j
 */
export interface QuadraticTerm {
  i: number;
  j: number;
  weight: string;
}

/**
 * QUBO Problem Encoding (v1)
 *
 * Represents a quadratic unconstrained binary optimization problem:
 * minimize: E(x) = constant + Σ(linear_i * x_i) + Σ(quad_ij * x_i * x_j)
 * where x_i ∈ {0, 1}
 */
export interface QuboEncoding {
  kind: 'qubo-v1';
  variableCount: number;
  constant?: string | number;
  linear?: LinearTerm[];
  quadratic?: QuadraticTerm[];
  objective?: 'min' | 'max';
}

/**
 * Ising Problem Encoding (v1)
 *
 * Represents an Ising model:
 * minimize: E(s) = constant + Σ(h_i * s_i) + Σ(j_ij * s_i * s_j)
 * where s_i ∈ {-1, +1}
 */
export interface IsingEncoding {
  kind: 'ising-v1';
  variableCount: number;
  constant?: string | number;
  h?: IsingLinearTerm[]; // Linear terms
  j?: QuadraticTerm[]; // Quadratic terms
  objective?: 'min' | 'max';
}

/**
 * Union type for any supported encoding
 */
export type ProblemEncoding = QuboEncoding | IsingEncoding;

/**
 * Individual encoding validation check
 */
export interface EncodingCheck {
  name: 'linear_terms_valid' |
        'quadratic_terms_valid' |
        'dimension_within_bounds' |
        'coefficient_magnitude_bounded' |
        'no_nan_or_infinity' |
        'no_duplicate_edges' |
        'variable_naming_consistent' |
        'encoding_type_matches';
  passed: boolean;
  severity: 'critical' | 'high' | 'medium'; // For decision logic
  reason?: string; // Failure reason if not passed
}

/**
 * Collection of all 8 encoding checks
 */
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

/**
 * Metadata about the encoding
 */
export interface EncodingMetadata {
  dimensionCount: number;
  linearTermsCount: number;
  quadraticTermsCount: number;
  maxCoefficientValue: string; // As string for precision
}

/**
 * Evidence boundary statement (required for all proofs)
 */
export interface EvidenceBoundary {
  statement: string;
  externalVerifierInvoked: boolean;
  certificationClaim: false; // Always false (no third-party audit)
}

/**
 * The main Encoding Proof object returned after validation
 */
export interface EncodingProof {
  // Identification
  proofId: string; // epf_<hash>
  proofHash: string; // SHA256(proof payload)
  encodingHash: string; // SHA256(encoding)

  // Validation checks (all 8)
  checks: EncodingChecks;

  // Decision
  status: CheckStatus; // PASS | BLOCK | REVIEW
  failedChecks?: string[]; // Names of failed checks
  failureReasons?: string[]; // Human-readable reasons

  // Audit trail
  constraintSetHash: string; // SHA256(constraint IDs)
  previousProofHash: string; // Hash chain link
  timestamp: string; // ISO 8601

  // Policy
  policyVersion: string; // e.g., "1.0"

  // Metadata
  metadata: EncodingMetadata;

  // Evidence boundary
  evidenceBoundary: EvidenceBoundary;
}

/**
 * Request to validate an encoding
 */
export interface EncodingProveRequest {
  problemId: string;
  encodingType: EncodingType;
  encoding: ProblemEncoding;
  nonce: string; // For replay protection
  idempotencyKey: string; // For idempotency
}

/**
 * Success response from encoding proof gate
 */
export interface EncodingProveSuccessResponse {
  ok: true;
  proofId: string;
  status: CheckStatus;
  proof: EncodingProof;
}

/**
 * Error response from encoding proof gate
 */
export interface EncodingProveErrorResponse {
  ok: false;
  error: string; // Error code (e.g., "encoding_validation_failed")
  status: CheckStatus;
  failedChecks?: string[];
  failureReasons?: string[];
}

/**
 * Union response type
 */
export type EncodingProveResponse =
  | EncodingProveSuccessResponse
  | EncodingProveErrorResponse;

/**
 * Policy constraint for encoding validation
 */
export interface EncodingPolicyConstraint {
  id: string;
  name: string;
  description: string;
  checkName: keyof EncodingChecks;
  severity: 'critical' | 'high' | 'medium';
  maxVariables?: number;
  maxCoefficientMagnitude?: number;
}

/**
 * Rate limit response headers
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
}

/**
 * Cached encoding proof (with TTL)
 */
export interface CachedEncodingProof {
  proof: EncodingProof;
  cachedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
  ttlSeconds: number; // 30 minutes default
}

/**
 * Hash chain entry for audit trail
 */
export interface HashChainEntry {
  sequence: number;
  proofHash: string;
  previousProofHash: string;
  timestamp: string;
  organizationId: string;
  problemId: string;
}
