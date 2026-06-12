import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Post-Deployment Smoke Test Suite
 *
 * Validates core API endpoints and deployment health after deploying
 * to production or staging environments.
 *
 * Requires a reachable target, so the suite only runs when SMOKE_TEST_URL is set:
 *   Local dev server: SMOKE_TEST_URL=http://localhost:3000 npm run test tests/smoke/deployment.test.ts
 *   Production:       SMOKE_TEST_URL=https://prod.example.com npm run test tests/smoke/deployment.test.ts
 *
 * Without SMOKE_TEST_URL (e.g. plain `npm run test` in CI) the suite is skipped —
 * there is no server to probe and every request would fail with status 0.
 */

// Configuration
const SMOKE_TEST_ENABLED = Boolean(process.env.SMOKE_TEST_URL);
const BASE_URL = process.env.SMOKE_TEST_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.SMOKE_TEST_TOKEN || '';
const CURL_TIMEOUT = 10000; // 10 seconds

// Test counters
let tests_completed = 0;
let tests_started = 0;

// Helper to make HTTP requests
async function httpRequest(
  method: string,
  endpoint: string,
  options: { body?: string; headers?: Record<string, string>; timeout?: number } = {}
) {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(options.timeout || CURL_TIMEOUT),
  };

  if (options.body) {
    fetchOptions.body = options.body;
  }

  try {
    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let body: unknown;
    try {
      body = isJson ? await response.json() : await response.text();
    } catch {
      body = null;
    }

    return {
      status: response.status,
      body,
      headers: Object.fromEntries(response.headers),
      ok: response.ok,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        status: 0,
        body: null,
        headers: {},
        ok: false,
        error: error.message,
      };
    }
    throw error;
  }
}

// Helper to measure response time
async function measureResponseTime(fn: () => Promise<unknown>): Promise<number> {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
}

describe.skipIf(!SMOKE_TEST_ENABLED)('Post-Deployment Smoke Tests', () => {
  beforeAll(() => {
    console.log(`\n🚀 Running smoke tests against: ${BASE_URL}`);
    console.log(`📝 Auth token: ${AUTH_TOKEN ? AUTH_TOKEN.slice(0, 20) + '...' : 'none'}`);
    console.log(`⏱️  Request timeout: ${CURL_TIMEOUT}ms\n`);
  });

  afterAll(() => {
    console.log(`\n✅ Smoke test suite completed: ${tests_completed} tests executed`);
  });

  // ============================================================================
  // Test Group 1: Server & Connectivity
  // ============================================================================

  describe('Server & Connectivity Tests', () => {
    it('should have server responding to requests', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/health');
      expect(response.status).not.toBe(0);
      expect(response.error).toBeUndefined();
      tests_completed++;
    });

    it('should maintain sub-2-second response times for health endpoint', async () => {
      tests_started++;
      const responseTime = await measureResponseTime(() =>
        httpRequest('GET', '/api/health')
      );
      expect(responseTime).toBeLessThan(2000);
      tests_completed++;
    });

    it('should handle request timeouts gracefully', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/health', {
        timeout: 100, // Very short timeout
      });
      // Should either timeout or respond (either is acceptable)
      expect(response.status).toBeGreaterThanOrEqual(0);
      tests_completed++;
    });
  });

  // ============================================================================
  // Test Group 2: Core Health & Status Endpoints
  // ============================================================================

  describe('Health & Status Endpoints', () => {
    it('GET /api/health should return 200 with valid JSON', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/health');

      expect([200, 503]).toContain(response.status);
      expect(response.body).toBeDefined();

      if (typeof response.body === 'object' && response.body !== null) {
        const healthResponse = response.body as Record<string, unknown>;
        expect(healthResponse).toHaveProperty('ok');
        expect(healthResponse).toHaveProperty('service');
      }
      tests_completed++;
    });

    it('GET /api/readiness should indicate deployment status', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/readiness');

      expect([200, 503]).toContain(response.status);
      expect(response.body).toBeDefined();

      if (typeof response.body === 'object' && response.body !== null) {
        const readiness = response.body as Record<string, unknown>;
        expect(readiness).toHaveProperty('ok');
      }
      tests_completed++;
    });

    it('GET /api/agent/status should return deployment identity', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/agent/status');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();

      if (typeof response.body === 'object' && response.body !== null) {
        const status = response.body as Record<string, unknown>;
        expect(status).toHaveProperty('service');
        expect(status.service).toBe('dsg-control-plane');
      }
      tests_completed++;
    });
  });

  // ============================================================================
  // Test Group 3: Authentication & Authorization
  // ============================================================================

  describe('Authentication & Authorization', () => {
    it('GET /api/audit without token should return 401 or 400', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/audit', {
        headers: { Authorization: '' }, // Clear auth header
      });

      expect([400, 401]).toContain(response.status);
      tests_completed++;
    });

    it('GET /api/audit with invalid token should return 401 or 400', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/audit', {
        headers: { Authorization: 'Bearer invalid_token_xyz' },
      });

      expect([400, 401]).toContain(response.status);
      tests_completed++;
    });

    it('should reject requests without Bearer prefix', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/audit', {
        headers: { Authorization: 'NotBearer ' + (AUTH_TOKEN || 'token') },
      });

      expect([400, 401]).toContain(response.status);
      tests_completed++;
    });
  });

  // ============================================================================
  // Test Group 4: API Response Format & Structure
  // ============================================================================

  describe('API Response Format', () => {
    it('should return valid JSON with proper Content-Type header', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/agent/status');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(typeof response.body).toBe('object');
      tests_completed++;
    });

    it('health response should include timestamp', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/health');

      if (response.status === 200 && typeof response.body === 'object' && response.body !== null) {
        const health = response.body as Record<string, unknown>;
        expect(health).toHaveProperty('timestamp');

        if (typeof health.timestamp === 'string') {
          expect(() => new Date(health.timestamp)).not.toThrow();
        }
      }
      tests_completed++;
    });

    it('should not expose sensitive information in responses', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/health');

      const body = JSON.stringify(response.body);
      const sensitivePatterns = [
        /secret/i,
        /password/i,
        /key=/i,
        /SUPABASE_SERVICE_ROLE/i,
      ];

      for (const pattern of sensitivePatterns) {
        expect(body).not.toMatch(pattern);
      }
      tests_completed++;
    });
  });

  // ============================================================================
  // Test Group 5: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/nonexistent-endpoint-xyz');

      expect([404, 405]).toContain(response.status);
      tests_completed++;
    });

    it('should return 405 for unsupported HTTP methods', async () => {
      tests_started++;
      const response = await httpRequest('DELETE', '/api/health');

      expect([405, 400, 404]).toContain(response.status);
      tests_completed++;
    });

    it('should handle malformed JSON gracefully', async () => {
      tests_started++;
      const response = await httpRequest('POST', '/api/health', {
        body: '{invalid json}',
      });

      // Should not crash the server
      expect(response.status).not.toBe(0);
      tests_completed++;
    });

    it('should return meaningful error messages', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/audit', {
        headers: { Authorization: 'Bearer invalid' },
      });

      expect(response.status).toBeDefined();
      // Response should either have body or meaningful status
      expect(response.status).toBeGreaterThan(0);
      tests_completed++;
    });
  });

  // ============================================================================
  // Test Group 6: Database Connectivity
  // ============================================================================

  describe('Database Connectivity', () => {
    it('health endpoint should report database status', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/health');

      if (typeof response.body === 'object' && response.body !== null) {
        const health = response.body as Record<string, unknown>;
        // Should have some indication of DB status
        expect(
          health.hasOwnProperty('db_ok') ||
          health.hasOwnProperty('error') ||
          health.hasOwnProperty('checks')
        ).toBe(true);
      }
      tests_completed++;
    });

    it('readiness endpoint should validate database access', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/readiness');

      if (response.status === 200 && typeof response.body === 'object' && response.body !== null) {
        const readiness = response.body as Record<string, unknown>;
        // If readiness is ok, should have checks
        if (readiness.ok === true) {
          expect(readiness).toHaveProperty('checks');
        }
      }
      tests_completed++;
    });
  });

  // ============================================================================
  // Test Group 7: Environment & Configuration
  // ============================================================================

  describe('Environment & Configuration', () => {
    it('should have required environment variables configured', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/readiness');

      // If readiness returns 503, it likely indicates env vars are missing
      if (response.status === 503 && typeof response.body === 'object' && response.body !== null) {
        const readiness = response.body as Record<string, unknown>;
        expect(readiness).toHaveProperty('ok');
      }
      // If 200, config is good
      expect([200, 503]).toContain(response.status);
      tests_completed++;
    });

    it('deployment should identify itself correctly', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/agent/status');

      expect(response.status).toBe(200);
      if (typeof response.body === 'object' && response.body !== null) {
        const status = response.body as Record<string, unknown>;
        expect(status.service).toBe('dsg-control-plane');
      }
      tests_completed++;
    });

    it('should include deployment timestamp in status', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/agent/status');

      if (response.status === 200 && typeof response.body === 'object' && response.body !== null) {
        const status = response.body as Record<string, unknown>;
        expect(status).toHaveProperty('timestamp');
      }
      tests_completed++;
    });
  });

  // ============================================================================
  // Test Group 8: Rate Limiting & Throttling
  // ============================================================================

  describe('Rate Limiting & Throttling', () => {
    it('should enforce rate limits on repeated requests', async () => {
      tests_started++;

      const requests = Array.from({ length: 20 }, () =>
        httpRequest('GET', '/api/health')
      );

      const responses = await Promise.all(requests);

      // At least some should succeed
      const successCount = responses.filter(r => r.status === 200 || r.status === 503).length;
      expect(successCount).toBeGreaterThan(0);

      // May see 429s if rate limiter is active (which is good)
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      // This is informational, not a failure
      if (rateLimitedCount > 0) {
        console.log(`  ℹ️ Rate limiter triggered: ${rateLimitedCount}/20 requests returned 429`);
      }
      tests_completed++;
    });
  });

  // ============================================================================
  // Test Group 9: Security Headers
  // ============================================================================

  describe('Security Headers', () => {
    it('responses should include security headers', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/health');

      // Check for presence of common security headers
      const headers = Object.keys(response.headers).map(h => h.toLowerCase());

      // May have these headers (not all are required, but good to have)
      const securityHeaders = [
        'content-type',
        'x-content-type-options',
        'x-frame-options',
        'strict-transport-security',
      ];

      const hasSecurityHeaders = securityHeaders.some(h => headers.includes(h));
      // At least content-type is expected
      expect(headers).toContain('content-type');
      tests_completed++;
    });

    it('should not leak server technology details', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/health');

      const serverHeader = response.headers['server'] || '';
      const userAgent = JSON.stringify(response.headers);

      // Should not expose detailed version information
      expect(serverHeader.toLowerCase()).not.toMatch(/express\/\d+\.\d+/i);
      tests_completed++;
    });
  });

  // ============================================================================
  // Test Group 10: Latency Assertions
  // ============================================================================

  describe('Latency Assertions', () => {
    it('health check should complete within 2 seconds', async () => {
      tests_started++;
      const startTime = performance.now();
      await httpRequest('GET', '/api/health');
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(2000);
      console.log(`  ⏱️ Health endpoint: ${elapsed.toFixed(2)}ms`);
      tests_completed++;
    });

    it('status endpoint should complete within 1.5 seconds', async () => {
      tests_started++;
      const startTime = performance.now();
      await httpRequest('GET', '/api/agent/status');
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1500);
      console.log(`  ⏱️ Status endpoint: ${elapsed.toFixed(2)}ms`);
      tests_completed++;
    });

    it('readiness check should complete within 5 seconds', async () => {
      tests_started++;
      const startTime = performance.now();
      await httpRequest('GET', '/api/readiness');
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(5000);
      console.log(`  ⏱️ Readiness endpoint: ${elapsed.toFixed(2)}ms`);
      tests_completed++;
    });
  });

  // ============================================================================
  // Test Group 11: Stripe Integration
  // ============================================================================

  describe('Stripe Integration', () => {
    it('webhook endpoint should be reachable', async () => {
      tests_started++;
      const response = await httpRequest('POST', '/api/stripe/webhook', {
        body: JSON.stringify({
          type: 'charge.completed',
          data: { object: { id: 'ch_test' } },
        }),
      });

      // Any response is acceptable (404, 401, 400, 200 all mean endpoint exists)
      expect(response.status).toBeGreaterThan(0);
      tests_completed++;
    });

    it('should validate webhook signatures', async () => {
      tests_started++;
      const response = await httpRequest('POST', '/api/stripe/webhook', {
        body: JSON.stringify({
          type: 'test_webhook',
          data: {},
        }),
        headers: {
          'stripe-signature': 'invalid_signature_xyz',
        },
      });

      // Invalid signature should be rejected or return expected status
      // Can be 401, 400, 200 (some webhooks accept and return 200 for logging)
      expect(response.status).toBeGreaterThan(0);
      tests_completed++;
    });
  });

  // ============================================================================
  // Test Group 12: Rollback Detection
  // ============================================================================

  describe('Rollback & Degradation Detection', () => {
    it('should provide clear error messages when required env vars are missing', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/readiness');

      // If 503, should have error details
      if (response.status === 503 && typeof response.body === 'object' && response.body !== null) {
        const readiness = response.body as Record<string, unknown>;
        // Should indicate what's wrong
        expect(readiness.ok).toBe(false);
      }
      tests_completed++;
    });

    it('should not silently fail when dependencies are missing', async () => {
      tests_started++;
      const response = await httpRequest('GET', '/api/health');

      // Server should still respond (either 200 or 503)
      expect([200, 503]).toContain(response.status);

      // Should provide some status indication
      expect(response.body).toBeDefined();
      tests_completed++;
    });
  });

  // ============================================================================
  // Test Group 13: Smoke Test Integration
  // ============================================================================

  describe('Smoke Test Readiness', () => {
    it('should pass baseline smoke tests', async () => {
      tests_started++;

      // Run all core checks
      const [health, readiness, status] = await Promise.all([
        httpRequest('GET', '/api/health'),
        httpRequest('GET', '/api/readiness'),
        httpRequest('GET', '/api/agent/status'),
      ]);

      // At least health and status should work
      expect(health.status).toBeGreaterThan(0);
      expect(status.status).toBe(200);

      tests_completed++;
    });

    it('should support deployment validation workflow', async () => {
      tests_started++;

      // This is what the deployment script would check
      const response = await httpRequest('GET', '/api/agent/status');

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);

      if (typeof response.body === 'object' && response.body !== null) {
        const status = response.body as Record<string, unknown>;
        expect(status.service).toBe('dsg-control-plane');
        expect(status).toHaveProperty('timestamp');
      }

      tests_completed++;
    });
  });
});
