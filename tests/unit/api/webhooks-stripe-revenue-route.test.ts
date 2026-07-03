import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const constructEventMock = vi.fn();
const handleBillingWebhookMock = vi.fn();
const insertRevenueEventMock = vi.fn();
const getSupabaseAdminMock = vi.fn();

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    webhooks: {
      constructEvent: constructEventMock,
    },
  })),
}));

vi.mock('@/app/api/billing/webhook/route', () => ({
  POST: handleBillingWebhookMock,
}));

vi.mock('@/lib/revenue/events', () => ({
  insertRevenueEvent: insertRevenueEventMock,
}));

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

function makeRequest(body: string, signature: string | null = 'sig_test') {
  const headers: Record<string, string> = {
    'content-type': 'text/plain',
  };
  if (signature) {
    headers['stripe-signature'] = signature;
  }

  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body,
  });
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_secret';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { org_id: 'org_123' }, error: null }),
      }),
    });

    afterEach(() => {
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_WEBHOOK_SECRET;
    });
    insertRevenueEventMock.mockResolvedValue({ id: 'rev_123' });
    handleBillingWebhookMock.mockResolvedValue(
      NextResponse.json({ received: true }, { status: 200 })
    );
  });

  it('returns 400 when signature is invalid', async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    const { POST } = await import('../../../app/api/webhooks/stripe/route');
    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(400);
    await expect(res.text()).resolves.toContain('Invalid signature');
  });

  it('persists checkout events to revenue_events and delegates to billing webhook', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          object: 'checkout.session',
          amount_total: 4900,
          customer: 'cus_123',
          metadata: {
            org_id: 'org_123',
            plan_id: 'mcp_pro',
          },
        },
      },
    });

    const { POST } = await import('../../../app/api/webhooks/stripe/route');
    const res = await POST(makeRequest('{"ok":true}'));

    expect(insertRevenueEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org_123',
        eventType: 'stripe_checkout',
        planId: 'mcp_pro',
        amount: 49,
      })
    );
    expect(handleBillingWebhookMock).toHaveBeenCalled();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({ ok: true, received: true, type: 'checkout.session.completed' })
    );
  });

  it('returns 503 when webhook secret is missing', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const { POST } = await import('../../../app/api/webhooks/stripe/route');
    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({ error: 'Webhook processing unavailable' })
    );
  });
});
