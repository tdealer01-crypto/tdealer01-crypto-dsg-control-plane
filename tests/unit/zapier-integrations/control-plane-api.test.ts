import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';

const mockMaybeSingle = vi.fn();
const mockUpsert = vi.fn();
const mockInsert = vi.fn();

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'billing_customers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: mockMaybeSingle,
        };
      }
      return {
        upsert: mockUpsert,
        insert: mockInsert,
      };
    }),
  })),
}));

import {
  validateZapierSignature,
  handleRevenueWebhook,
  handleQuotaWebhook,
  handleCommunicationWebhook,
  checkZapierIntegrationHealth,
} from '../../../lib/zapier-integrations/control-plane-api';

const SECRET = 'test-zapier-secret';

function sign(body: string, secret = SECRET) {
  return createHmac('sha256', secret).update(body).digest('hex');
}

describe('validateZapierSignature', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.ZAPIER_WEBHOOK_SECRET = SECRET;
  });

  it('fails closed when ZAPIER_WEBHOOK_SECRET is not configured', () => {
    delete process.env.ZAPIER_WEBHOOK_SECRET;
    const body = JSON.stringify({ foo: 'bar' });
    expect(validateZapierSignature(body, sign(body))).toBe(false);
  });

  it('rejects a missing signature header', () => {
    const body = JSON.stringify({ foo: 'bar' });
    expect(validateZapierSignature(body, null)).toBe(false);
  });

  it('rejects an incorrect signature', () => {
    const body = JSON.stringify({ foo: 'bar' });
    expect(validateZapierSignature(body, sign(body, 'wrong-secret'))).toBe(false);
  });

  it('rejects a signature computed over a different body', () => {
    const body = JSON.stringify({ foo: 'bar' });
    const tamperedBody = JSON.stringify({ foo: 'baz' });
    expect(validateZapierSignature(tamperedBody, sign(body))).toBe(false);
  });

  it('accepts a correctly signed body', () => {
    const body = JSON.stringify({ foo: 'bar' });
    expect(validateZapierSignature(body, sign(body))).toBe(true);
  });
});

describe('handleRevenueWebhook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.ZAPIER_WEBHOOK_SECRET = SECRET;
    mockMaybeSingle.mockResolvedValue({ data: { org_id: 'org-1' }, error: null });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it('rejects payload missing required fields', async () => {
    const result = await handleRevenueWebhook({
      customer_id: '',
      amount: 0,
      currency: 'usd',
      payment_id: '',
      status: 'completed',
      timestamp: new Date().toISOString(),
    } as never);
    expect(result.success).toBe(false);
  });

  it('persists a valid payment event with resolved org_id', async () => {
    const result = await handleRevenueWebhook({
      customer_id: 'cus_123',
      amount: 1000,
      currency: 'usd',
      payment_id: 'pi_abc',
      status: 'completed',
      timestamp: '2026-07-16T00:00:00Z',
    });

    expect(result.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ org_id: 'org-1', payment_id: 'pi_abc', amount: 1000 }),
      { onConflict: 'payment_id' }
    );
  });

  it('persists with org_id null when customer cannot be resolved', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await handleRevenueWebhook({
      customer_id: 'cus_unknown',
      amount: 500,
      currency: 'usd',
      payment_id: 'pi_xyz',
      status: 'completed',
      timestamp: '2026-07-16T00:00:00Z',
    });

    expect(result.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ org_id: null }),
      { onConflict: 'payment_id' }
    );
  });

  it('returns failure when the database write errors', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'db down' } });

    const result = await handleRevenueWebhook({
      customer_id: 'cus_123',
      amount: 1000,
      currency: 'usd',
      payment_id: 'pi_abc',
      status: 'completed',
      timestamp: '2026-07-16T00:00:00Z',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('db down');
  });
});

describe('handleQuotaWebhook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.ZAPIER_WEBHOOK_SECRET = SECRET;
    mockMaybeSingle.mockResolvedValue({ data: { org_id: 'org-1' }, error: null });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('persists a valid quota event', async () => {
    const result = await handleQuotaWebhook({
      customer_id: 'cus_123',
      service_type: 'api',
      quota_allocated: 10000,
      usage_current: 8500,
      usage_percent: 85,
      health_status: 'warning',
    });

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ org_id: 'org-1', usage_percent: 85, health_status: 'warning' })
    );
  });

  it('rejects payload missing customer_id', async () => {
    const result = await handleQuotaWebhook({
      customer_id: '',
      service_type: 'api',
      quota_allocated: 10000,
      usage_current: 100,
      usage_percent: 1,
      health_status: 'healthy',
    });
    expect(result.success).toBe(false);
  });
});

describe('handleCommunicationWebhook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.ZAPIER_WEBHOOK_SECRET = SECRET;
    mockMaybeSingle.mockResolvedValue({ data: { org_id: 'org-1' }, error: null });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('persists a valid communication event', async () => {
    const result = await handleCommunicationWebhook({
      customer_id: 'cus_123',
      email: 'customer@example.com',
      type: 'invoice',
      subject: 'Your invoice',
      status: 'sent',
      timestamp: '2026-07-16T00:00:00Z',
    });

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ org_id: 'org-1', email: 'customer@example.com', type: 'invoice' })
    );
  });

  it('rejects payload missing email', async () => {
    const result = await handleCommunicationWebhook({
      customer_id: 'cus_123',
      email: '',
      type: 'invoice',
      subject: 'x',
      status: 'sent',
      timestamp: '2026-07-16T00:00:00Z',
    });
    expect(result.success).toBe(false);
  });
});

describe('checkZapierIntegrationHealth', () => {
  it('reports healthy when secret is configured', async () => {
    process.env.ZAPIER_WEBHOOK_SECRET = SECRET;
    const health = await checkZapierIntegrationHealth();
    expect(health.status).toBe('healthy');
    expect(health.components.revenue_webhook).toBe(true);
  });

  it('reports degraded when secret is missing', async () => {
    delete process.env.ZAPIER_WEBHOOK_SECRET;
    const health = await checkZapierIntegrationHealth();
    expect(health.status).toBe('degraded');
    expect(health.components.revenue_webhook).toBe(false);
  });
});
