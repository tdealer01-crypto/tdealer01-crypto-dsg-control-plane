/**
 * Encoding Proof Engine
 *
 * Orchestrates encoding validation, hash chain management, and proof generation.
 */

import crypto from 'crypto';
import {
  ProblemEncoding,
  EncodingProof,
  EncodingChecks,
  EncodingMetadata,
} from './encoding-proof-types';
import {
  validateEncoding,
  getFailureReasons,
  determineStatus,
} from './encoding-proof-validator';

const POLICY_VERSION = '1.0';
const CONSTRAINT_IDS = [
  'enc_policy_01', // linear_terms_valid
  'enc_policy_02', // quadratic_terms_valid
  'enc_policy_03', // dimension_within_bounds
  'enc_policy_04', // coefficient_magnitude_bounded
  'enc_policy_05', // no_nan_or_infinity
  'enc_policy_06', // no_duplicate_edges
  'enc_policy_07', // variable_naming_consistent
  'enc_policy_08', // encoding_type_matches
];

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function computeEncodingHash(encoding: ProblemEncoding): string {
  const encoded = JSON.stringify(encoding, null, 0);
  return sha256(encoded);
}

function computeConstraintSetHash(): string {
  const constraintList = CONSTRAINT_IDS.join('|');
  return sha256(constraintList);
}

function computeProofHash(
  proofId: string,
  status: 'PASS' | 'BLOCK' | 'REVIEW',
  checks: EncodingChecks,
  previousProofHash: string,
  constraintSetHash: string
): string {
  const payload = JSON.stringify(
    {
      proofId,
      status,
      checks,
      previousProofHash,
      constraintSetHash,
      policyVersion: POLICY_VERSION,
    },
    null,
    0
  );
  return sha256(payload);
}

function collectMetadata(encoding: ProblemEncoding): EncodingMetadata {
  let linearTermsCount = 0;
  let quadraticTermsCount = 0;
  let maxCoefficientValue = '0';

  if (encoding.kind === 'qubo-v1') {
    if (encoding.linear) linearTermsCount = encoding.linear.length;
    if (encoding.quadratic) quadraticTermsCount = encoding.quadratic.length;

    if (encoding.linear) {
      for (const term of encoding.linear) {
        const weight = String(term.weight);
        if (Math.abs(parseFloat(weight)) > Math.abs(parseFloat(maxCoefficientValue))) {
          maxCoefficientValue = weight;
        }
      }
    }

    if (encoding.quadratic) {
      for (const term of encoding.quadratic) {
        const weight = String(term.weight);
        if (Math.abs(parseFloat(weight)) > Math.abs(parseFloat(maxCoefficientValue))) {
          maxCoefficientValue = weight;
        }
      }
    }
  } else if (encoding.kind === 'ising-v1') {
    if (encoding.h) linearTermsCount = encoding.h.length;
    if (encoding.j) quadraticTermsCount = encoding.j.length;

    if (encoding.h) {
      for (const term of encoding.h) {
        const weight = String(term.weight);
        if (Math.abs(parseFloat(weight)) > Math.abs(parseFloat(maxCoefficientValue))) {
          maxCoefficientValue = weight;
        }
      }
    }

    if (encoding.j) {
      for (const term of encoding.j) {
        const weight = String(term.weight);
        if (Math.abs(parseFloat(weight)) > Math.abs(parseFloat(maxCoefficientValue))) {
          maxCoefficientValue = weight;
        }
      }
    }
  }

  if (encoding.constant) {
    const constantValue = String(encoding.constant);
    if (Math.abs(parseFloat(constantValue)) > Math.abs(parseFloat(maxCoefficientValue))) {
      maxCoefficientValue = constantValue;
    }
  }

  return {
    dimensionCount: encoding.variableCount,
    linearTermsCount,
    quadraticTermsCount,
    maxCoefficientValue,
  };
}

/**
 * Generate an encoding proof ID based on encoding hash
 */
function generateProofId(encodingHash: string): string {
  return `epf_${encodingHash.substring(0, 32)}`;
}

/**
 * Create an encoding proof
 */
export function createEncodingProof(
  encoding: ProblemEncoding,
  previousProofHash: string = '0'.repeat(64)
): EncodingProof {
  // Step 1: Validate encoding
  const checks = validateEncoding(encoding);

  // Step 2: Determine status
  const status = determineStatus(checks);

  // Step 3: Compute hashes
  const encodingHash = computeEncodingHash(encoding);
  const constraintSetHash = computeConstraintSetHash();
  const proofId = generateProofId(encodingHash);

  // Step 4: Determine failure reasons
  const failureReasons = getFailureReasons(encoding, checks);
  const failedChecks = Object.entries(checks)
    .filter(([_, passed]) => !passed)
    .map(([checkName]) => checkName);

  // Step 5: Collect metadata
  const metadata = collectMetadata(encoding);

  // Step 6: Create timestamp
  const timestamp = new Date().toISOString();

  // Step 7: Compute proof hash (requires proofId and other fields)
  const proofHash = computeProofHash(
    proofId,
    status,
    checks,
    previousProofHash,
    constraintSetHash
  );

  // Step 8: Construct proof object
  const proof: EncodingProof = {
    proofId,
    proofHash,
    encodingHash,
    checks,
    status,
    failedChecks: failedChecks.length > 0 ? failedChecks : undefined,
    failureReasons: failureReasons.length > 0 ? failureReasons : undefined,
    constraintSetHash,
    previousProofHash,
    timestamp,
    policyVersion: POLICY_VERSION,
    metadata,
    evidenceBoundary: {
      statement: 'Encoding Proof validates QUBO/Ising matrix structure against policy constraints (v1.0). Does not validate semantic correctness of problem formalization.',
      externalVerifierInvoked: false,
      certificationClaim: false,
    },
  };

  return proof;
}

/**
 * Validate a proof hash (for integrity checking)
 */
export function validateProofHash(proof: EncodingProof): boolean {
  const recomputedHash = computeProofHash(
    proof.proofId,
    proof.status,
    proof.checks,
    proof.previousProofHash,
    proof.constraintSetHash
  );
  return recomputedHash === proof.proofHash;
}

/**
 * Validate proof hash chain linkage
 */
export function validateHashChainLinkage(
  proof: EncodingProof,
  previousProof: EncodingProof | null
): boolean {
  if (!previousProof) {
    // First proof in chain should link to all-zeros
    return proof.previousProofHash === '0'.repeat(64);
  }
  // Proof should link to previous proof's hash
  return proof.previousProofHash === previousProof.proofHash;
}

/**
 * Get summary of validation result
 */
export function getSummary(proof: EncodingProof): string {
  if (proof.status === 'PASS') {
    return 'Encoding validation PASSED: all constraints satisfied';
  }
  if (proof.status === 'BLOCK') {
    return `Encoding validation BLOCKED: ${proof.failedChecks?.length || 0} constraint(s) failed`;
  }
  return `Encoding validation requires REVIEW: ${proof.failedChecks?.length || 0} constraint(s) failed`;
}
