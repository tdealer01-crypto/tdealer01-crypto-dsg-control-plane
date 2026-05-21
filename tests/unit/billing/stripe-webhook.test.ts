import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStripeInstance = {
  webhooks: { constructEvent: vi.fn() },
  subscriptions: { retrieve: vi.fn() },
};

vi.mock('stripe', () => ({ default: vi.fn(() => mockStripeInstance) }));

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(),
}));
vi.mock('../../../lib/email/sales', () => ({
  sendTrialWelcome: vi.fn(),
  sendUpgradeSuccess: vi.fn(),
}));
vi.mock('../../../lib/security/api-error', () => ({
  internalErrorMessage: vi.fn(() => 'Internal server error'),
  logApiError: vi.fn(),
}));

import { POST } from '../../../app/api/billing/webhook/route';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { sendUpgradeSuccess } from '../../../lib/email/sales';

const mockGetAdmin = vi.mocked(getSupabaseAdmin);
const mockSendUpgradeSuccess = vi.mocked(sendUpgradeSuccess);

function makeSupabaseAdmin() {
  const fromMock = vi.fn().mockReturnValue({
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    like: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  return { from: fromMock };
}

function makeRequest(body: string, signature: string | null = 'valid-sig') {
  const headers: Record<string, string> = { 'content-type': 'text/plain' };
  if (signature !== null) headers['stripe-signature'] = signature;
  return new Request('http://localhost/api/billing/webhook', {
    method: 'POST',
    body,
    headers,
  });
}

function makeEvent(type: string, data: unknown = {}): import('stripe').default.Event {
  return { id: 'evt_1', type, data: { object: data } } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_secret';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  mockGetAdmin.mockReturnValue(makeSupabaseAdmin() as any);
});

describe('POST /api/billing/webhook', () => {
  it('returns 500 when STRIPE_WEBHOOK_SECRET is not set', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/STRIPE_WEBHOOK_SECRET/);
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const res = await POST(makeRequest('{}', null));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/stripe-signature/);
  });

  it('returns 400 when constructEvent throws (invalid signature)', async () => {
    mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(400);
  });

  it('returns 200 for checkout.session.completed event', async () => {
    const session = {
      id: 'cs_1',
      customer: 'cus_1',
      customer_details: { email: 'test@example.com', name: 'Test' },
      customer_email: null,
      metadata: { org_id: 'org-1' },
      subscription: null,
    };
    mockStripeInstance.webhooks.constructEvent.mockReturnValue(
      makeEvent('checkout.session.completed', session)
    );

    const res = await POST(makeRequest(JSON.stringify(session)));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.type).toBe('checkout.session.completed');
  });

  it('calls sendUpgradeSuccess when subscription transitions trialing -> active', async () => {
    const subscription = {
      id: 'sub_1',
      customer: 'cus_1',
      status: 'active',
      items: { data: [{ price: { id: 'price_pro', product: 'prod_1' } }] },
      metadata: { plan_key: 'pro', billing_interval: 'monthly' },
      cancel_at_period_end: false,
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      trial_start: null,
      trial_end: null,
    };
    const event = {
      id: 'evt_2',
      type: 'customer.subscription.updated',
      data: {
        object: subscription,
        previous_attributes: { status: 'trialing' },
      },
    };
    mockStripeInstance.webhooks.constructEvent.mockReturnValue(event as any);

    const adminMock = makeSupabaseAdmin();
    adminMock.from.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      like: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { stripe_customer_id: 'cus_1', org_id: 'org-1', email: 'test@example.com', name: 'Test' },
        error: null,
      }),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
    });
    mockGetAdmin.mockReturnValue(adminMock as any);

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
    expect(mockSendUpgradeSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com', planKey: 'pro' })
    );
  });

  it('returns 200 for unknown event type without crashing', async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue(
      makeEvent('payment_intent.created', { id: 'pi_1' })
    );

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.type).toBe('payment_intent.created');
  });
});
