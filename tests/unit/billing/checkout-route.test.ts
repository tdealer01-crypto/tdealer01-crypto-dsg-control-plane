import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStripeSession = { id: 'cs_test_1', url: 'https://checkout.stripe.com/cs_test_1' };
const mockStripeInstance = {
  checkout: { sessions: { create: vi.fn().mockResolvedValue(mockStripeSession) } },
};

vi.mock('stripe', () => ({ default: vi.fn(() => mockStripeInstance) }));
vi.mock('../../../lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('../../../lib/security/rate-limit', () => ({
  applyRateLimit: vi.fn(),
  buildRateLimitHeaders: vi.fn(() => ({})),
  getRateLimitKey: vi.fn(() => 'test-key'),
}));
vi.mock('../../../lib/security/api-error', () => ({
  handleApiError: vi.fn((_, err) =>
    new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  ),
}));
vi.mock('../../../lib/telemetry/capture-event', () => ({
  captureEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

import { POST } from '../../../app/api/billing/checkout/route';
import { createClient } from '../../../lib/supabase/server';
import { applyRateLimit } from '../../../lib/security/rate-limit';

const mockCreateClient = vi.mocked(createClient);
const mockApplyRateLimit = vi.mocked(applyRateLimit);

const ALLOWED_RATE = { allowed: true, remaining: 19, reset: Date.now() + 60000 };
const DENIED_RATE = { allowed: false, remaining: 0, reset: Date.now() + 60000 };

function makeSupabaseClient(user: unknown, profile: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
    })),
  };
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_secret';
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_monthly';
  process.env.STRIPE_PRICE_BUSINESS_MONTHLY = 'price_biz_monthly';
  process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY = 'price_ent_monthly';
  delete process.env.STRIPE_METER_EVENT_NAME;
  delete process.env.STRIPE_METER_ID;
  delete process.env.STRIPE_PRICE_PRO_OVERAGE;
  mockApplyRateLimit.mockResolvedValue(ALLOWED_RATE as any);
});

describe('POST /api/billing/checkout', () => {
  it('returns 429 when rate limit exceeded', async () => {
    mockApplyRateLimit.mockResolvedValue(DENIED_RATE as any);
    mockCreateClient.mockResolvedValue(makeSupabaseClient(null, null) as any);
    const res = await POST(makeRequest({ plan: 'pro' }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/Too many requests/);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseClient(null, null) as any);
    const res = await POST(makeRequest({ plan: 'pro' }));
    expect(res.status).toBe(401);
  });

  it('allows inactive trial profile with org_id', async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseClient(
        { id: 'user-1' },
        { org_id: 'org-1', is_active: false, email: 'test@example.com' }
      ) as any
    );
    const res = await POST(makeRequest({ plan: 'pro' }));
    expect(res.status).toBe(200);
  });

  it('returns 403 when org_id in body does not match user org', async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseClient(
        { id: 'user-1' },
        { org_id: 'org-1', is_active: true, email: 'test@example.com' }
      ) as any
    );
    const res = await POST(makeRequest({ plan: 'pro', org_id: 'org-evil' }));
    expect(res.status).toBe(403);
  });

  it('creates Stripe session for pro plan with correct fixed price ID', async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseClient(
        { id: 'user-1' },
        { org_id: 'org-1', is_active: true, email: 'test@example.com' }
      ) as any
    );
    const res = await POST(makeRequest({ plan: 'pro', interval: 'monthly' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.url).toBe('https://checkout.stripe.com/cs_test_1');
    expect(body.plan).toBe('pro');

    const createCall = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(createCall.line_items).toEqual([
      { price: 'price_pro_monthly', quantity: 1 },
    ]);
    expect(createCall.subscription_data.trial_period_days).toBe(14);
    expect(createCall.payment_method_types).toBeUndefined();
  });

  it('attaches the metered overage price to Pro only when the complete meter contract is configured', async () => {
    process.env.STRIPE_METER_EVENT_NAME = 'dsg_execution_overage';
    process.env.STRIPE_METER_ID = 'mtr_live_verified';
    process.env.STRIPE_PRICE_PRO_OVERAGE = 'price_pro_overage';
    mockCreateClient.mockResolvedValue(
      makeSupabaseClient(
        { id: 'user-1' },
        { org_id: 'org-1', is_active: true, email: 'test@example.com' }
      ) as any
    );

    const res = await POST(makeRequest({ plan: 'pro', interval: 'monthly' }));
    expect(res.status).toBe(200);

    const createCall = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(createCall.line_items).toEqual([
      { price: 'price_pro_monthly', quantity: 1 },
      { price: 'price_pro_overage' },
    ]);
  });

  it('does not attach an overage price when only part of the meter contract exists', async () => {
    process.env.STRIPE_METER_EVENT_NAME = 'dsg_execution_overage';
    process.env.STRIPE_METER_ID = 'mtr_live_verified';
    mockCreateClient.mockResolvedValue(
      makeSupabaseClient(
        { id: 'user-1' },
        { org_id: 'org-1', is_active: true, email: 'test@example.com' }
      ) as any
    );

    await POST(makeRequest({ plan: 'pro', interval: 'monthly' }));
    const createCall = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(createCall.line_items).toEqual([
      { price: 'price_pro_monthly', quantity: 1 },
    ]);
  });

  it('normalizes unknown plan to pro', async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseClient(
        { id: 'user-1' },
        { org_id: 'org-1', is_active: true, email: 'test@example.com' }
      ) as any
    );
    const res = await POST(makeRequest({ plan: 'unknown_plan' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan).toBe('unknown_plan');
    const createCall = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(createCall.line_items[0].price).toBe('price_pro_monthly');
  });

  it('uses enterprise trial of 30 days and never attaches Pro overage', async () => {
    process.env.STRIPE_METER_EVENT_NAME = 'dsg_execution_overage';
    process.env.STRIPE_METER_ID = 'mtr_live_verified';
    process.env.STRIPE_PRICE_PRO_OVERAGE = 'price_pro_overage';
    mockCreateClient.mockResolvedValue(
      makeSupabaseClient(
        { id: 'user-1' },
        { org_id: 'org-1', is_active: true, email: 'test@example.com' }
      ) as any
    );
    await POST(makeRequest({ plan: 'enterprise', interval: 'monthly' }));
    const createCall = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(createCall.subscription_data.trial_period_days).toBe(30);
    expect(createCall.line_items).toEqual([
      { price: 'price_ent_monthly', quantity: 1 },
    ]);
  });

  it('uses inline price_data for skills bundle', async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseClient(
        { id: 'user-1' },
        { org_id: 'org-1', is_active: true, email: 'test@example.com' }
      ) as any
    );
    await POST(makeRequest({ plan: 'finance_skills', interval: 'monthly' }));
    const createCall = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    expect(createCall.line_items[0].price_data).toBeDefined();
    expect(createCall.line_items[0].price_data.unit_amount).toBe(19900);
    expect(createCall.subscription_data?.trial_period_days).toBeUndefined();
  });
});
