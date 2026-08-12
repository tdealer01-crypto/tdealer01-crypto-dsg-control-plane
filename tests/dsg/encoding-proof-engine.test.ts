import { describe, it, expect } from 'vitest';
import {
  createEncodingProof,
  validateProofHash,
  validateHashChainLinkage,
} from '@/lib/dsg/deterministic/encoding-proof-engine';
import type {
  QuboEncoding,
  IsingEncoding,
  EncodingProof,
} from '@/lib/dsg/deterministic/encoding-proof-types';

describe('Encoding Proof Engine', () => {
  describe('createEncodingProof', () => {
    it('creates proof for valid QUBO encoding', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        linear: [
          { index: 0, weight: '1.5' },
          { index: 1, weight: '-2.0' },
        ],
        quadratic: [
          { i: 0, j: 1, weight: '3.0' },
        ],
      };

      const proof = createEncodingProof(encoding);

      expect(proof).toBeDefined();
      expect(proof.proofId).toBeDefined();
      expect(proof.proofId).toMatch(/^epf_/);
      expect(proof.status).toBe('PASS');
      expect(proof.checks.linear_terms_valid).toBe(true);
      expect(proof.checks.quadratic_terms_valid).toBe(true);
      expect(proof.checks.encoding_type_matches).toBe(true);
      expect(proof.encodingHash).toBeDefined();
      expect(proof.proofHash).toBeDefined();
    });

    it('creates proof for valid Ising encoding', () => {
      const encoding: IsingEncoding = {
        kind: 'ising-v1',
        variableCount: 4,
        h: [
          { index: 0, weight: '-1.0' },
          { index: 1, weight: '0.5' },
        ],
        j: [
          { i: 0, j: 1, weight: '-2.0' },
        ],
      };

      const proof = createEncodingProof(encoding);

      expect(proof.status).toBe('PASS');
      expect(proof.checks.encoding_type_matches).toBe(true);
      expect(proof.metadata.dimensionCount).toBe(4);
      expect(proof.metadata.linearTermsCount).toBe(2);
      expect(proof.metadata.quadraticTermsCount).toBe(1);
    });

    it('creates REVIEW proof for oversized problem', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 100, // exceeds MAX_VARIABLES (62)
      };

      const proof = createEncodingProof(encoding);

      // dimension_within_bounds is not a critical check, so single failure → REVIEW
      expect(proof.status).toBe('REVIEW');
      expect(proof.checks.dimension_within_bounds).toBe(false);
      expect(proof.failedChecks).toContain('dimension_within_bounds');
      expect(proof.failureReasons).toBeDefined();
      expect(proof.failureReasons?.length).toBeGreaterThan(0);
    });

    it('creates BLOCKED proof for NaN coefficients', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [
          { index: 0, weight: 'NaN' },
        ],
      };

      const proof = createEncodingProof(encoding);

      expect(proof.status).toBe('BLOCK');
      expect(proof.checks.no_nan_or_infinity).toBe(false);
      expect(proof.failedChecks).toContain('no_nan_or_infinity');
    });

    it('creates BLOCKED proof for duplicate edges', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        quadratic: [
          { i: 0, j: 1, weight: '1.0' },
          { i: 1, j: 0, weight: '2.0' }, // detected as duplicate after normalization
        ],
      };

      const proof = createEncodingProof(encoding);

      expect(proof.status).toBe('BLOCK');
      expect(proof.checks.quadratic_terms_valid).toBe(false);
      expect(proof.failedChecks).toContain('quadratic_terms_valid');
    });

    it('returns deterministic proofId for same encoding', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [{ index: 0, weight: '1.0' }],
      };

      const proof1 = createEncodingProof(encoding);
      const proof2 = createEncodingProof(encoding);

      expect(proof1.proofId).toBe(proof2.proofId);
      expect(proof1.proofHash).toBe(proof2.proofHash);
      expect(proof1.encodingHash).toBe(proof2.encodingHash);
    });

    it('returns different proofId for different encodings', () => {
      const encoding1: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [{ index: 0, weight: '1.0' }],
      };

      const encoding2: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [{ index: 0, weight: '2.0' }],
      };

      const proof1 = createEncodingProof(encoding1);
      const proof2 = createEncodingProof(encoding2);

      expect(proof1.proofId).not.toBe(proof2.proofId);
      expect(proof1.encodingHash).not.toBe(proof2.encodingHash);
    });

    it('includes all 8 checks in proof', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const proof = createEncodingProof(encoding);

      expect(proof.checks).toHaveProperty('linear_terms_valid');
      expect(proof.checks).toHaveProperty('quadratic_terms_valid');
      expect(proof.checks).toHaveProperty('dimension_within_bounds');
      expect(proof.checks).toHaveProperty('coefficient_magnitude_bounded');
      expect(proof.checks).toHaveProperty('no_nan_or_infinity');
      expect(proof.checks).toHaveProperty('no_duplicate_edges');
      expect(proof.checks).toHaveProperty('variable_naming_consistent');
      expect(proof.checks).toHaveProperty('encoding_type_matches');
    });

    it('includes metadata in proof', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        linear: [{ index: 0, weight: '1.5' }],
        quadratic: [{ i: 0, j: 1, weight: '2.0' }],
      };

      const proof = createEncodingProof(encoding);

      expect(proof.metadata).toBeDefined();
      expect(proof.metadata.dimensionCount).toBe(3);
      expect(proof.metadata.linearTermsCount).toBe(1);
      expect(proof.metadata.quadraticTermsCount).toBe(1);
      expect(proof.metadata.maxCoefficientValue).toBeDefined();
    });

    it('includes issuance timestamp for request-bound proof', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const before = new Date();
      const proof = createEncodingProof(
        encoding,
        '0'.repeat(64),
        { problemId: 'prob_timestamp_test', encodingType: 'qubo-v1' },
      );
      const after = new Date();

      const proofTime = new Date(proof.timestamp);
      expect(proofTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(proofTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('includes policy version in proof', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const proof = createEncodingProof(encoding);

      expect(proof.policyVersion).toBeDefined();
      expect(proof.policyVersion).toBe('1.0');
    });
  });

  describe('validateProofHash', () => {
    it('validates proof hash correctly', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const proof = createEncodingProof(encoding);
      const isValid = validateProofHash(proof);

      expect(isValid).toBe(true);
    });

    it('detects tampered proof hash', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const proof = createEncodingProof(encoding);
      // Simulate tampering by modifying the status
      const tamperedProof = {
        ...proof,
        status: proof.status === 'PASS' ? ('BLOCK' as const) : ('PASS' as const),
      };

      const isValid = validateProofHash(tamperedProof);
      expect(isValid).toBe(false);
    });
  });

  describe('validateHashChainLinkage', () => {
    it('validates first proof in chain (links to zeros)', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const proof = createEncodingProof(encoding);

      // First proof should link to all-zeros hash
      expect(proof.previousProofHash).toBe('0'.repeat(64));

      // Validate linkage with null previousProof
      const isLinked = validateHashChainLinkage(proof, null);
      expect(isLinked).toBe(true);
    });

    it('validates hash chain linkage between proofs', () => {
      const encoding1: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const proof1 = createEncodingProof(encoding1);

      const encoding2: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
      };

      // Create second proof with first proof's hash as previousProofHash
      const proof2 = createEncodingProof(encoding2, proof1.proofHash);

      expect(proof2.previousProofHash).toBe(proof1.proofHash);

      // Validate linkage
      const isLinked = validateHashChainLinkage(proof2, proof1);
      expect(isLinked).toBe(true);
    });

    it('detects broken hash chain', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const proof1 = createEncodingProof(encoding);
      const proof2 = createEncodingProof(encoding);

      // proof2 was created independently, not linked to proof1
      const isLinked = validateHashChainLinkage(proof2, proof1);
      expect(isLinked).toBe(false);
    });
  });

  describe('Evidence boundary', () => {
    it('includes evidence boundary statement', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const proof = createEncodingProof(encoding);

      expect(proof.evidenceBoundary).toBeDefined();
      expect(proof.evidenceBoundary.statement).toBeDefined();
      expect(proof.evidenceBoundary.certificationClaim).toBe(false);
      expect(proof.evidenceBoundary.externalVerifierInvoked).toBe(false);
    });
  });
});
