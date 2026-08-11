import {
  canonicalHash,
  type CanonicalInput,
} from '@/lib/runtime/canonical';
import type {
  ProblemEncoding,
  EncodingProof,
  EncodingChecks,
  EncodingMetadata,
  EncodingProofSubject,
} from './encoding-proof-types';
import {
  validateEncoding,
  getFailureReasons,
  determineStatus,
  isStrictCoefficient,
} from './encoding-proof-validator';

const POLICY_VERSION = '1.1';
const GENESIS_HASH = '0'.repeat(64);
const CONSTRAINT_IDS = [
  'enc_policy_01',
  'enc_policy_02',
  'enc_policy_03',
  'enc_policy_04',
  'enc_policy_05',
  'enc_policy_06',
  'enc_policy_07',
  'enc_policy_08',
] as const;

function asCanonical(value: unknown): CanonicalInput {
  return value as CanonicalInput;
}

export function computeEncodingHash(encoding: ProblemEncoding): string {
  return canonicalHash(asCanonical(encoding));
}

export function computeEncodingConstraintSetHash(): string {
  return canonicalHash(asCanonical(CONSTRAINT_IDS));
}

function collectMetadata(encoding: ProblemEncoding): EncodingMetadata {
  const linear = encoding.kind === 'qubo-v1' ? encoding.linear ?? [] : encoding.h ?? [];
  const quadratic = encoding.kind === 'qubo-v1' ? encoding.quadratic ?? [] : encoding.j ?? [];
  const coefficients: Array<string | number> = [];

  if (encoding.constant !== undefined && isStrictCoefficient(encoding.constant)) {
    coefficients.push(encoding.constant);
  }
  for (const term of linear) {
    if (term && isStrictCoefficient(term.weight)) coefficients.push(term.weight);
  }
  for (const term of quadratic) {
    if (term && isStrictCoefficient(term.weight)) coefficients.push(term.weight);
  }

  let maxCoefficientValue = '0';
  let maxMagnitude = 0;
  for (const value of coefficients) {
    const magnitude = Math.abs(Number(value));
    if (magnitude > maxMagnitude) {
      maxMagnitude = magnitude;
      maxCoefficientValue = String(value);
    }
  }

  return {
    dimensionCount: encoding.variableCount,
    linearTermsCount: linear.length,
    quadraticTermsCount: quadratic.length,
    maxCoefficientValue,
  };
}

function normalizeSubject(
  encoding: ProblemEncoding,
  encodingHash: string,
  supplied?: Partial<EncodingProofSubject>,
): EncodingProofSubject {
  const problemId = supplied?.problemId?.trim() || 'legacy-unbound-problem';
  const encodingType = supplied?.encodingType ?? encoding.kind;
  const requestHash =
    supplied?.requestHash ||
    canonicalHash(asCanonical({ problemId, encodingType, encodingHash }));

  return {
    problemId,
    encodingType,
    requestHash,
    nonceHash:
      supplied?.nonceHash || canonicalHash(asCanonical({ scope: 'legacy-nonce', requestHash })),
    idempotencyKeyHash:
      supplied?.idempotencyKeyHash ||
      canonicalHash(asCanonical({ scope: 'legacy-idempotency', requestHash })),
  };
}

function proofPayload(proof: Omit<EncodingProof, 'proofHash'>): CanonicalInput {
  return asCanonical({
    proofId: proof.proofId,
    encodingHash: proof.encodingHash,
    subject: proof.subject,
    checks: proof.checks,
    status: proof.status,
    failedChecks: proof.failedChecks ?? [],
    failureReasons: proof.failureReasons ?? [],
    constraintSetHash: proof.constraintSetHash,
    previousProofHash: proof.previousProofHash,
    timestamp: proof.timestamp,
    policyVersion: proof.policyVersion,
    metadata: proof.metadata,
    evidenceBoundary: proof.evidenceBoundary,
  });
}

/**
 * Creates a self-contained encoding proof. Production callers must supply a
 * request-bound subject and the current server-managed previous proof hash.
 * The optional defaults exist only for backward-compatible unit tests.
 */
export function createEncodingProof(
  encoding: ProblemEncoding,
  previousProofHash: string = GENESIS_HASH,
  suppliedSubject?: Partial<EncodingProofSubject>,
  timestamp: string = new Date().toISOString(),
): EncodingProof {
  const checks = validateEncoding(encoding);
  const status = determineStatus(checks);
  const encodingHash = computeEncodingHash(encoding);
  const constraintSetHash = computeEncodingConstraintSetHash();
  const subject = normalizeSubject(encoding, encodingHash, suppliedSubject);
  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  const failureReasons = getFailureReasons(encoding, checks);
  const metadata = collectMetadata(encoding);

  const proofId = `epf_${canonicalHash(
    asCanonical({ encodingHash, subject, constraintSetHash, previousProofHash }),
  ).slice(0, 32)}`;

  const unsigned: Omit<EncodingProof, 'proofHash'> = {
    proofId,
    encodingHash,
    subject,
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
      statement:
        'Encoding Proof validates canonical QUBO/Ising structure and request binding. It does not prove semantic equivalence to the original user problem or global optimality.',
      externalVerifierInvoked: false,
      certificationClaim: false,
    },
  };

  return {
    ...unsigned,
    proofHash: canonicalHash(proofPayload(unsigned)),
  };
}

/** Every integrity-relevant field is recomputed, not just status/check bits. */
export function validateProofHash(proof: EncodingProof): boolean {
  const { proofHash, ...unsigned } = proof;
  return canonicalHash(proofPayload(unsigned)) === proofHash;
}

export function validateHashChainLinkage(
  proof: EncodingProof,
  previousProof: EncodingProof | null,
): boolean {
  return previousProof
    ? proof.previousProofHash === previousProof.proofHash
    : proof.previousProofHash === GENESIS_HASH;
}

export function getSummary(proof: EncodingProof): string {
  if (proof.status === 'PASS') return 'Encoding validation PASSED: all constraints satisfied';
  if (proof.status === 'BLOCK') {
    return `Encoding validation BLOCKED: ${proof.failedChecks?.length || 0} constraint(s) failed`;
  }
  return `Encoding validation requires REVIEW: ${proof.failedChecks?.length || 0} constraint(s) failed`;
}
