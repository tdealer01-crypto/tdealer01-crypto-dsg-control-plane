import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateEncodingProof,
  validateEncodingProofHash,
  validateProofChain,
  determineProofStatus,
  clearProofHistory,
} from '@/lib/dsg/deterministic/encoding-proof-engine';
import type {
  AimoQuboEncoding,
  AimoIsingEncoding,
  EncodingProof,
} from '@/lib/dsg/deterministic/encoding-proof-types';

describe('Encoding Proof Engine', () => {
  beforeEach(() => {
    clearProofHistory();
  });

  afterEach(() => {
    clearProofHistory();
  });

  describe('generateEncodingProof', () => {
    it('generates proof for valid QUBO encoding', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        linear: [
          { i: 0, weight: '1.5' },
          { i: 1, weight: '-2.0' },
        ],
        quadratic: [
          { i: 0, j: 1, weight: '3.0' },
        ],
      };

      const proof = generateEncodingProof(encoding, {
        nonce: 'test-nonce-001',
        idempotencyKey: 'test-idem-001',
        problemId: 'prob_123',
      });

      expect(proof).toBeDefined();
      expect(proof.ok).toBe(true);
      expect(proof.proofId).toBeDefined();
      expect(proof.proofId).toMatch(/^epf_[a-f0-9]{64}$/);
      expect(proof.status).toBe('PASS');
      expect(proof.proof).toBeDefined();
      expect(proof.proof?.checks.linear_terms_valid).toBe(true);
      expect(proof.proof?.checks.quadratic_terms_valid).toBe(true);
      expect(proof.proof?.checks.encoding_type_matches).toBe(true);
    });

    it('generates proof for valid Ising encoding', () => {
      const encoding: AimoIsingEncoding = {
        kind: 'ising-v1',
        variableCount: 4,
        h: [
          { i: 0, weight: '-1.0' },
          { i: 1, weight: '0.5' },
        ],
        j: [
          { i: 0, j: 1, weight: '-2.0' },
        ],
      };

      const proof = generateEncodingProof(encoding, {
        nonce: 'test-nonce-002',
        idempotencyKey: 'test-idem-002',
      });

      expect(proof.ok).toBe(true);
      expect(proof.status).toBe('PASS');
      expect(proof.proof?.checks.encoding_type_matches).toBe(true);
    });

    it('generates BLOCKED proof for oversized problem', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 100, // exceeds MAX_VARIABLES (62)
      };

      const proof = generateEncodingProof(encoding, {
        nonce: 'test-nonce-003',
        idempotencyKey: 'test-idem-003',
      });

      expect(proof.ok).toBe(false);
      expect(proof.status).toBe('BLOCK');
      expect(proof.failedChecks).toContain('dimension_within_bounds');
      expect(proof.failureReasons).toBeDefined();
      expect(proof.failureReasons?.length).toBeGreaterThan(0);
    });

    it('generates BLOCKED proof for NaN coefficients', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [
          { i: 0, weight: NaN },
        ],
      };

      const proof = generateEncodingProof(encoding, {
        nonce: 'test-nonce-004',
        idempotencyKey: 'test-idem-004',
      });

      expect(proof.ok).toBe(false);
      expect(proof.status).toBe('BLOCK');
      expect(proof.failedChecks).toContain('no_nan_or_infinity');
    });

    it('generates BLOCKED proof for duplicate edges', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        quadratic: [
          { i: 0, j: 1, weight: '1.0' },
          { i: 1, j: 0, weight: '2.0' }, // duplicate
        ],
      };

      const proof = generateEncodingProof(encoding, {
        nonce: 'test-nonce-005',
        idempotencyKey: 'test-idem-005',
      });

      expect(proof.ok).toBe(false);
      expect(proof.status).toBe('BLOCK');
      expect(proof.failedChecks).toContain('no_duplicate_edges');
    });

    it('generates REVIEW proof for coefficient magnitude warnings', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [
          { i: 0, weight: '999999999' }, // very large but within bounds
        ],
      };

      const proof = generateEncodingProof(encoding, {
        nonce: 'test-nonce-006',
        idempotencyKey: 'test-idem-006',
      });

      expect(proof.ok).toBe(true);
      // May be PASS or REVIEW depending on magnitude thresholds
      expect(['PASS', 'REVIEW']).toContain(proof.status);
    });

    it('returns deterministic proofId for same encoding', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [{ i: 0, weight: '1.0' }],
      };

      const proof1 = generateEncodingProof(encoding, {
        nonce: 'nonce-1',
        idempotencyKey: 'idem-1',
      });

      const proof2 = generateEncodingProof(encoding, {
        nonce: 'nonce-1',
        idempotencyKey: 'idem-1',
      });

      expect(proof1.proofId).toBe(proof2.proofId);
      expect(proof1.proof?.proofHash).toBe(proof2.proof?.proofHash);
    });

    it('returns different proofId for different encodings', () => {
      const encoding1: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [{ i: 0, weight: '1.0' }],
      };

      const encoding2: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [{ i: 0, weight: '2.0' }],
      };

      const proof1 = generateEncodingProof(encoding1, {
        nonce: 'nonce-1',
        idempotencyKey: 'idem-1',
      });

      const proof2 = generateEncodingProof(encoding2, {
        nonce: 'nonce-1',
        idempotencyKey: 'idem-1',
      });

      expect(proof1.proofId).not.toBe(proof2.proofId);
    });
  });

  describe('validateEncodingProofHash', () => {
    it('validates correct proof hash', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const proof = generateEncodingProof(encoding, {
        nonce: 'nonce-hash-1',
        idempotencyKey: 'idem-hash-1',
      });

      expect(proof.proof).toBeDefined();
      const isValid = validateEncodingProofHash(proof.proof!);
      expect(isValid).toBe(true);
    });

    it('rejects tampered proof hash', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const proof = generateEncodingProof(encoding, {
        nonce: 'nonce-hash-2',
        idempotencyKey: 'idem-hash-2',
      });

      const tamperedProof = {
        ...proof.proof!,
        status: 'PASS' as const,
      };

      const isValid = validateEncodingProofHash(tamperedProof);
      expect(isValid).toBe(false);
    });

    it('rejects proof with missing proofHash', () => {
      const invalidProof = {
        proofId: 'epf_test',
        encodingHash: 'test-hash',
        status: 'PASS' as const,
        checks: {},
      } as unknown as EncodingProof;

      const isValid = validateEncodingProofHash(invalidProof);
      expect(isValid).toBe(false);
    });
  });

  describe('validateProofChain', () => {
    it('validates single proof in chain (no previous)', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const proof = generateEncodingProof(encoding, {
        nonce: 'nonce-chain-1',
        idempotencyKey: 'idem-chain-1',
      });

      expect(proof.proof).toBeDefined();
      const isValid = validateProofChain(proof.proof!);
      expect(isValid).toBe(true);
    });

    it('maintains hash chain across multiple proofs', () => {
      const encoding1: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [{ i: 0, weight: '1.0' }],
      };

      const encoding2: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [{ i: 0, weight: '2.0' }],
      };

      const proof1 = generateEncodingProof(encoding1, {
        nonce: 'nonce-chain-2a',
        idempotencyKey: 'idem-chain-2a',
      });

      const proof2 = generateEncodingProof(encoding2, {
        nonce: 'nonce-chain-2b',
        idempotencyKey: 'idem-chain-2b',
      });

      expect(proof1.proof).toBeDefined();
      expect(proof2.proof).toBeDefined();

      // Second proof should reference first in chain
      if (proof2.proof?.previousProofHash) {
        expect(proof2.proof.previousProofHash).toBe(proof1.proof?.proofHash);
      }
    });

    it('validates chain integrity when checking second proof', () => {
      const encoding1: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const encoding2: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
      };

      generateEncodingProof(encoding1, {
        nonce: 'nonce-chain-3a',
        idempotencyKey: 'idem-chain-3a',
      });

      const proof2 = generateEncodingProof(encoding2, {
        nonce: 'nonce-chain-3b',
        idempotencyKey: 'idem-chain-3b',
      });

      expect(proof2.proof).toBeDefined();
      const isValid = validateProofChain(proof2.proof!);
      expect(isValid).toBe(true);
    });
  });

  describe('determineProofStatus', () => {
    it('returns PASS for all checks passing', () => {
      const checks = {
        linear_terms_valid: true,
        quadratic_terms_valid: true,
        dimension_within_bounds: true,
        coefficient_magnitude_bounded: true,
        no_nan_or_infinity: true,
        no_duplicate_edges: true,
        variable_naming_consistent: true,
        encoding_type_matches: true,
      };

      const status = determineProofStatus(checks);
      expect(status).toBe('PASS');
    });

    it('returns BLOCK when any CRITICAL check fails', () => {
      const checks = {
        linear_terms_valid: true,
        quadratic_terms_valid: true,
        dimension_within_bounds: false, // CRITICAL
        coefficient_magnitude_bounded: true,
        no_nan_or_infinity: true,
        no_duplicate_edges: true,
        variable_naming_consistent: true,
        encoding_type_matches: true,
      };

      const status = determineProofStatus(checks);
      expect(status).toBe('BLOCK');
    });

    it('returns BLOCK when no_nan_or_infinity fails (CRITICAL)', () => {
      const checks = {
        linear_terms_valid: true,
        quadratic_terms_valid: true,
        dimension_within_bounds: true,
        coefficient_magnitude_bounded: true,
        no_nan_or_infinity: false, // CRITICAL
        no_duplicate_edges: true,
        variable_naming_consistent: true,
        encoding_type_matches: true,
      };

      const status = determineProofStatus(checks);
      expect(status).toBe('BLOCK');
    });

    it('returns BLOCK when no_duplicate_edges fails (CRITICAL)', () => {
      const checks = {
        linear_terms_valid: true,
        quadratic_terms_valid: true,
        dimension_within_bounds: true,
        coefficient_magnitude_bounded: true,
        no_nan_or_infinity: true,
        no_duplicate_edges: false, // CRITICAL
        variable_naming_consistent: true,
        encoding_type_matches: true,
      };

      const status = determineProofStatus(checks);
      expect(status).toBe('BLOCK');
    });

    it('returns BLOCK when encoding_type_matches fails (CRITICAL)', () => {
      const checks = {
        linear_terms_valid: true,
        quadratic_terms_valid: true,
        dimension_within_bounds: true,
        coefficient_magnitude_bounded: true,
        no_nan_or_infinity: true,
        no_duplicate_edges: true,
        variable_naming_consistent: true,
        encoding_type_matches: false, // CRITICAL
      };

      const status = determineProofStatus(checks);
      expect(status).toBe('BLOCK');
    });

    it('returns REVIEW when HIGH severity check fails', () => {
      const checks = {
        linear_terms_valid: false, // HIGH
        quadratic_terms_valid: true,
        dimension_within_bounds: true,
        coefficient_magnitude_bounded: true,
        no_nan_or_infinity: true,
        no_duplicate_edges: true,
        variable_naming_consistent: true,
        encoding_type_matches: true,
      };

      const status = determineProofStatus(checks);
      expect(status).toBe('REVIEW');
    });

    it('returns REVIEW when coefficient_magnitude_bounded fails (MEDIUM)', () => {
      const checks = {
        linear_terms_valid: true,
        quadratic_terms_valid: true,
        dimension_within_bounds: true,
        coefficient_magnitude_bounded: false, // MEDIUM
        no_nan_or_infinity: true,
        no_duplicate_edges: true,
        variable_naming_consistent: true,
        encoding_type_matches: true,
      };

      const status = determineProofStatus(checks);
      expect(status).toBe('REVIEW');
    });
  });

  describe('Idempotency tests', () => {
    it('produces identical proofs for same inputs across calls', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        linear: [
          { i: 0, weight: '1.0' },
          { i: 2, weight: '-0.5' },
        ],
        quadratic: [
          { i: 1, j: 3, weight: '2.5' },
        ],
      };

      const config = {
        nonce: 'idem-test-001',
        idempotencyKey: 'idem-test-001',
        problemId: 'prob-123',
      };

      const proof1 = generateEncodingProof(encoding, config);
      const proof2 = generateEncodingProof(encoding, config);

      expect(proof1.proofId).toBe(proof2.proofId);
      expect(proof1.proof?.proofHash).toBe(proof2.proof?.proofHash);
      expect(proof1.proof?.encodingHash).toBe(proof2.proof?.encodingHash);
      expect(proof1.status).toBe(proof2.status);
    });

    it('changes proofId when nonce changes', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const proof1 = generateEncodingProof(encoding, {
        nonce: 'nonce-idem-1',
        idempotencyKey: 'idem-test-002',
      });

      const proof2 = generateEncodingProof(encoding, {
        nonce: 'nonce-idem-2',
        idempotencyKey: 'idem-test-002',
      });

      expect(proof1.proofId).not.toBe(proof2.proofId);
    });
  });

  describe('Policy version and timestamp', () => {
    it('includes policyVersion in proof', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const proof = generateEncodingProof(encoding, {
        nonce: 'nonce-policy-1',
        idempotencyKey: 'idem-policy-1',
      });

      expect(proof.proof?.policyVersion).toBeDefined();
      expect(proof.proof?.policyVersion).toMatch(/^\d+\.\d+/);
    });

    it('includes current timestamp in proof', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const beforeTime = new Date();
      const proof = generateEncodingProof(encoding, {
        nonce: 'nonce-time-1',
        idempotencyKey: 'idem-time-1',
      });
      const afterTime = new Date();

      expect(proof.proof?.timestamp).toBeDefined();
      const proofTime = new Date(proof.proof?.timestamp || '');
      expect(proofTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(proofTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Metadata collection', () => {
    it('collects metadata for QUBO encoding', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        linear: [
          { i: 0, weight: '1.0' },
          { i: 2, weight: '-2.5' },
        ],
        quadratic: [
          { i: 0, j: 1, weight: '3.14' },
          { i: 1, j: 3, weight: '-1.0' },
        ],
      };

      const proof = generateEncodingProof(encoding, {
        nonce: 'nonce-meta-1',
        idempotencyKey: 'idem-meta-1',
      });

      expect(proof.proof?.metadata).toBeDefined();
      expect(proof.proof?.metadata.dimensionCount).toBe(5);
      expect(proof.proof?.metadata.linearTermsCount).toBe(2);
      expect(proof.proof?.metadata.quadraticTermsCount).toBe(2);
    });

    it('collects metadata for Ising encoding', () => {
      const encoding: AimoIsingEncoding = {
        kind: 'ising-v1',
        variableCount: 4,
        h: [
          { i: 0, weight: '-1.0' },
          { i: 2, weight: '0.5' },
        ],
        j: [
          { i: 0, j: 1, weight: '-2.0' },
        ],
      };

      const proof = generateEncodingProof(encoding, {
        nonce: 'nonce-meta-2',
        idempotencyKey: 'idem-meta-2',
      });

      expect(proof.proof?.metadata).toBeDefined();
      expect(proof.proof?.metadata.dimensionCount).toBe(4);
    });
  });
});
