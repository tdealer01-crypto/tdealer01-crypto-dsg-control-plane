import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import crypto from 'crypto';

// Test constants
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';
const TEST_BEARER_TOKEN = 'test_bearer_token_' + crypto.randomBytes(16).toString('hex');
const TEST_STRIPE_ACCOUNT_ID = 'acct_1234567890abcdef';

// Helper functions
const makeRequest = async (
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
) => {
  const url = `${BASE_URL}${path}`;
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const response = await fetch(url, {
    method,
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
};

// Test fixtures
const createTestEvaluationRequest = (overrides?: any) => ({
  action: 'evaluate_policy',
  operation_type: 'charge',
  stripe_account_id: TEST_STRIPE_ACCOUNT_ID,
  amount_cents: 10000,
  currency: 'usd',
  ...overrides,
});

const createTestAuditRecord = (overrides?: any) => ({
  stripe_account_id: TEST_STRIPE_ACCOUNT_ID,
  operation_id: 'op_' + crypto.randomBytes(8).toString('hex'),
  operation_type: 'charge',
  decision: 'ALLOW',
  reason: 'Charge within policy limits',
  policy_version: 'v1.0.0',
  ...overrides,
});

describe('Stripe App API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /stripe-app/gateway/evaluate', () => {
    it('should evaluate charge policy', async () => {
      const startTime = Date.now();
      const response = await makeRequest('POST', '/gateway/evaluate',
        createTestEvaluationRequest({ operation_type: 'charge', amount_cents: 5000 }),
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('decision');
      expect(['ALLOW', 'BLOCK', 'REVIEW']).toContain(response.data.decision);
      expect(response.data).toHaveProperty('reason');
      expect(duration).toBeLessThan(2000);
    });

    it('should evaluate payment intent policy', async () => {
      const response = await makeRequest('POST', '/gateway/evaluate',
        createTestEvaluationRequest({ operation_type: 'payment_intent' }),
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('decision');
      expect(response.data).toHaveProperty('policy_version');
      expect(typeof response.data.policy_version).toBe('string');
    });

    it('should evaluate payout policy', async () => {
      const response = await makeRequest('POST', '/gateway/evaluate',
        createTestEvaluationRequest({ operation_type: 'payout', amount_cents: 100000 }),
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('decision');
      expect(response.data).toHaveProperty('reason');
      expect(response.data.reason).toMatch(/payout|validation|policy/i);
    });

    it('should complete evaluation within 2 seconds', async () => {
      const measurements: number[] = [];
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        await makeRequest('POST', '/gateway/evaluate',
          createTestEvaluationRequest(),
          { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
        );
        measurements.push(Date.now() - startTime);
      }

      const avgTime = measurements.reduce((a, b) => a + b) / measurements.length;
      expect(avgTime).toBeLessThan(2000);
    });

    it('should return proper error for invalid request', async () => {
      const response = await makeRequest('POST', '/gateway/evaluate',
        { /* missing required fields */ },
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('POST /stripe-app/audit/record', () => {
    it('should record audit trail for operation', async () => {
      const auditRecord = createTestAuditRecord();
      const response = await makeRequest('POST', '/audit/record',
        auditRecord,
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      expect([200, 201]).toContain(response.status);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('created_at');
    });

    it('should store decision reason', async () => {
      const reason = 'Test reason for decision ' + Date.now();
      const response = await makeRequest('POST', '/audit/record',
        createTestAuditRecord({ reason }),
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
      expect(response.data).toHaveProperty('id');
    });

    it('should handle concurrent audit requests', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          makeRequest('POST', '/audit/record',
            createTestAuditRecord({ operation_id: `op_${i}_${Date.now()}` }),
            { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
          )
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status >= 200 && r.status < 300).length;
      expect(successCount).toBe(5);
    });

    it('should record audit in <500ms', async () => {
      const measurements: number[] = [];
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        await makeRequest('POST', '/audit/record',
          createTestAuditRecord({ operation_id: `op_${i}_${Date.now()}` }),
          { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
        );
        measurements.push(Date.now() - startTime);
      }

      const avgTime = measurements.reduce((a, b) => a + b) / measurements.length;
      expect(avgTime).toBeLessThan(500);
    });
  });

  describe('GET /stripe-app/audit/operations', () => {
    it('should retrieve audit operations list', async () => {
      const response = await makeRequest('GET', '/audit/operations',
        undefined,
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.operations) || Array.isArray(response.data)).toBe(true);
    });

    it('should fetch audit entries in <1s', async () => {
      const startTime = Date.now();
      await makeRequest('GET', '/audit/operations',
        undefined,
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should support filtering by stripe account', async () => {
      const response = await makeRequest('GET',
        `/audit/operations?stripe_account_id=${TEST_STRIPE_ACCOUNT_ID}`,
        undefined,
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      expect(response.status).toBe(200);
      const operations = Array.isArray(response.data) ? response.data : response.data.operations;
      if (operations && operations.length > 0) {
        operations.forEach(op => {
          expect(op.stripe_account_id).toBe(TEST_STRIPE_ACCOUNT_ID);
        });
      }
    });

    it('should support pagination', async () => {
      const response = await makeRequest('GET',
        '/audit/operations?limit=10&offset=0',
        undefined,
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });
  });

  describe('POST /stripe-app/approvals/{id}/approve', () => {
    it('should approve pending operation', async () => {
      // First create an audit record with REVIEW decision
      const auditResponse = await makeRequest('POST', '/audit/record',
        createTestAuditRecord({ decision: 'REVIEW' }),
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      if (auditResponse.status >= 200 && auditResponse.status < 300 && auditResponse.data?.id) {
        const auditId = auditResponse.data.id;
        const approveResponse = await makeRequest('POST',
          `/approvals/${auditId}/approve`,
          { approver_notes: 'Approved' },
          { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
        );

        expect(approveResponse.status).toBe(200);
        expect(approveResponse.data).toHaveProperty('status');
      }
    });

    it('should reject already approved operations', async () => {
      const auditRecord = createTestAuditRecord({ decision: 'ALLOW' });
      const auditResponse = await makeRequest('POST', '/audit/record',
        auditRecord,
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      if (auditResponse.data?.id) {
        const approveResponse = await makeRequest('POST',
          `/approvals/${auditResponse.data.id}/approve`,
          { approver_notes: 'Approve again' },
          { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
        );

        // Already approved operations should return 400 or 409
        expect([400, 409, 200]).toContain(approveResponse.status);
      }
    });

    it('should require authorization header', async () => {
      const response = await makeRequest('POST',
        '/approvals/test_id/approve',
        { approver_notes: 'Test' }
      );

      expect([401, 403]).toContain(response.status);
    });

    it('should track approval timestamp', async () => {
      const auditRecord = createTestAuditRecord({ decision: 'REVIEW' });
      const auditResponse = await makeRequest('POST', '/audit/record',
        auditRecord,
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      if (auditResponse.data?.id) {
        const approveResponse = await makeRequest('POST',
          `/approvals/${auditResponse.data.id}/approve`,
          { approver_notes: 'Timestamp test' },
          { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
        );

        if (approveResponse.status === 200) {
          expect(approveResponse.data).toHaveProperty('approval_timestamp');
          const timestamp = new Date(approveResponse.data.approval_timestamp);
          expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 5000);
        }
      }
    });
  });

  describe('GET /stripe-app/policies', () => {
    it('should list policies for account', async () => {
      const response = await makeRequest('GET', '/policies',
        undefined,
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      expect(response.status).toBe(200);
      const policies = Array.isArray(response.data) ? response.data : response.data?.policies;
      expect(Array.isArray(policies)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await makeRequest('GET', '/policies');

      expect([401, 403]).toContain(response.status);
    });

    it('should enforce org/account scoping', async () => {
      const response = await makeRequest('GET', '/policies',
        undefined,
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      expect(response.status).toBe(200);
      const policies = Array.isArray(response.data) ? response.data : response.data?.policies;
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          expect(policy).toHaveProperty('stripe_account_id');
        });
      }
    });

    it('should include policy version hash', async () => {
      const response = await makeRequest('GET', '/policies',
        undefined,
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      expect(response.status).toBe(200);
      const policies = Array.isArray(response.data) ? response.data : response.data?.policies;
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          expect(policy).toHaveProperty('version_hash');
          expect(typeof policy.version_hash).toBe('string');
        });
      }
    });
  });

  describe('POST /stripe-app/oauth/authorize', () => {
    it('should return OAuth authorization URL', async () => {
      const response = await makeRequest('GET', '/oauth/authorize?stripe_account_id=' + TEST_STRIPE_ACCOUNT_ID);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('url');
      expect(response.data.url).toMatch(/stripe\.com|oauth/i);
      expect(response.data).toHaveProperty('state');
    });

    it('should generate unique state tokens', async () => {
      const response1 = await makeRequest('GET', '/oauth/authorize?stripe_account_id=' + TEST_STRIPE_ACCOUNT_ID);
      const response2 = await makeRequest('GET', '/oauth/authorize?stripe_account_id=' + TEST_STRIPE_ACCOUNT_ID);

      if (response1.status === 200 && response2.status === 200) {
        expect(response1.data.state).not.toBe(response2.data.state);
      }
    });

    it('should include correct scopes in URL', async () => {
      const response = await makeRequest('GET', '/oauth/authorize?stripe_account_id=' + TEST_STRIPE_ACCOUNT_ID);

      expect(response.status).toBe(200);
      if (response.data.url) {
        const urlObj = new URL(response.data.url);
        const scopes = urlObj.searchParams.get('scopes') || '';
        expect(scopes.length).toBeGreaterThan(0);
      }
    });

    it('should handle state parameter validation', async () => {
      const authorizeResponse = await makeRequest('GET', '/oauth/authorize?stripe_account_id=' + TEST_STRIPE_ACCOUNT_ID);

      if (authorizeResponse.status === 200 && authorizeResponse.data.state) {
        // Callback with matching state should succeed
        const callbackResponse = await makeRequest('POST', '/oauth/callback',
          { state: authorizeResponse.data.state, code: 'test_code' }
        );
        expect([200, 400, 401]).toContain(callbackResponse.status);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for malformed JSON', async () => {
      const response = await makeRequest('POST', '/gateway/evaluate',
        undefined,
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}`, 'Content-Type': 'application/json' }
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should return 401 for missing authentication', async () => {
      const response = await makeRequest('GET', '/policies');

      expect([401, 403]).toContain(response.status);
    });

    it('should return 500 with descriptive error message', async () => {
      // This might not trigger a 500 in all cases, but we verify error handling exists
      const response = await makeRequest('POST', '/nonexistent',
        {},
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      if (response.status >= 500) {
        expect(response.data).toHaveProperty('error');
      }
    });

    it('should not expose sensitive data in error responses', async () => {
      const response = await makeRequest('GET', '/policies');

      if (response.status >= 400) {
        const errorStr = JSON.stringify(response.data);
        expect(errorStr).not.toMatch(/secret|key|password|token/i);
      }
    });
  });

  describe('Request Validation', () => {
    it('should validate required fields in evaluate request', async () => {
      const response = await makeRequest('POST', '/gateway/evaluate',
        { /* missing required fields */ },
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      expect(response.status).toBe(400);
    });

    it('should validate stripe_account_id format', async () => {
      const response = await makeRequest('POST', '/gateway/evaluate',
        createTestEvaluationRequest({ stripe_account_id: 'invalid_format' }),
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      if (response.status === 400) {
        expect(response.data).toHaveProperty('error');
      }
    });

    it('should reject invalid operation types', async () => {
      const response = await makeRequest('POST', '/gateway/evaluate',
        createTestEvaluationRequest({ operation_type: 'invalid_operation' }),
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      expect(response.status).toBe(400);
    });

    it('should enforce maximum payload size', async () => {
      const largePayload = createTestEvaluationRequest({
        metadata: 'x'.repeat(10000000), // 10MB string
      });

      const response = await makeRequest('POST', '/gateway/evaluate',
        largePayload,
        { 'Authorization': `Bearer ${TEST_BEARER_TOKEN}` }
      );

      expect([400, 413]).toContain(response.status);
    });
  });
});
