// tests/integration/metered-billing.test.ts
// Integration tests for Stripe metered billing → Supabase sync

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock Stripe (no real API calls)
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      billing: {
        meterEvents: {
          create: vi.fn().mockResolvedValue({
            id: 'evt_test_001',
            event_name: 'policy_evaluations_overage',
            identifier: 'sub_test_001',
            value: '1000',
            timestamp: Math.floor(Date.now() / 1000),
          }),
        },
      },
    })),
  };
});

// Live suite: requires a running app server on localhost:3000 AND a real
// Supabase project AND an explicit opt-in.
//
// Skipped unless RUN_METERED_BILLING_LIVE=1 is set, even when the
// service-role key / URL are present. Reason: every test in this suite
// fetches http://localhost:3000/api/revenue/events, so it can only pass
// with a locally running dev server plus configured
// INTERNAL_SERVICE_TOKEN / CRON_SECRET. In CI the server is not started
// and SUPABASE_SERVICE_ROLE_KEY is not injected into the vitest step, so
// createClient() throws "supabaseKey is required" before any assertion
// runs. Gate behind an explicit opt-in like the other live-DB suites
// (see tests/integration/delegation-end-to-end.test.ts).
describe.skipIf(
  process.env.RUN_METERED_BILLING_LIVE !== '1' ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
)('Metered Billing Integration', () => {
  let supabase: any;

  beforeEach(() => {
    // Initialize Supabase client (uses TEST environment variables)
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );
  });

  describe('POST /api/revenue/events', () => {
    it('should record usage event and return success', async () => {
      const payload = {
        org_id: 'org_test_001',
        event_name: 'policy_evaluations',
        quantity: 1000,
        idempotency_key: 'idem_001',
      };

      const response = await fetch('http://localhost:3000/api/revenue/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.event_name).toBe('policy_evaluations');
      expect(result.quantity).toBe(1000);
    });

    it('should reject missing authorization', async () => {
      const payload = {
        org_id: 'org_test_001',
        event_name: 'policy_evaluations',
        quantity: 1000,
      };

      const response = await fetch('http://localhost:3000/api/revenue/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const payload = {
        org_id: 'org_test_001',
        event_name: 'policy_evaluations',
        // missing quantity
      };

      const response = await fetch('http://localhost:3000/api/revenue/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('required fields');
    });

    it('should reject negative quantity', async () => {
      const payload = {
        org_id: 'org_test_001',
        event_name: 'policy_evaluations',
        quantity: -100,
      };

      const response = await fetch('http://localhost:3000/api/revenue/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
    });

    it('should support custom timestamps', async () => {
      const customTime = new Date('2026-07-08T10:00:00Z').toISOString();
      const payload = {
        org_id: 'org_test_001',
        event_name: 'policy_evaluations',
        quantity: 500,
        timestamp: customTime,
      };

      const response = await fetch('http://localhost:3000/api/revenue/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
    });

    it('should handle missing subscription gracefully', async () => {
      const payload = {
        org_id: 'org_no_subscription_001',
        event_name: 'policy_evaluations',
        quantity: 100,
      };

      const response = await fetch('http://localhost:3000/api/revenue/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.metered_event_id).toBeNull();
      expect(result.note).toContain('subscription not found');
    });

    it('should return health status on GET', async () => {
      const response = await fetch('http://localhost:3000/api/revenue/events', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.service).toBe('revenue-events');
      expect(['ready', 'misconfigured']).toContain(result.status);
    });
  });

  describe('Idempotency & Replay Protection', () => {
    it('should accept idempotency key for deduplication', async () => {
      const idempotencyKey = `idem_test_${Date.now()}`;
      const payload = {
        org_id: 'org_idempotent_001',
        event_name: 'policy_evaluations',
        quantity: 100,
        idempotency_key: idempotencyKey,
      };

      // Submit twice with same key
      const response1 = await fetch('http://localhost:3000/api/revenue/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      const response2 = await fetch('http://localhost:3000/api/revenue/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const result1 = await response1.json();
      const result2 = await response2.json();

      // Both should succeed; Stripe handles deduplication via idempotency key
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Audit Trail Recording', () => {
    it('should record all events in billing_usage table', async () => {
      const payload = {
        org_id: 'org_audit_001',
        event_name: 'policy_evaluations',
        quantity: 500,
      };

      const response = await fetch('http://localhost:3000/api/revenue/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);

      // Verify audit entry in database
      const { data: auditEntry } = await supabase
        .from('billing_usage')
        .select('*')
        .eq('org_id', 'org_audit_001')
        .eq('event_name', 'policy_evaluations')
        .order('recorded_at', { ascending: false })
        .limit(1);

      expect(auditEntry).toHaveLength(1);
      expect(auditEntry[0]).toMatchObject({
        org_id: 'org_audit_001',
        event_name: 'policy_evaluations',
        quantity: 500,
        synced_to_stripe: expect.any(Boolean),
      });
    });
  });

  describe('Environment Configuration', () => {
    it('should validate STRIPE_METER_ID is present', async () => {
      const response = await fetch('http://localhost:3000/api/revenue/events', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      if (!process.env.STRIPE_METER_ID) {
        expect(result.status).toBe('misconfigured');
        expect(result.stripe_meter_id).toBe('✗');
      }
    });

    it('should validate STRIPE_SECRET_KEY is present', async () => {
      const response = await fetch('http://localhost:3000/api/revenue/events', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      if (!process.env.STRIPE_SECRET_KEY) {
        expect(result.status).toBe('misconfigured');
        expect(result.stripe_secret_key).toBe('✗');
      }
    });
  });
});
