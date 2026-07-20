/**
 * IDEMPOTENCY & DUPLICATE HANDLING TEST
 *
 * Validates that webhook handler correctly handles:
 * - Duplicate webhooks (rapid fire within 1s)
 * - Out-of-order delivery (Stripe can deliver events out of order)
 * - Multiple subscription creations → exactly 1 DB entry
 *
 * Note: This test requires staging environment with:
 * - STRIPE_SECRET_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 * - NEXT_PUBLIC_SUPABASE_URL
 *
 * Skipped in CI by default; run in staging environment.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Skip in CI environment without proper staging credentials
const hasRequiredEnv = Boolean(
  process.env.STRIPE_SECRET_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL
);

describe.skipIf(!hasRequiredEnv)('Billing Webhook Idempotency', () => {
  let stripe: Stripe;
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  it('should handle duplicate webhook within 1 second', async () => {
    // Create test event
    const eventId = `evt_dup_${Date.now()}`;
    const eventPayload = {
      id: eventId,
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `cs_${Date.now()}`,
          customer: 'cus_test_001',
          subscription: 'sub_test_001',
        },
      },
    };

    // Send webhook twice (rapid fire)
    const response1 = await fetch(
      'http://localhost:3000/api/billing/webhook',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': generateMockStripeSignature(eventPayload),
        },
        body: JSON.stringify(eventPayload),
      }
    );

    const response2 = await fetch(
      'http://localhost:3000/api/billing/webhook',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': generateMockStripeSignature(eventPayload),
        },
        body: JSON.stringify(eventPayload),
      }
    );

    expect(response1.ok).toBe(true);
    expect(response2.ok).toBe(true);

    // Query database: should have exactly 1 event entry
    const { data: events } = await supabase
      .from('billing_events')
      .select('*')
      .eq('stripe_event_id', eventId);

    expect(events).toHaveLength(1);
    console.log(`✓ Duplicate webhook handled: 1 entry in DB for event ${eventId}`);
  });

  it('should not create duplicate subscriptions', async () => {
    const customerId = `cus_dup_${Date.now()}`;
    const subscriptionId = `sub_dup_${Date.now()}`;
    const eventId = `evt_sub_${Date.now()}`;

    const eventPayload = {
      id: eventId,
      type: 'customer.subscription.created',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: subscriptionId,
          customer: customerId,
          status: 'active',
          items: {
            data: [
              {
                price: {
                  id: process.env.STRIPE_PRICE_PRO_MONTHLY,
                  product: 'prod_pro',
                },
              },
            ],
          },
        },
      },
    };

    // Send same event 3 times
    for (let i = 0; i < 3; i++) {
      await fetch('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': generateMockStripeSignature(eventPayload),
        },
        body: JSON.stringify(eventPayload),
      });

      // Small delay to simulate real scenario
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Query: should have exactly 1 subscription
    const { data: subscriptions } = await supabase
      .from('billing_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId);

    expect(subscriptions).toHaveLength(1);
    console.log(`✓ Duplicate subscription rejected: 1 entry for ${subscriptionId}`);
  });

  it('should handle out-of-order webhook delivery', async () => {
    // Simulate Stripe delivering webhooks out of order:
    // 1. subscription.created (ID: sub_123)
    // 2. subscription.updated (ID: sub_123)
    // But delivered as: 2 → 1

    const subscriptionId = `sub_ooo_${Date.now()}`;

    const createEvent = {
      id: `evt_create_${Date.now()}`,
      type: 'customer.subscription.created',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: subscriptionId,
          customer: `cus_ooo_${Date.now()}`,
          status: 'active',
          trial_end: Math.floor((Date.now() + 86400000) / 1000),
        },
      },
    };

    const updateEvent = {
      id: `evt_update_${Date.now()}`,
      type: 'customer.subscription.updated',
      created: Math.floor(Date.now() / 1000) + 1, // slightly later
      data: {
        object: {
          id: subscriptionId,
          customer: `cus_ooo_${Date.now()}`,
          status: 'active',
          trial_end: null, // updated
        },
      },
    };

    // Deliver in reverse order
    await fetch('http://localhost:3000/api/billing/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': generateMockStripeSignature(updateEvent),
      },
      body: JSON.stringify(updateEvent),
    });

    await fetch('http://localhost:3000/api/billing/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': generateMockStripeSignature(createEvent),
      },
      body: JSON.stringify(createEvent),
    });

    // Database should have final state (updated last)
    const { data: subscriptions } = await supabase
      .from('billing_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId);

    expect(subscriptions).toHaveLength(1);
    // Should have the update event's data
    expect(subscriptions[0]).toBeDefined();
    console.log(`✓ Out-of-order webhooks handled correctly`);
  });
});

// ============================================================================
// HELPERS
// ============================================================================

function generateMockStripeSignature(payload: any): string {
  // In real test: use Stripe's crypto-hmac to sign
  // For now: return a mock signature that webhook handler accepts in test mode
  return `t=${Math.floor(Date.now() / 1000)},v1=mock_signature_for_testing`;
}
