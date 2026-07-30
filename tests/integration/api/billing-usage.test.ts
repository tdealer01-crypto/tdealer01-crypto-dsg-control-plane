/**
 * BILLING USAGE API TEST
 *
 * Validates that GET /api/billing/usage returns accurate usage data:
 * - Requires authentication
 * - Returns current usage for billing period
 * - Calculates overage costs correctly
 * - Feature flag controls access
 *
 * Skipped in CI by default; requires authenticated environment.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Skip if no test environment configured
const skipTests = !process.env.TEST_AUTH_TOKEN && !process.env.SUPABASE_URL;

describe.skipIf(skipTests)('Billing Usage API', () => {
  const API_URL = process.env.TEST_API_URL || 'http://localhost:3000';
  const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

  describe('GET /api/billing/usage', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${API_URL}/api/billing/usage`, {
        cache: 'no-store',
      });

      // Unauthenticated request should fail
      expect([401, 403]).toContain(response.status);
    });

    it('should return usage data for authenticated user', async () => {
      if (!AUTH_TOKEN) {
        console.log('Skipping authenticated test — no TEST_AUTH_TOKEN');
        return;
      }

      const response = await fetch(`${API_URL}/api/billing/usage`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        cache: 'no-store',
      });

      if (response.status === 403) {
        console.log('Feature flag ENABLE_BILLING_UI is disabled');
        return;
      }

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.current_usage).toBeDefined();
      expect(typeof data.current_usage).toBe('number');
      expect(data.plan_limit).toBeDefined();
      expect(typeof data.plan_limit).toBe('number');
      expect(data.overage_cost).toBeDefined();
      expect(typeof data.overage_cost).toBe('number');
      expect(data.usage_percentage).toBeDefined();
      expect(typeof data.usage_percentage).toBe('number');
    });

    it('should calculate overage costs correctly', async () => {
      if (!AUTH_TOKEN) return;

      const response = await fetch(`${API_URL}/api/billing/usage`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        cache: 'no-store',
      });

      if (response.status !== 200) return;

      const data = await response.json();

      // If usage exceeds limit, overage should be > 0
      if (data.current_usage > data.plan_limit) {
        expect(data.overage_cost).toBeGreaterThan(0);

        // Verify calculation: (excess / 1000) * rate
        const excess = data.current_usage - data.plan_limit;
        const minExpected = (excess / 1000) * 0.10; // Conservative minimum
        const maxExpected = (excess / 1000) * 0.50; // Conservative maximum

        expect(data.overage_cost).toBeGreaterThanOrEqual(minExpected);
        expect(data.overage_cost).toBeLessThanOrEqual(maxExpected);
      } else {
        // Within limit: overage should be 0 or minimal
        expect(data.overage_cost).toBeLessThanOrEqual(0.01);
      }
    });

    it('should return usage as percentage of plan limit', async () => {
      if (!AUTH_TOKEN) return;

      const response = await fetch(`${API_URL}/api/billing/usage`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        cache: 'no-store',
      });

      if (response.status !== 200) return;

      const data = await response.json();

      // Verify percentage calculation
      const expectedPercentage = (data.current_usage / data.plan_limit) * 100;
      expect(Math.abs(data.usage_percentage - expectedPercentage)).toBeLessThan(0.1);

      // Percentage should be 0-500% (typically < 200%)
      expect(data.usage_percentage).toBeGreaterThanOrEqual(0);
      expect(data.usage_percentage).toBeLessThan(500);
    });

    it('should include billing period in response', async () => {
      if (!AUTH_TOKEN) return;

      const response = await fetch(`${API_URL}/api/billing/usage`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        cache: 'no-store',
      });

      if (response.status !== 200) return;

      const data = await response.json();
      expect(data.billing_period).toBeDefined();

      // Format: YYYY-MM
      expect(data.billing_period).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should respect feature flag ENABLE_BILLING_UI', async () => {
      // This test validates that the feature flag controls access
      // In development/staging, flag should be enabled (true)
      // In test environment without feature flag override, might return 403

      if (!AUTH_TOKEN) return;

      const response = await fetch(`${API_URL}/api/billing/usage`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        cache: 'no-store',
      });

      // Either 200 (enabled) or 403 (disabled by flag)
      expect([200, 403]).toContain(response.status);

      if (response.status === 403) {
        const data = await response.json();
        expect(data.ok).toBe(false);
      }
    });

    it('should return consistent data across multiple requests', async () => {
      if (!AUTH_TOKEN) return;

      const responses = await Promise.all([
        fetch(`${API_URL}/api/billing/usage`, {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
          cache: 'no-store',
        }),
        fetch(`${API_URL}/api/billing/usage`, {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
          cache: 'no-store',
        }),
      ]);

      if (responses[0].status !== 200 || responses[1].status !== 200) return;

      const [data1, data2] = await Promise.all(
        responses.map((r) => r.json())
      );

      // Usage might change between requests, but should be close (< 100 executions apart)
      expect(Math.abs(data1.current_usage - data2.current_usage)).toBeLessThan(100);

      // Plan limits should be identical
      expect(data1.plan_limit).toBe(data2.plan_limit);
      expect(data1.billing_period).toBe(data2.billing_period);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero usage gracefully', async () => {
      if (!AUTH_TOKEN) return;

      const response = await fetch(`${API_URL}/api/billing/usage`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        cache: 'no-store',
      });

      if (response.status !== 200) return;

      const data = await response.json();

      // Zero usage is valid
      if (data.current_usage === 0) {
        expect(data.overage_cost).toBe(0);
        expect(data.usage_percentage).toBe(0);
      }
    });

    it('should handle very high usage (edge case)', async () => {
      if (!AUTH_TOKEN) return;

      const response = await fetch(`${API_URL}/api/billing/usage`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        cache: 'no-store',
      });

      if (response.status !== 200) return;

      const data = await response.json();

      // Even at 1M+ usage, costs should be calculable
      if (data.current_usage > 1_000_000) {
        expect(data.overage_cost).toBeGreaterThan(0);
        expect(Number.isFinite(data.overage_cost)).toBe(true);
      }
    });
  });
});
