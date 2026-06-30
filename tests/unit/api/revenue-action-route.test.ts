import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireInternalServiceMock = vi.fn();
const mockStripeSession = { id: 'cs_test_1', url: 'https://checkout.stripe.com/cs_test_1' };
const mockStripeInstance = {
  checkout: { sessions: { create: vi.fn().mockResolvedValue(mockStripeSession) } },
};
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  })),
};
const posthogCaptureMock = vi.fn();

vi.mock('stripe', () => ({ default: vi.fn(() => mockStripeInstance) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => mockSupabase) }));
vi.mock('posthog-node', () => ({ PostHog: vi.fn(() => ({ capture: posthogCaptureMock })) }));
vi.mock('../../../lib/auth/internal-service', () => ({
  requireInternalService: requireInternalServiceMock,
}));

describe('/api/revenue/[action] route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.NEXT_PUBLIC_POSTHOG_API_KEY = 'phc_test';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    process.env.STRIPE_PRICE_PRO = 'price_pro';
  });

  it('keeps checkout public', async () => {
    const { POST } = await import('../../../app/api/revenue/[action]/route');
    const res = await POST(
      new Request('http://localhost/api/revenue/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', email: 'buyer@example.com' }),
      }) as any,
      { params: Promise.resolve({ action: 'checkout' }) }
    );

    expect(res.status).toBe(200);
    expect(requireInternalServiceMock).not.toHaveBeenCalled();
  });

  it('rejects analytics-summary without internal bearer auth', async () => {
    requireInternalServiceMock.mockReturnValue({
      ok: false,
      status: 401,
      error: 'unauthorized_internal_service',
    });

    const { POST } = await import('../../../app/api/revenue/[action]/route');
    const res = await POST(
      new Request('http://localhost/api/revenue/analytics-summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ days: 30 }),
      }) as any,
      { params: Promise.resolve({ action: 'analytics-summary' }) }
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'unauthorized_internal_service' });
  });
});
