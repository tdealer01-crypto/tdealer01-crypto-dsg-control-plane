import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();
const applyRateLimitMock = vi.fn();
const mockPortalSession = { url: 'https://billing.stripe.com/session/test' };
const mockStripeInstance = {
  billingPortal: {
    sessions: {
      create: vi.fn().mockResolvedValue(mockPortalSession),
    },
  },
};

vi.mock('stripe', () => ({ default: vi.fn(() => mockStripeInstance) }));
vi.mock('../../../lib/supabase/server', () => ({ createClient: createClientMock }));
vi.mock('../../../lib/security/rate-limit', () => ({
  applyRateLimit: applyRateLimitMock,
  buildRateLimitHeaders: vi.fn(() => ({})),
  getRateLimitKey: vi.fn(() => 'billing-portal-test'),
}));
vi.mock('../../../lib/security/api-error', () => ({
  handleApiError: vi.fn((_, error) =>
    new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  ),
}));

function makeRequest() {
  return new Request('https://app.example.com/api/billing/portal', { method: 'POST' });
}

function makeSupabaseClient({
  user = { id: 'user-1' },
  profile = { org_id: 'org-1' },
  customer = { stripe_customer_id: 'cus_123' },
  customerError = null,
}: {
  user?: unknown;
  profile?: unknown;
  customer?: unknown;
  customerError?: unknown;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
        };
      }

      if (table === 'billing_customers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: customer, error: customerError }),
        };
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_secret';
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  applyRateLimitMock.mockResolvedValue({ allowed: true, remaining: 19, reset: Date.now() + 60_000 });
});

describe('POST /api/billing/portal', () => {
  it('returns 401 when user is not authenticated', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient({ user: null }) as any);
    const { POST } = await import('../../../app/api/billing/portal/route');
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 409 when no Stripe customer is mapped to the workspace', async () => {
    createClientMock.mockResolvedValue(
      makeSupabaseClient({ customer: null, customerError: null }) as any
    );
    const { POST } = await import('../../../app/api/billing/portal/route');
    const res = await POST(makeRequest());
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({ error: 'No Stripe customer found for this workspace' })
    );
  });

  it('creates a Stripe billing portal session for the authenticated workspace', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient({}) as any);
    const { POST } = await import('../../../app/api/billing/portal/route');
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({ ok: true, url: mockPortalSession.url })
    );
    expect(mockStripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_123',
      return_url: 'https://app.example.com/dashboard/billing',
    });
  });
});
