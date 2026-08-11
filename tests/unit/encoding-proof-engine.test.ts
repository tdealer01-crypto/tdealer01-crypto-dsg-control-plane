/**
 * Tests for Encoding Proof Engine
 */

import { describe, it, expect } from 'vitest';
import {
  createEncodingProof,
  validateProofHash,
  validateHashChainLinkage,
  getSummary,
} from '@/lib/dsg/deterministic/encoding-proof-engine';
import { ProblemEncoding } from '@/lib/dsg/deterministic/encoding-proof-types';

describe('Encoding Proof Engine', () => {
  describe('createEncodingProof', () => {
    it('should create a PASS proof for valid encoding', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 10,
        constant: '0',
        linear: [{ index: 0, weight: '1.0' }],
        quadratic: [{ i: 0, j: 1, weight: '1.0' }],
      };

      const proof = createEncodingProof(encoding);

      expect(proof.status).toBe('PASS');
      expect(proof.checks.linear_terms_valid).toBe(true);
      expect(proof.checks.quadratic_terms_valid).toBe(true);
      expect(proof.checks.dimension_within_bounds).toBe(true);
      expect(proof.checks.coefficient_magnitude_bounded).toBe(true);
      expect(proof.checks.no_nan_or_infinity).toBe(true);
      expect(proof.checks.no_duplicate_edges).toBe(true);
      expect(proof.checks.variable_naming_consistent).toBe(true);
      expect(proof.checks.encoding_type_matches).toBe(true);
      expect(proof.failedChecks).toBeUndefined();
      expect(proof.failureReasons).toBeUndefined();
    });

    it('should create a BLOCK proof for invalid encoding', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 100, // Exceeds MAX_VARIABLES=62
        linear: [{ index: 0, weight: 'NaN' }],
      };

      const proof = createEncodingProof(encoding);

      expect(proof.status).toBe('BLOCK');
      expect(proof.failedChecks).toBeDefined();
      expect(proof.failedChecks!.length).toBeGreaterThan(0);
      expect(proof.failureReasons).toBeDefined();
    });

    it('should generate proofId from encoding hash', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
      };

      const proof = createEncodingProof(encoding);

      expect(proof.proofId).toMatch(/^epf_[a-f0-9]{32}$/);
      expect(proof.proofId.length).toBe(36); // epf_ (4) + 32 hex chars
    });

    it('should include correct metadata', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        constant: '2.5',
        linear: [
          { index: 0, weight: '1.0' },
          { index: 1, weight: '2.0' },
        ],
        quadratic: [{ i: 0, j: 1, weight: '3.0' }],
      };

      const proof = createEncodingProof(encoding);

      expect(proof.metadata.dimensionCount).toBe(5);
      expect(proof.metadata.linearTermsCount).toBe(2);
      expect(proof.metadata.quadraticTermsCount).toBe(1);
      expect(proof.metadata.maxCoefficientValue).toBe('3.0');
    });

    it('should include evidence boundary statement', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
      };

      const proof = createEncodingProof(encoding);

      expect(proof.evidenceBoundary.statement).toBeDefined();
      expect(proof.evidenceBoundary.externalVerifierInvoked).toBe(false);
      expect(proof.evidenceBoundary.certificationClaim).toBe(false);
    });

    it('should generate deterministic encodingHash for same encoding', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        linear: [{ index: 0, weight: '1.0' }],
      };

      const proof1 = createEncodingProof(encoding);
      const proof2 = createEncodingProof(encoding);

      expect(proof1.encodingHash).toBe(proof2.encodingHash);
    });

    it('should initialize with all-zero previousProofHash by default', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
      };

      const proof = createEncodingProof(encoding);

      expect(proof.previousProofHash).toBe('0'.repeat(64));
    });

    it('should link to previous proof when provided', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
      };

      const proof1 = createEncodingProof(encoding);
      const proof2 = createEncodingProof(encoding, proof1.proofHash);

      expect(proof2.previousProofHash).toBe(proof1.proofHash);
    });

    it('should include policy version', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
      };

      const proof = createEncodingProof(encoding);

      expect(proof.policyVersion).toBe('1.0');
    });

    it('should generate valid ISO timestamp', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
      };

      const proof = createEncodingProof(encoding);

      expect(new Date(proof.timestamp)).not.toBeNaN();
      expect(proof.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should generate proofHash correctly', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
      };

      const proof = createEncodingProof(encoding);

      expect(proof.proofHash).toMatch(/^[a-f0-9]{64}$/);
      expect(proof.proofHash.length).toBe(64);
    });
  });

  describe('validateProofHash', () => {
    it('should validate proof with correct hash', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
      };

      const proof = createEncodingProof(encoding);
      expect(validateProofHash(proof)).toBe(true);
    });

    it('should fail validation if proofHash was tampered', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
      };

      const proof = createEncodingProof(encoding);
      proof.proofHash = 'a'.repeat(64); // Tamper with hash

      expect(validateProofHash(proof)).toBe(false);
    });
  });

  describe('validateHashChainLinkage', () => {
    it('should accept first proof in chain', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
      };

      const proof = createEncodingProof(encoding);

      expect(validateHashChainLinkage(proof, null)).toBe(true);
    });

    it('should validate correct hash chain linkage', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
      };

      const proof1 = createEncodingProof(encoding);
      const proof2 = createEncodingProof(encoding, proof1.proofHash);

      expect(validateHashChainLinkage(proof2, proof1)).toBe(true);
    });

    it('should fail on broken hash chain', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
      };

      const proof1 = createEncodingProof(encoding);
      const proof2 = createEncodingProof(encoding); // No previous hash link

      expect(validateHashChainLinkage(proof2, proof1)).toBe(false);
    });

    it('should fail if chain does not link to all-zeros for first proof', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
      };

      const proof = createEncodingProof(encoding, 'a'.repeat(64));

      expect(validateHashChainLinkage(proof, null)).toBe(false);
    });
  });

  describe('getSummary', () => {
    it('should return PASS summary', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
      };

      const proof = createEncodingProof(encoding);
      const summary = getSummary(proof);

      expect(summary).toContain('PASSED');
    });

    it('should return BLOCK summary with count', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 100, // Exceeds limit (HIGH severity)
        linear: [{ index: 0, weight: 'NaN' }], // Also fails (CRITICAL severity)
      };

      const proof = createEncodingProof(encoding);
      const summary = getSummary(proof);

      expect(summary).toContain('BLOCKED');
      expect(summary).toContain('constraint');
    });

    it('should return REVIEW summary with count', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        constant: '1.5e7', // Exceeds coefficient magnitude limit (HIGH severity)
      };

      const proof = createEncodingProof(encoding);
      const summary = getSummary(proof);

      expect(summary).toContain('REVIEW');
    });
  });
});
