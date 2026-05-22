import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStripeInstance = {
  webhooks: { constructEvent: vi.fn() },
  subscriptions: { retrieve: vi.fn() },
  customers: { retrieve: vi.fn() },
};

vi.mock('stripe', () => ({ default: vi.fn(() => mockStripeInstance) }));

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { POST } from '@/app/api/stripe/webhook/route';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const mockGetSupabaseAdmin = vi.mocked(getSupabaseAdmin);

function makeSupabaseAdmin(upsertError: unknown = null, updateError: unknown = null) {
  return {
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: upsertError }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: updateError }),
      }),
    }),
  };
}

function makeRequest(body: string, signature: string | null = 'valid-sig') {
  const headers: Record<string, string> = { 'content-type': 'text/plain' };
  if (signature !== null) headers['stripe-signature'] = signature;
  return {
    headers: { get: (k: string) => headers[k] ?? null },
    text: () => Promise.resolve(body),
  } as any;
}

function makeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_test',
    customer: 'cus_test',
    status: 'active',
    current_period_end: 1700000000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_secret';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  mockGetSupabaseAdmin.mockReturnValue(makeSupabaseAdmin() as any);
  mockStripeInstance.customers.retrieve.mockResolvedValue({
    id: 'cus_test',
    email: 'test@example.com',
    deleted: false,
  });
  mockStripeInstance.subscriptions.retrieve.mockResolvedValue(makeSubscription());
});

describe('POST /api/stripe/webhook', () => {
  it('returns 501 when STRIPE_SECRET_KEY is not set', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(501);
  });

  it('returns 501 when STRIPE_WEBHOOK_SECRET is not set', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(501);
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('No signature');
    });
    const res = await POST(makeRequest('{}', null));
    expect(res.status).toBe(400);
  });

  it('returns 400 when constructEvent throws (invalid signature)', async () => {
    mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid_signature/);
  });

  it('returns 200 with received:true for checkout.session.completed with valid subscription', async () => {
    const session = { id: 'cs_1', subscription: 'sub_test' };
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: session },
    });
    const supabase = makeSupabaseAdmin();
    mockGetSupabaseAdmin.mockReturnValue(supabase as any);

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('release_gate_entitlements');
  });

  it('returns 200 and skips upsert when subscription is not a string', async () => {
    const session = { id: 'cs_1', subscription: null };
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: session },
    });
    const supabase = makeSupabaseAdmin();
    mockGetSupabaseAdmin.mockReturnValue(supabase as any);

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('calls upsert for customer.subscription.updated', async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: makeSubscription() },
    });
    const supabase = makeSupabaseAdmin();
    mockGetSupabaseAdmin.mockReturnValue(supabase as any);

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
    expect(supabase.from).toHaveBeenCalledWith('release_gate_entitlements');
  });

  it('calls update with canceled status for customer.subscription.deleted', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq });
    const supabase = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: updateFn,
      }),
    };
    mockGetSupabaseAdmin.mockReturnValue(supabase as any);
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: makeSubscription() },
    });

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'canceled' })
    );
  });

  it('returns 500 with entitlement_sync_failed when Supabase upsert throws', async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: makeSubscription() },
    });
    mockGetSupabaseAdmin.mockReturnValue({
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      }),
    } as any);

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/entitlement_sync_failed/);
  });

  it('returns 200 for unknown event type without crashing', async () => {
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.created',
      data: { object: {} },
    });

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });
});
