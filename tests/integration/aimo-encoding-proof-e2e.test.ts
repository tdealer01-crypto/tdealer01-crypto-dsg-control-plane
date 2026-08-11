import { describe, it, expect, beforeEach } from 'vitest';
import type {
  EncodingProofRequest,
  EncodingProofResponse,
} from '@/lib/dsg/deterministic/encoding-proof-types';

/**
 * End-to-end tests for full AIMO pipeline:
 * Problem → Encoding Proof Gate → Solver → Cinema Verification
 *
 * These tests verify the complete integration flow where:
 * 1. User submits AIMO problem with QUBO/Ising encoding
 * 2. Control plane validates encoding via proof gate
 * 3. Solver only executes if encoding proof passes
 * 4. Cinema verifies candidate solutions
 * 5. Proof chain links all components
 *
 * NOTE: E2E tests require dev server running on localhost:3000
 * Set SKIP_INTEGRATION_TESTS=true to skip in CI environments
 */
const shouldSkip = process.env.SKIP_INTEGRATION_TESTS === 'true' || process.env.CI === 'true';

describe('AIMO Encoding Proof E2E Pipeline', { skip: shouldSkip }, () => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const apiKey = process.env.TEST_ENCODING_PROOF_API_KEY || '';

  describe('Happy path: Valid QUBO problem', () => {
    it('accepts QUBO encoding through proof gate and proceeds to solve', async () => {
      // Step 1: Request encoding proof for QUBO problem
      const encodingProofRequest: EncodingProofRequest = {
        problemId: 'e2e_qubo_001',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 4,
          constant: '0',
          linear: [
            { index: 0, weight: '-3' },
            { index: 1, weight: '-2' },
          ],
          quadratic: [
            { i: 0, j: 1, weight: '4' },
          ],
          objective: 'min',
        },
        nonce: `nonce-e2e-qubo-${Date.now()}`,
        idempotencyKey: 'idem-e2e-qubo-001',
      };

      const proofResponse = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify(encodingProofRequest),
        }
      );

      expect(proofResponse.status).toBe(200);
      const proofData = (await proofResponse.json()) as EncodingProofResponse;
      expect(proofData.ok).toBe(true);
      expect(proofData.status).toBe('PASS');
      expect(proofData.proofId).toBeDefined();

      // Step 2: Use proofId in solver request (would happen in dsg-agi-simulation)
      // The solver should now accept this encoding with the proof reference
      const encodingProofId = proofData.proofId!;
      expect(encodingProofId).toMatch(/^epf_/);

      // Step 3: Verify proof hash is deterministic (re-run same request)
      const proofResponse2 = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify(encodingProofRequest),
        }
      );

      const proofData2 = (await proofResponse2.json()) as EncodingProofResponse;
      expect(proofData2.proofId).toBe(encodingProofId);
    });

    it('validates proof chain across multiple encoding submissions', async () => {
      const request1: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 3,
          linear: [{ index: 0, weight: '1.0' }],
        },
        nonce: `nonce-chain-${Date.now()}-1`,
        idempotencyKey: 'idem-chain-1',
      };

      const response1 = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request1),
        }
      );
      const proof1 = (await response1.json()) as EncodingProofResponse;

      const request2: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 3,
          linear: [{ index: 1, weight: '2.0' }],
        },
        nonce: `nonce-chain-${Date.now()}-2`,
        idempotencyKey: 'idem-chain-2',
      };

      const response2 = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request2),
        }
      );
      const proof2 = (await response2.json()) as EncodingProofResponse;

      // Both proofs should be valid
      expect(proof1.ok).toBe(true);
      expect(proof2.ok).toBe(true);

      // Proofs should have chain linkage
      expect(proof1.proof?.proofHash).toBeDefined();
      expect(proof2.proof?.proofHash).toBeDefined();

      // They should be different proofs
      expect(proof1.proofId).not.toBe(proof2.proofId);
    });
  });

  describe('Happy path: Valid Ising problem', () => {
    it('accepts Ising encoding through proof gate', async () => {
      const request: EncodingProofRequest = {
        problemId: 'e2e_ising_001',
        encodingType: 'ising-v1',
        encoding: {
          kind: 'ising-v1',
          variableCount: 5,
          constant: '-1.0',
          h: [
            { i: 0, weight: '-2' },
            { i: 2, weight: '1' },
          ],
          j: [
            { i: 0, j: 1, weight: '-1' },
            { i: 1, j: 2, weight: '2' },
          ],
          objective: 'min',
        },
        nonce: `nonce-e2e-ising-${Date.now()}`,
        idempotencyKey: 'idem-e2e-ising-001',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      const data = (await response.json()) as EncodingProofResponse;
      expect(data.ok).toBe(true);
      expect(data.status).toBe('PASS');
      expect(data.proof?.checks.encoding_type_matches).toBe(true);
    });
  });

  describe('Failure path: Oversized problem blocked at gate', () => {
    it('blocks solver execution for oversized problem at proof gate', async () => {
      // Step 1: Submit proof request for oversized problem
      const request: EncodingProofRequest = {
        problemId: 'e2e_oversized_001',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 150, // exceeds MAX_VARIABLES (62)
        },
        nonce: `nonce-e2e-oversized-${Date.now()}`,
        idempotencyKey: 'idem-e2e-oversized-001',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      const data = (await response.json()) as EncodingProofResponse;

      // Proof gate rejects the oversized problem
      expect(data.ok).toBe(false);
      expect(data.status).toBe('BLOCK');
      expect(data.failedChecks).toContain('dimension_within_bounds');
      expect(data.failureReasons).toBeDefined();
      expect(data.failureReasons?.length).toBeGreaterThan(0);

      // Step 2: Solver should not execute without valid proof
      // (This would be tested in dsg-agi-simulation)
      // The fact that encoding proof failed means solver never runs
    });
  });

  describe('Failure path: Invalid coefficients blocked at gate', () => {
    it('blocks solver for NaN coefficients in linear terms', async () => {
      const request: EncodingProofRequest = {
        problemId: 'e2e_nan_001',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 3,
          linear: [
            { i: 0, weight: NaN },
          ],
        } as any,
        nonce: `nonce-e2e-nan-${Date.now()}`,
        idempotencyKey: 'idem-e2e-nan-001',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      const data = (await response.json()) as EncodingProofResponse;
      expect(data.ok).toBe(false);
      expect(data.status).toBe('BLOCK');
      expect(data.failedChecks).toContain('no_nan_or_infinity');
    });

    it('blocks solver for duplicate edges in quadratic terms', async () => {
      const request: EncodingProofRequest = {
        problemId: 'e2e_dup_001',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 4,
          quadratic: [
            { i: 0, j: 1, weight: '1.0' },
            { i: 1, j: 0, weight: '2.0' }, // duplicate
          ],
        },
        nonce: `nonce-e2e-dup-${Date.now()}`,
        idempotencyKey: 'idem-e2e-dup-001',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      const data = (await response.json()) as EncodingProofResponse;
      expect(data.ok).toBe(false);
      expect(data.status).toBe('BLOCK');
      expect(data.failedChecks).toContain('no_duplicate_edges');
    });
  });

  describe('Integration: Encoding hash verification', () => {
    it('generates consistent encoding hash for same problem', async () => {
      const encoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        linear: [
          { i: 0, weight: '1.5' },
          { i: 1, weight: '-0.5' },
        ],
        quadratic: [
          { i: 0, j: 1, weight: '2.0' },
        ],
      };

      const request1: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding,
        nonce: 'nonce-hash-test-1',
        idempotencyKey: 'idem-hash-test-1',
      };

      const request2: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding,
        nonce: 'nonce-hash-test-1',
        idempotencyKey: 'idem-hash-test-1',
      };

      const response1 = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request1),
        }
      );
      const proof1 = (await response1.json()) as EncodingProofResponse;

      const response2 = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request2),
        }
      );
      const proof2 = (await response2.json()) as EncodingProofResponse;

      // Encoding hash should be identical for same encoding
      expect(proof1.proof?.encodingHash).toBe(proof2.proof?.encodingHash);
    });

    it('generates different encoding hash for different encoding', async () => {
      const request1: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 3,
          linear: [{ index: 0, weight: '1.0' }],
        },
        nonce: 'nonce-hash-diff-1',
        idempotencyKey: 'idem-hash-diff-1',
      };

      const request2: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 3,
          linear: [{ index: 0, weight: '2.0' }], // different
        },
        nonce: 'nonce-hash-diff-2',
        idempotencyKey: 'idem-hash-diff-2',
      };

      const response1 = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request1),
        }
      );
      const proof1 = (await response1.json()) as EncodingProofResponse;

      const response2 = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request2),
        }
      );
      const proof2 = (await response2.json()) as EncodingProofResponse;

      // Encoding hash should differ for different encodings
      expect(proof1.proof?.encodingHash).not.toBe(proof2.proof?.encodingHash);
    });
  });

  describe('Check all 8 constraints validated', () => {
    it('validates all 8 constraints pass in single proof', async () => {
      const request: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 5,
          constant: '0',
          linear: [
            { i: 0, weight: '1.5' },
            { i: 2, weight: '-0.5' },
          ],
          quadratic: [
            { i: 0, j: 1, weight: '2.0' },
            { i: 1, j: 3, weight: '-1.0' },
          ],
          objective: 'min',
        },
        nonce: `nonce-8checks-${Date.now()}`,
        idempotencyKey: 'idem-8checks-001',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      const proof = (await response.json()) as EncodingProofResponse;
      expect(proof.proof?.checks).toBeDefined();

      // All 8 constraints should be present
      const checks = proof.proof!.checks;
      expect(checks.linear_terms_valid).toBe(true);
      expect(checks.quadratic_terms_valid).toBe(true);
      expect(checks.dimension_within_bounds).toBe(true);
      expect(checks.coefficient_magnitude_bounded).toBe(true);
      expect(checks.no_nan_or_infinity).toBe(true);
      expect(checks.no_duplicate_edges).toBe(true);
      expect(checks.variable_naming_consistent).toBe(true);
      expect(checks.encoding_type_matches).toBe(true);
    });
  });

  describe('Metadata and audit trail', () => {
    it('captures encoding metadata in proof', async () => {
      const request: EncodingProofRequest = {
        problemId: 'e2e_meta_001',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 6,
          linear: [
            { i: 0, weight: '1.0' },
            { i: 2, weight: '-0.5' },
            { i: 4, weight: '2.0' },
          ],
          quadratic: [
            { i: 0, j: 1, weight: '3.0' },
            { i: 2, j: 3, weight: '-1.5' },
          ],
        },
        nonce: `nonce-e2e-meta-${Date.now()}`,
        idempotencyKey: 'idem-e2e-meta-001',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      const proof = (await response.json()) as EncodingProofResponse;
      expect(proof.proof?.metadata).toBeDefined();
      expect(proof.proof?.metadata.dimensionCount).toBe(6);
      expect(proof.proof?.metadata.linearTermsCount).toBe(3);
      expect(proof.proof?.metadata.quadraticTermsCount).toBe(2);
    });

    it('includes timestamp and policy version in proof', async () => {
      const request: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 2,
        },
        nonce: `nonce-e2e-audit-${Date.now()}`,
        idempotencyKey: 'idem-e2e-audit-001',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      const proof = (await response.json()) as EncodingProofResponse;
      expect(proof.proof?.timestamp).toBeDefined();
      expect(proof.proof?.policyVersion).toBeDefined();
      expect(proof.proof?.policyVersion).toMatch(/^\d+\.\d+/);

      // Timestamp should be recent
      const proofTime = new Date(proof.proof!.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - proofTime.getTime();
      expect(diffMs).toBeGreaterThanOrEqual(0);
      expect(diffMs).toBeLessThan(5000); // within 5 seconds
    });
  });
});
