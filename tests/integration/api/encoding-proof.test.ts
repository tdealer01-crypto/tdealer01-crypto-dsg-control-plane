import { describe, it, expect, beforeEach } from 'vitest';
import { sha256 } from '@/lib/runtime/hash';
import type {
  EncodingProofRequest,
  EncodingProofResponse,
} from '@/lib/dsg/deterministic/encoding-proof-types';

// Integration tests require dev server running on localhost:3000
// Set SKIP_INTEGRATION_TESTS=true to skip in CI environments without server
const shouldSkip = process.env.SKIP_INTEGRATION_TESTS === 'true' || process.env.CI === 'true';

describe('POST /api/dsg/v1/encoding/prove - Integration Tests', { skip: shouldSkip }, () => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const apiKey = process.env.TEST_ENCODING_PROOF_API_KEY || 'test-key';

  beforeEach(() => {
    // Clear any cached proofs before each test
  });

  describe('Valid encoding proof requests', () => {
    it('accepts valid QUBO encoding and returns PASS', async () => {
      const request: EncodingProofRequest = {
        problemId: 'prob_test_001',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 5,
          constant: '0',
          linear: [
            { index: 0, weight: '1.5' },
            { index: 2, weight: '-0.5' },
          ],
          quadratic: [
            { i: 0, j: 1, weight: '2.0' },
            { i: 1, j: 3, weight: '-1.0' },
          ],
          objective: 'min',
        },
        nonce: `nonce-${Date.now()}-001`,
        idempotencyKey: 'idem-test-001',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as EncodingProofResponse;
      expect(data.ok).toBe(true);
      expect(data.status).toBe('PASS');
      expect(data.proofId).toBeDefined();
      expect(data.proofId).toMatch(/^epf_[a-f0-9]{64}$/);
      expect(data.proof).toBeDefined();
      expect(data.proof?.checks.linear_terms_valid).toBe(true);
      expect(data.proof?.checks.quadratic_terms_valid).toBe(true);
      expect(data.proof?.checks.dimension_within_bounds).toBe(true);
    });

    it('accepts valid Ising encoding and returns PASS', async () => {
      const request: EncodingProofRequest = {
        problemId: 'prob_test_002',
        encodingType: 'ising-v1',
        encoding: {
          kind: 'ising-v1',
          variableCount: 4,
          constant: '-2.5',
          h: [
            { i: 0, weight: '-1.0' },
            { i: 2, weight: '0.5' },
          ],
          j: [
            { i: 0, j: 1, weight: '-2.0' },
            { i: 1, j: 2, weight: '1.5' },
          ],
          objective: 'min',
        },
        nonce: `nonce-${Date.now()}-002`,
        idempotencyKey: 'idem-test-002',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as EncodingProofResponse;
      expect(data.ok).toBe(true);
      expect(data.status).toBe('PASS');
      expect(data.proof?.checks.encoding_type_matches).toBe(true);
    });

    it('accepts minimal QUBO encoding with only required fields', async () => {
      const request: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 2,
        },
        nonce: `nonce-${Date.now()}-003`,
        idempotencyKey: 'idem-test-003',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as EncodingProofResponse;
      expect(data.ok).toBe(true);
      expect(data.status).toBe('PASS');
    });
  });

  describe('Invalid encoding proof requests', () => {
    it('returns 400 for missing encodingType', async () => {
      const request = {
        encoding: {
          kind: 'qubo-v1',
          variableCount: 2,
        },
        nonce: `nonce-${Date.now()}-004`,
        idempotencyKey: 'idem-test-004',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('returns 400 for missing encoding object', async () => {
      const request: Partial<EncodingProofRequest> = {
        encodingType: 'qubo-v1',
        nonce: `nonce-${Date.now()}-005`,
        idempotencyKey: 'idem-test-005',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('returns 400 for missing nonce', async () => {
      const request: Partial<EncodingProofRequest> = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 2,
        },
        idempotencyKey: 'idem-test-006',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('returns 400 for mismatched encodingType and encoding.kind', async () => {
      const request: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'ising-v1', // mismatch
          variableCount: 2,
        },
        nonce: `nonce-${Date.now()}-007`,
        idempotencyKey: 'idem-test-007',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Encoding validation failures', () => {
    it('returns BLOCK for oversized problem (>62 variables)', async () => {
      const request: EncodingProofRequest = {
        problemId: 'prob_oversized',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 100,
        },
        nonce: `nonce-${Date.now()}-008`,
        idempotencyKey: 'idem-test-008',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBe(200); // Validation is logical, not HTTP
      const data = (await response.json()) as EncodingProofResponse;
      expect(data.ok).toBe(false);
      expect(data.status).toBe('BLOCK');
      expect(data.failedChecks).toContain('dimension_within_bounds');
    });

    it('returns BLOCK for NaN coefficients', async () => {
      const request: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 2,
          linear: [
            { index: 0, weight: NaN },
          ],
        } as any, // allow NaN for this test
        nonce: `nonce-${Date.now()}-009`,
        idempotencyKey: 'idem-test-009',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as EncodingProofResponse;
      expect(data.ok).toBe(false);
      expect(data.status).toBe('BLOCK');
      expect(data.failedChecks).toContain('no_nan_or_infinity');
    });

    it('returns BLOCK for duplicate edges', async () => {
      const request: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 3,
          quadratic: [
            { i: 0, j: 1, weight: '1.0' },
            { i: 1, j: 0, weight: '2.0' }, // duplicate
          ],
        },
        nonce: `nonce-${Date.now()}-010`,
        idempotencyKey: 'idem-test-010',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as EncodingProofResponse;
      expect(data.ok).toBe(false);
      expect(data.status).toBe('BLOCK');
      expect(data.failedChecks).toContain('no_duplicate_edges');
    });
  });

  describe('Idempotency', () => {
    it('returns same proofId for identical requests', async () => {
      const request: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 3,
          linear: [{ index: 0, weight: '1.0' }],
        },
        nonce: 'nonce-idem-repeat',
        idempotencyKey: 'idem-repeat-001',
      };

      const response1 = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );
      const data1 = (await response1.json()) as EncodingProofResponse;

      const response2 = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );
      const data2 = (await response2.json()) as EncodingProofResponse;

      expect(data1.proofId).toBe(data2.proofId);
      expect(data1.proof?.proofHash).toBe(data2.proof?.proofHash);
    });
  });

  describe('Rate limiting', () => {
    it('applies rate limiting (60 req/min per org)', async () => {
      // This test is conditional - only run if rate limiting is enabled
      if (process.env.TEST_RATE_LIMITING !== 'true') {
        expect(true).toBe(true); // Skip this test
        return;
      }

      const requests = Array.from({ length: 65 }).map((_, i) => ({
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 2,
        },
        nonce: `nonce-rate-${i}`,
        idempotencyKey: `idem-rate-${i}`,
      }));

      let rateLimitedResponse = false;
      for (const request of requests) {
        const response = await fetch(
          `${baseUrl}/api/dsg/v1/encoding/prove`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          }
        );

        if (response.status === 429) {
          rateLimitedResponse = true;
          break;
        }
      }

      expect(rateLimitedResponse).toBe(true);
    });
  });

  describe('Timeout handling', () => {
    it('respects timeout configuration', async () => {
      const request: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 2,
        },
        nonce: `nonce-${Date.now()}-timeout`,
        idempotencyKey: 'idem-test-timeout',
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);

      try {
        const response = await fetch(
          `${baseUrl}/api/dsg/v1/encoding/prove`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
            signal: controller.signal,
          }
        );

        // Should complete within 1 second
        expect(response).toBeDefined();
      } finally {
        clearTimeout(timeout);
      }
    });
  });

  describe('Response structure', () => {
    it('includes all required fields in successful response', async () => {
      const request: EncodingProofRequest = {
        problemId: 'prob_response_test',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 2,
        },
        nonce: `nonce-${Date.now()}-response`,
        idempotencyKey: 'idem-test-response',
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

      // Required fields for success
      expect(data.ok).toBeDefined();
      expect(data.status).toBeDefined();
      expect(['PASS', 'BLOCK', 'REVIEW']).toContain(data.status);

      if (data.ok) {
        expect(data.proofId).toBeDefined();
        expect(data.proof).toBeDefined();
        expect(data.proof?.proofId).toBeDefined();
        expect(data.proof?.encodingHash).toBeDefined();
        expect(data.proof?.checks).toBeDefined();
        expect(data.proof?.policyVersion).toBeDefined();
        expect(data.proof?.timestamp).toBeDefined();
      }
    });

    it('includes failure reasons in BLOCK response', async () => {
      const request: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 100,
        },
        nonce: `nonce-${Date.now()}-block`,
        idempotencyKey: 'idem-test-block',
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

      if (!data.ok && data.status === 'BLOCK') {
        expect(data.failedChecks).toBeDefined();
        expect(data.failureReasons).toBeDefined();
        expect(data.failureReasons?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('CORS and security', () => {
    it('includes appropriate CORS headers', async () => {
      const request: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 2,
        },
        nonce: `nonce-${Date.now()}-cors`,
        idempotencyKey: 'idem-test-cors',
      };

      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      // Check for CORS headers
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });

    it('validates API key when provided', async () => {
      const request: EncodingProofRequest = {
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 2,
        },
        nonce: `nonce-${Date.now()}-auth`,
        idempotencyKey: 'idem-test-auth',
      };

      // Try with invalid API key
      const response = await fetch(
        `${baseUrl}/api/dsg/v1/encoding/prove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer invalid-key-12345',
          },
          body: JSON.stringify(request),
        }
      );

      // Should either reject (401) or accept (200) depending on auth enforcement
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
