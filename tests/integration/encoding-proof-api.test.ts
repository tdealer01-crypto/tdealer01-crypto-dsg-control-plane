/**
 * Integration tests for Encoding Proof API Route
 */

import { beforeEach, describe, it, expect, vi } from 'vitest';
import { ProblemEncoding } from '@/lib/dsg/deterministic/encoding-proof-types';
import { NextRequest } from 'next/server';

const accessMocks = vi.hoisted(() => ({
  requireDsgAuth: vi.fn(),
  logDsgApiCall: vi.fn(),
  checkGateEntitlement: vi.fn(),
  recordGateEvaluation: vi.fn(),
  applyRateLimit: vi.fn(),
}));

vi.mock('@/lib/dsg/auth/require-dsg-auth', () => ({
  requireDsgAuth: accessMocks.requireDsgAuth,
  dsgAuthError: (caller: { status: number; error: string }) =>
    new Response(JSON.stringify({ ok: false, error: caller.error }), {
      status: caller.status,
      headers: { 'content-type': 'application/json' },
    }),
  logDsgApiCall: accessMocks.logDsgApiCall,
}));

vi.mock('@/lib/dsg/gate-entitlement', () => ({
  checkGateEntitlement: accessMocks.checkGateEntitlement,
  recordGateEvaluation: accessMocks.recordGateEvaluation,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  applyRateLimit: accessMocks.applyRateLimit,
  buildRateLimitHeaders: () => ({
    'x-ratelimit-limit': '60',
    'x-ratelimit-remaining': '59',
  }),
  getRateLimitKey: () => 'encoding-proof-test',
}));

import { POST } from '@/app/api/dsg/v1/encoding/prove/route';

function createRequest(body: any): NextRequest {
  return new NextRequest('http://localhost:3000/api/dsg/v1/encoding/prove', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validQuboBody() {
  return {
    problemId: 'prob_test_001',
    encodingType: 'qubo-v1',
    encoding: {
      kind: 'qubo-v1',
      variableCount: 10,
      constant: '0',
      linear: [{ index: 0, weight: '1.0' }],
      quadratic: [{ i: 0, j: 1, weight: '1.0' }],
    } as ProblemEncoding,
    nonce: 'nonce_123',
    idempotencyKey: 'idem_key_123',
  };
}

describe('Encoding Proof API Route', () => {
  beforeEach(() => {
    accessMocks.requireDsgAuth.mockReset().mockResolvedValue({
      ok: true,
      orgId: 'org_test',
      actorType: 'user',
      userId: 'user_test',
    });
    accessMocks.logDsgApiCall.mockReset().mockResolvedValue(undefined);
    accessMocks.checkGateEntitlement.mockReset().mockResolvedValue({
      allowed: true,
      tier: 'pro',
      message: 'Allowed',
      upgradeUrl: '/pricing',
    });
    accessMocks.recordGateEvaluation.mockReset().mockResolvedValue(undefined);
    accessMocks.applyRateLimit.mockReset().mockResolvedValue({ allowed: true });
  });

  describe('access control', () => {
    it('requires authentication', async () => {
      accessMocks.requireDsgAuth.mockResolvedValueOnce({
        ok: false,
        status: 401,
        error: 'Unauthorized',
      });

      const res = await POST(createRequest(validQuboBody()));
      expect(res.status).toBe(401);
    });

    it('blocks callers without entitlement', async () => {
      accessMocks.checkGateEntitlement.mockResolvedValueOnce({
        allowed: false,
        tier: 'free',
        message: 'Monthly quota exceeded',
        upgradeUrl: '/pricing',
      });

      const res = await POST(createRequest(validQuboBody()));
      expect(res.status).toBe(402);
      const data = await res.json();
      expect(data.requiresUpgrade).toBe(true);
    });

    it('enforces the per-org rate limit', async () => {
      accessMocks.applyRateLimit.mockResolvedValueOnce({ allowed: false });

      const res = await POST(createRequest(validQuboBody()));
      expect(res.status).toBe(429);
    });
  });

  describe('POST /api/dsg/v1/encoding/prove', () => {
    it('should accept valid QUBO encoding and return PASS', async () => {
      const res = await POST(createRequest(validQuboBody()));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.status).toBe('PASS');
      expect(data.proofId).toMatch(/^epf_/);
      expect(data.proof).toBeDefined();
      expect(data.proof.checks.linear_terms_valid).toBe(true);
      expect(data.proof.checks.quadratic_terms_valid).toBe(true);
      expect(accessMocks.recordGateEvaluation).toHaveBeenCalled();
      expect(accessMocks.logDsgApiCall).toHaveBeenCalled();
    });

    it('should accept valid Ising encoding and return PASS', async () => {
      const body = {
        problemId: 'prob_test_002',
        encodingType: 'ising-v1',
        encoding: {
          kind: 'ising-v1',
          variableCount: 5,
          constant: '0',
          h: [{ index: 0, weight: '1.0' }],
          j: [{ i: 0, j: 1, weight: '1.0' }],
        } as ProblemEncoding,
        nonce: 'nonce_456',
        idempotencyKey: 'idem_key_456',
      };

      const res = await POST(createRequest(body));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.status).toBe('PASS');
    });

    it('should return BLOCK for oversized problem with CRITICAL failure', async () => {
      const body = {
        problemId: 'prob_oversized',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 100,
          linear: [{ index: 0, weight: 'NaN' }],
        } as ProblemEncoding,
        nonce: 'nonce_789',
        idempotencyKey: 'idem_key_789',
      };

      const res = await POST(createRequest(body));

      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.status).toBe('BLOCK');
      expect(data.error).toBe('encoding_validation_failed');
      expect(data.failedChecks).toBeDefined();
      expect(data.failureReasons).toBeDefined();
    });

    it('should return REVIEW for oversized problem alone', async () => {
      const body = {
        problemId: 'prob_oversized_review',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 100,
        } as ProblemEncoding,
        nonce: 'nonce_review',
        idempotencyKey: 'idem_key_review',
      };

      const res = await POST(createRequest(body));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.status).toBe('REVIEW');
    });

    it('should return BLOCK for NaN coefficients', async () => {
      const body = {
        problemId: 'prob_nan',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 5,
          linear: [{ index: 0, weight: 'NaN' }],
        } as ProblemEncoding,
        nonce: 'nonce_nan',
        idempotencyKey: 'idem_key_nan',
      };

      const res = await POST(createRequest(body));

      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.status).toBe('BLOCK');
    });

    it('should return REVIEW for minor validation issue', async () => {
      const body = {
        problemId: 'prob_review',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 5,
          constant: '1.5e7',
        } as ProblemEncoding,
        nonce: 'nonce_review',
        idempotencyKey: 'idem_key_review',
      };

      const res = await POST(createRequest(body));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.status).toBe('REVIEW');
    });

    it('should reject missing problemId', async () => {
      const body = {
        encodingType: 'qubo-v1',
        encoding: { kind: 'qubo-v1', variableCount: 5 } as ProblemEncoding,
        nonce: 'nonce_test',
        idempotencyKey: 'idem_key_test',
      };

      const res = await POST(createRequest(body));

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBe('invalid_request_format');
    });

    it('should reject invalid encodingType', async () => {
      const body = {
        problemId: 'prob_invalid_type',
        encodingType: 'invalid-v1',
        encoding: { kind: 'qubo-v1', variableCount: 5 } as ProblemEncoding,
        nonce: 'nonce_test',
        idempotencyKey: 'idem_key_test',
      };

      const res = await POST(createRequest(body));

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
    });

    it('should reject malformed JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/dsg/v1/encoding/prove', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not valid json',
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
    });

    it('should include proof headers in success response', async () => {
      const body = {
        problemId: 'prob_headers_test',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 5,
        } as ProblemEncoding,
        nonce: 'nonce_headers',
        idempotencyKey: 'idem_key_headers',
      };

      const res = await POST(createRequest(body));

      expect(res.headers.get('X-Proof-ID')).toBeTruthy();
      expect(res.headers.get('X-Encoding-Hash')).toBeTruthy();
      expect(res.headers.get('X-Proof-ID')).toMatch(/^epf_/);
      expect(res.headers.get('X-Encoding-Hash')).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should reject encoding.kind mismatch', async () => {
      const body = {
        problemId: 'prob_kind_mismatch',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'ising-v1',
          variableCount: 5,
          h: [{ index: 0, weight: '1.0' }],
        } as ProblemEncoding,
        nonce: 'nonce_mismatch',
        idempotencyKey: 'idem_key_mismatch',
      };

      const res = await POST(createRequest(body));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('invalid_encoding_structure');
    });

    it('should handle empty linear and quadratic arrays', async () => {
      const body = {
        problemId: 'prob_empty_arrays',
        encodingType: 'qubo-v1',
        encoding: {
          kind: 'qubo-v1',
          variableCount: 5,
          linear: [],
          quadratic: [],
        } as ProblemEncoding,
        nonce: 'nonce_empty',
        idempotencyKey: 'idem_key_empty',
      };

      const res = await POST(createRequest(body));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.status).toBe('PASS');
    });

    it('should generate deterministic proofId for same encoding', async () => {
      const encoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        linear: [{ index: 0, weight: '1.0' }],
      } as ProblemEncoding;

      const body1 = {
        problemId: 'prob_det_1',
        encodingType: 'qubo-v1',
        encoding,
        nonce: 'nonce_1',
        idempotencyKey: 'idem_1',
      };

      const body2 = {
        problemId: 'prob_det_2',
        encodingType: 'qubo-v1',
        encoding,
        nonce: 'nonce_2',
        idempotencyKey: 'idem_2',
      };

      const res1 = await POST(createRequest(body1));
      const data1 = await res1.json();

      const res2 = await POST(createRequest(body2));
      const data2 = await res2.json();

      expect(data1.proofId).toBe(data2.proofId);
      expect(data1.proof.encodingHash).toBe(data2.proof.encodingHash);
    });
  });
});
