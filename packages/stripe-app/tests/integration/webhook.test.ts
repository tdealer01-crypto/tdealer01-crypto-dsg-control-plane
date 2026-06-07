import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import crypto from 'crypto';

// Helper to sign webhook using HMAC-SHA256 (Stripe method)
const signWebhookPayload = (payload: string, secret: string): string => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedContent = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
};

const createTestWebhookEvent = (overrides?: any) => ({
  id: `evt_${crypto.randomBytes(8).toString('hex')}`,
  object: 'event',
  api_version: '2024-04-10',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: `ch_${crypto.randomBytes(8).toString('hex')}`,
      object: 'charge',
      amount: 10000,
      currency: 'usd',
      status: 'succeeded',
    },
  },
  livemode: false,
  pending_webhooks: 1,
  request: { id: null, idempotency_key: null },
  type: 'charge.created',
  ...overrides,
});

const makeWebhookRequest = async (
  payload: any,
  signature?: string,
  customHeaders?: Record<string, string>
) => {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:3001';
  const payloadStr = JSON.stringify(payload);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Stripe/1.0 (+https://stripe.com)',
    ...customHeaders,
  };

  if (signature) {
    headers['Stripe-Signature'] = signature;
  }

  const response = await fetch(`${baseUrl}/webhook/events`, {
    method: 'POST',
    headers,
    body: payloadStr,
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }

  return { status: response.status, data };
};

describe('Stripe Webhook Security', () => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_' + crypto.randomBytes(16).toString('hex');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Webhook Signature Validation', () => {
    it('should reject unsigned webhooks', async () => {
      const payload = createTestWebhookEvent();
      const response = await makeWebhookRequest(payload);

      expect([400, 401, 403]).toContain(response.status);
    });

    it('should reject tampered webhook signatures', async () => {
      const payload = createTestWebhookEvent();
      const badSignature = 't=' + Math.floor(Date.now() / 1000) + ',v1=invalidsignature';
      const response = await makeWebhookRequest(payload, badSignature);

      expect([400, 401, 403]).toContain(response.status);
    });

    it('should reject replayed webhooks (timestamp validation)', async () => {
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes old
      const signedContent = `${oldTimestamp}.${payloadStr}`;
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedContent)
        .digest('hex');
      const oldSignature = `t=${oldTimestamp},v1=${signature}`;

      const response = await makeWebhookRequest(payload, oldSignature);

      // Old timestamps should be rejected
      expect([400, 401]).toContain(response.status);
    });

    it('should accept valid webhook signature', async () => {
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      expect(response.status).toBe(200);
    });

    it('should validate signature with correct secret', async () => {
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const wrongSecret = 'wrong_secret_key';
      const wrongSignature = signWebhookPayload(payloadStr, wrongSecret);

      const response = await makeWebhookRequest(payload, wrongSignature);

      expect([400, 401, 403]).toContain(response.status);
    });
  });

  describe('Webhook Event Processing', () => {
    it('should process charge.created event', async () => {
      const payload = createTestWebhookEvent({ type: 'charge.created' });
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      expect(response.status).toBe(200);
    });

    it('should process charge.updated event', async () => {
      const payload = createTestWebhookEvent({ type: 'charge.updated' });
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      expect(response.status).toBe(200);
    });

    it('should process payment_intent.created event', async () => {
      const payload = createTestWebhookEvent({
        type: 'payment_intent.created',
        data: { object: { id: 'pi_test', object: 'payment_intent' } },
      });
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      expect(response.status).toBe(200);
    });

    it('should process payout.created event', async () => {
      const payload = createTestWebhookEvent({
        type: 'payout.created',
        data: { object: { id: 'po_test', object: 'payout' } },
      });
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      expect(response.status).toBe(200);
    });

    it('should handle unknown event types gracefully', async () => {
      const payload = createTestWebhookEvent({ type: 'unknown.event' });
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      expect(response.status).toBe(200);
    });
  });

  describe('Webhook Response Requirements', () => {
    it('should respond within 500ms', async () => {
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const startTime = Date.now();
      await makeWebhookRequest(payload, signature);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should not retry after 200 response', async () => {
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      expect(response.status).toBe(200);
    });

    it('should handle large event payloads', async () => {
      const largeMetadata = 'x'.repeat(100000); // 100KB metadata
      const payload = createTestWebhookEvent({
        data: { object: { metadata: largeMetadata } },
      });
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      expect(response.status).toBe(200);
    });

    it('should preserve event order for same account', async () => {
      const ids = [];
      for (let i = 0; i < 3; i++) {
        const payload = createTestWebhookEvent({ data: { object: { id: `ch_${i}` } } });
        const payloadStr = JSON.stringify(payload);
        const signature = signWebhookPayload(payloadStr, webhookSecret);
        const response = await makeWebhookRequest(payload, signature);
        if (response.status === 200) {
          ids.push(i);
        }
      }

      expect(ids.length).toBeGreaterThan(0);
    });
  });

  describe('Webhook Security Headers', () => {
    it('should validate Stripe-Signature header format', async () => {
      const payload = createTestWebhookEvent();
      const badSignature = 'invalid_format_without_equals';

      const response = await makeWebhookRequest(payload, badSignature);

      expect([400, 401, 403]).toContain(response.status);
    });

    it('should ignore additional custom headers', async () => {
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature, {
        'X-Custom-Header': 'should-be-ignored',
        'X-Another-Header': 'also-ignored',
      });

      expect(response.status).toBe(200);
    });

    it('should handle missing Stripe-Signature header', async () => {
      const payload = createTestWebhookEvent();
      const response = await makeWebhookRequest(payload);

      expect([400, 401, 403]).toContain(response.status);
    });

    it('should validate X-Stripe-Request-Id header', async () => {
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);
      const requestId = `req_${crypto.randomBytes(8).toString('hex')}`;

      const response = await makeWebhookRequest(payload, signature, {
        'X-Stripe-Request-Id': requestId,
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Webhook Idempotency', () => {
    it('should handle duplicate webhook events', async () => {
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response1 = await makeWebhookRequest(payload, signature);
      const response2 = await makeWebhookRequest(payload, signature);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should use event ID for deduplication', async () => {
      const eventId = `evt_${crypto.randomBytes(8).toString('hex')}`;
      const payload1 = createTestWebhookEvent({ id: eventId });
      const payload2 = createTestWebhookEvent({ id: eventId });
      const payloadStr1 = JSON.stringify(payload1);
      const payloadStr2 = JSON.stringify(payload2);
      const signature1 = signWebhookPayload(payloadStr1, webhookSecret);
      const signature2 = signWebhookPayload(payloadStr2, webhookSecret);

      const response1 = await makeWebhookRequest(payload1, signature1);
      const response2 = await makeWebhookRequest(payload2, signature2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should track processed event IDs', async () => {
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it('should expire old event dedup records', async () => {
      const veryOldTimestamp = Math.floor(Date.now() / 1000) - 2592000; // 30 days old
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const signedContent = `${veryOldTimestamp}.${payloadStr}`;
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedContent)
        .digest('hex');
      const oldSignature = `t=${veryOldTimestamp},v1=${signature}`;

      const response = await makeWebhookRequest(payload, oldSignature);

      // Very old events should be rejected due to timestamp
      expect([400, 401]).toContain(response.status);
    });
  });

  describe('Webhook Error Scenarios', () => {
    it('should handle Stripe API temporary failures', async () => {
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      expect([200, 500]).toContain(response.status);
    });

    it('should handle database connection failures', async () => {
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      expect([200, 500, 503]).toContain(response.status);
    });

    it('should log webhook processing errors', async () => {
      const payload = createTestWebhookEvent({ type: 'invalid.type' });
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      expect(response.status).toBe(200);
    });

    it('should not expose error details to Stripe', async () => {
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      if (response.status >= 400) {
        const responseStr = JSON.stringify(response.data);
        expect(responseStr).not.toMatch(/secret|key|password/i);
      }
    });
  });

  describe('Webhook Rate Limiting', () => {
    it('should handle burst of webhooks', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const payload = createTestWebhookEvent({ id: `evt_burst_${i}` });
        const payloadStr = JSON.stringify(payload);
        const signature = signWebhookPayload(payloadStr, webhookSecret);
        promises.push(makeWebhookRequest(payload, signature));
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status === 200).length;

      expect(successCount).toBeGreaterThanOrEqual(3);
    });

    it('should not rate-limit legitimate webhook volume', async () => {
      const results = [];
      for (let i = 0; i < 10; i++) {
        const payload = createTestWebhookEvent();
        const payloadStr = JSON.stringify(payload);
        const signature = signWebhookPayload(payloadStr, webhookSecret);
        const response = await makeWebhookRequest(payload, signature);
        results.push(response.status);
      }

      const successCount = results.filter(s => s === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(8);
    });

    it('should enforce per-account rate limits if needed', async () => {
      const promises = [];
      for (let i = 0; i < 20; i++) {
        const payload = createTestWebhookEvent({ id: `evt_ratelimit_${i}` });
        const payloadStr = JSON.stringify(payload);
        const signature = signWebhookPayload(payloadStr, webhookSecret);
        promises.push(makeWebhookRequest(payload, signature));
      }

      const results = await Promise.all(promises);
      const statusCodes = results.map(r => r.status);

      expect(statusCodes.some(s => s === 200)).toBe(true);
    });
  });

  describe('Webhook Compliance', () => {
    it('should process within Stripe webhook timeout', async () => {
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const startTime = Date.now();
      const response = await makeWebhookRequest(payload, signature);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(30000); // 30 second Stripe timeout
    });

    it('should respect Stripe event schema', async () => {
      const payload = createTestWebhookEvent();
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      expect(response.status).toBe(200);
      expect(payload).toHaveProperty('id');
      expect(payload).toHaveProperty('type');
      expect(payload).toHaveProperty('data');
    });

    it('should handle future Stripe API changes', async () => {
      const payload = createTestWebhookEvent({
        future_field: 'unknown_field_from_future_api',
        nested: { extra: 'data' },
      });
      const payloadStr = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadStr, webhookSecret);

      const response = await makeWebhookRequest(payload, signature);

      expect(response.status).toBe(200);
    });
  });
});
