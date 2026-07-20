/**
 * LATENCY VALIDATION TEST
 *
 * Validates that delivery-proof reports are generated within SLA (5 minutes).
 * Must validate P95 < 300s and P99 < 420s.
 *
 * Note: This test requires staging environment with:
 * - STRIPE_SECRET_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 * - NEXT_PUBLIC_SUPABASE_URL
 * - Dev server running on localhost:3000
 *
 * Skipped in CI by default; run in staging environment.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const LATENCY_SLA_MS = 300_000; // 5 minutes
const P95_THRESHOLD_MS = 300_000;
const P99_THRESHOLD_MS = 420_000; // 7 minutes (absolute max)

// Skip in CI environment without proper staging credentials
const hasRequiredEnv = Boolean(
  process.env.STRIPE_SECRET_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL
);

describe.skipIf(!hasRequiredEnv)('Delivery-Proof Latency SLA', () => {
  let stripe: Stripe;
  let supabase: ReturnType<typeof createClient>;
  let latencies: number[] = [];

  beforeAll(() => {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  it('should generate delivery-proof report within SLA (5 min)', async () => {
    // Step 1: Create test checkout session
    const startTime = Date.now();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: `latency-test-${Date.now()}@test.local`,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_PRO_MONTHLY!,
          quantity: 1,
        },
      ],
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
    });

    // Step 2: Simulate webhook delivery (would come from Stripe)
    const webhookEvent = {
      id: `evt_test_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: session,
      },
      created: Math.floor(Date.now() / 1000),
    };

    // Step 3: Call delivery-proof scanner
    const scanStartTime = Date.now();

    const response = await fetch(
      'http://localhost:3000/api/delivery-proof/scan',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          checkoutStartTime: startTime,
          webhookEventId: webhookEvent.id,
        }),
      }
    );

    expect(response.ok).toBe(true);
    const result = await response.json();
    const scanEndTime = Date.now();
    const latencyMs = scanEndTime - scanStartTime;

    latencies.push(latencyMs);

    // Assert SLA
    expect(latencyMs).toBeLessThan(LATENCY_SLA_MS);

    // Verify report was created
    expect(result.report).toBeDefined();
    expect(result.deliveredAt).toBeDefined();
  });

  it('should maintain P95 latency under 300s across 20 requests', async () => {
    const samples = 20;

    for (let i = 0; i < samples; i++) {
      const startTime = Date.now();

      const response = await fetch(
        'http://localhost:3000/api/delivery-proof/scan',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deliveryData: {
              orderId: `test-${i}`,
              status: 'completed',
              duration: Math.random() * 3600, // 0-1hr
              attempts: Math.floor(Math.random() * 5) + 1,
            },
          }),
        }
      );

      const endTime = Date.now();
      const latency = endTime - startTime;
      latencies.push(latency);

      expect(response.ok).toBe(true);
    }

    // Calculate percentiles
    const sorted = latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    const p95 = sorted[p95Index];
    const p99 = sorted[p99Index];
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const max = sorted[sorted.length - 1];

    console.log(`
    Latency Metrics (${sorted.length} samples):
    - Average: ${avg.toFixed(0)}ms
    - P95: ${p95.toFixed(0)}ms (threshold: ${P95_THRESHOLD_MS}ms)
    - P99: ${p99.toFixed(0)}ms (threshold: ${P99_THRESHOLD_MS}ms)
    - Max: ${max.toFixed(0)}ms
    - Min: ${sorted[0].toFixed(0)}ms
    `);

    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
    expect(p99).toBeLessThan(P99_THRESHOLD_MS);
  });
});
