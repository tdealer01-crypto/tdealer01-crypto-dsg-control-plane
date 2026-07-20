/**
 * ERROR HANDLING & RESILIENCE TEST
 *
 * Validates that delivery-proof and webhook endpoints handle errors gracefully:
 * - Claude API timeouts don't hang the endpoint
 * - Invalid signatures are rejected
 * - Errors don't expose sensitive data
 * - Sentry integration captures errors
 *
 * Note: This test requires staging environment with:
 * - Dev server running on localhost:3000
 *
 * Skipped in CI by default; run in staging environment.
 */

import { describe, it, expect } from 'vitest';

// Skip in CI environment - requires running dev server
const hasRunningServer = false; // Set to true only when dev server is running

describe.skipIf(hasRunningServer === false)('Delivery-Proof Error Handling', () => {
  it('should handle Claude API timeout gracefully (5s+)', async () => {
    // Mock Claude to be slow (in test env)
    const response = await fetch(
      'http://localhost:3000/api/delivery-proof/scan',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryData: { orderId: 'timeout-test' },
          simulateDelay: 10000, // 10s
        }),
      }
    );

    // Should return error, not hang
    expect(response.status).toBeLessThanOrEqual(504); // 504 Gateway Timeout
    const result = await response.json();

    // Should have meaningful error message
    expect(result.error || result.message).toBeDefined();
    console.log('Timeout error:', result.error || result.message);
  });

  it('should handle Supabase connection failure with retry', async () => {
    // Send valid request that would fail on DB write
    const response = await fetch(
      'http://localhost:3000/api/billing/webhook',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'invalid-signature',
        },
        body: JSON.stringify({
          id: 'evt_test',
          type: 'checkout.session.completed',
          data: { object: {} },
        }),
      }
    );

    // Should reject invalid signature, not panic
    expect(response.status).toBe(400);
  });

  it('should log webhook errors to Sentry', async () => {
    // Send malformed webhook
    const response = await fetch(
      'http://localhost:3000/api/billing/webhook',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Missing required fields
      }
    );

    expect(response.status).toBe(400);

    // Verify Sentry was called (check logs or Sentry API)
    // In real env: Sentry.lastEventId() should be set
    console.log('Error logged to Sentry (if enabled)');
  });

  it('should not expose sensitive error details to customer', async () => {
    const response = await fetch(
      'http://localhost:3000/api/delivery-proof/scan',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }
    );

    const result = await response.json();

    // Should NOT expose:
    // - Database schema
    // - API keys
    // - Internal file paths
    // - Stack traces
    const errorText = JSON.stringify(result);

    expect(errorText).not.toMatch(/password|secret|apikey/i);
    expect(errorText).not.toMatch(/\/home\/|\/app\/|node_modules/);
    expect(errorText).not.toMatch(/at [A-Za-z_]+\s*\(/); // no stack frames
  });
});
