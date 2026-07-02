import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration tests for marketplace seller onboarding endpoints
 *
 * POST /api/marketplace/sellers/onboard
 * - Creates seller in Supabase
 * - Creates Stripe Connected Account
 * - Returns seller_id, account_link_url, kyc_status
 *
 * GET /api/marketplace/sellers/:id/status
 * - Checks seller KYC status
 * - Verifies Stripe account requirements
 * - Updates kyc_status if verification complete
 */

describe('Marketplace Sellers Endpoints', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('POST /api/marketplace/sellers/onboard', () => {
    it('should require authentication', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      };

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn().mockResolvedValue(mockSupabase),
      }));

      vi.doMock('@/lib/security/api-error', () => ({
        logApiError: vi.fn(),
        internalErrorMessage: vi.fn(() => 'Internal server error'),
      }));

      vi.doMock('@/lib/security/cors', () => ({
        buildCorsHeaders: vi.fn((req) => new Headers()),
        buildPreflightResponse: vi.fn((req) => new Response(null, { status: 204 })),
      }));

      const { POST } = await import('@/app/api/marketplace/sellers/onboard/route');

      const request = new Request('http://localhost:3000/api/marketplace/sellers/onboard', {
        method: 'POST',
        body: JSON.stringify({
          business_name: 'Test Business',
          email: 'test@example.com',
          country: 'US',
        }),
      });

      const res = await POST(request as any);
      expect(res.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({
            data: { id: 'user-123', org_id: 'org-123' },
            error: null,
          }),
        })),
      };

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn().mockResolvedValue(mockSupabase),
      }));

      vi.doMock('@/lib/security/api-error', () => ({
        logApiError: vi.fn(),
        internalErrorMessage: vi.fn(() => 'Internal server error'),
      }));

      vi.doMock('@/lib/security/cors', () => ({
        buildCorsHeaders: vi.fn((req) => new Headers()),
        buildPreflightResponse: vi.fn((req) => new Response(null, { status: 204 })),
      }));

      const { POST } = await import('@/app/api/marketplace/sellers/onboard/route');

      // Missing email
      const request = new Request('http://localhost:3000/api/marketplace/sellers/onboard', {
        method: 'POST',
        body: JSON.stringify({
          business_name: 'Test Business',
          email: 'invalid-email', // Invalid email
          country: 'USA', // Not 2-letter code
        }),
      });

      const res = await POST(request as any);
      expect(res.status).toBe(400);
    });

    it('should return seller_id, account_link_url, kyc_status on success', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockResolvedValue({
                data: { id: 'user-123', org_id: 'org-123' },
                error: null,
              }),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'user-123', org_id: 'org-123' },
                error: null,
              }),
            };
          }
          if (table === 'marketplace_sellers') {
            return {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'seller-123',
                  stripe_account_id: 'acct_123',
                  account_link_url: 'https://connect.stripe.com/...',
                  kyc_status: 'pending',
                },
                error: null,
              }),
              eq: vi.fn().mockReturnThis(),
            };
          }
          if (table === 'marketplace_seller_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              eq: vi.fn().mockReturnThis(),
            };
          }
        }),
      };

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn().mockResolvedValue(mockSupabase),
      }));

      vi.doMock('@/lib/security/api-error', () => ({
        logApiError: vi.fn(),
        internalErrorMessage: vi.fn(() => 'Internal server error'),
      }));

      vi.doMock('@/lib/security/cors', () => ({
        buildCorsHeaders: vi.fn((req) => new Headers()),
        buildPreflightResponse: vi.fn((req) => new Response(null, { status: 204 })),
      }));

      // Mock Stripe
      vi.doMock('stripe', () => ({
        default: vi.fn(() => ({
          accounts: {
            create: vi.fn().mockResolvedValue({
              id: 'acct_123',
              created: Math.floor(Date.now() / 1000),
            }),
          },
          accountLinks: {
            create: vi.fn().mockResolvedValue({
              url: 'https://connect.stripe.com/...',
            }),
          },
        })),
      }));

      const { POST } = await import('@/app/api/marketplace/sellers/onboard/route');

      const request = new Request('http://localhost:3000/api/marketplace/sellers/onboard', {
        method: 'POST',
        body: JSON.stringify({
          business_name: 'Test Business',
          email: 'test@example.com',
          country: 'US',
        }),
      });

      const res = await POST(request as any);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body).toHaveProperty('seller_id');
      expect(body).toHaveProperty('account_link_url');
      expect(body).toHaveProperty('kyc_status');
      expect(body.kyc_status).toBe('pending');
    });
  });

  describe('GET /api/marketplace/sellers/:id/status', () => {
    it('should require authentication', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      };

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn().mockResolvedValue(mockSupabase),
      }));

      vi.doMock('@/lib/security/api-error', () => ({
        logApiError: vi.fn(),
        internalErrorMessage: vi.fn(() => 'Internal server error'),
      }));

      vi.doMock('@/lib/security/cors', () => ({
        buildCorsHeaders: vi.fn((req) => new Headers()),
        buildPreflightResponse: vi.fn((req) => new Response(null, { status: 204 })),
      }));

      const { GET } = await import('@/app/api/marketplace/sellers/[id]/status/route');

      const request = new Request('http://localhost:3000/api/marketplace/sellers/seller-123/status', {
        method: 'GET',
      });

      const res = await GET(request as any, {
        params: Promise.resolve({ id: 'seller-123' }),
      });
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent seller', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockResolvedValue({
                data: { org_id: 'org-123' },
                error: null,
              }),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { org_id: 'org-123' },
                error: null,
              }),
            };
          }
          if (table === 'marketplace_sellers') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            };
          }
        }),
      };

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn().mockResolvedValue(mockSupabase),
      }));

      vi.doMock('@/lib/security/api-error', () => ({
        logApiError: vi.fn(),
        internalErrorMessage: vi.fn(() => 'Internal server error'),
      }));

      vi.doMock('@/lib/security/cors', () => ({
        buildCorsHeaders: vi.fn((req) => new Headers()),
        buildPreflightResponse: vi.fn((req) => new Response(null, { status: 204 })),
      }));

      const { GET } = await import('@/app/api/marketplace/sellers/[id]/status/route');

      const request = new Request('http://localhost:3000/api/marketplace/sellers/seller-123/status', {
        method: 'GET',
      });

      const res = await GET(request as any, {
        params: Promise.resolve({ id: 'seller-123' }),
      });
      expect(res.status).toBe(404);
    });

    it('should return kyc_status and verification details', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockResolvedValue({
                data: { org_id: 'org-123' },
                error: null,
              }),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { org_id: 'org-123' },
                error: null,
              }),
            };
          }
          if (table === 'marketplace_sellers') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'seller-123',
                  stripe_account_id: 'acct_123',
                  account_link_url: 'https://connect.stripe.com/...',
                  kyc_status: 'pending',
                },
                error: null,
              }),
            };
          }
          if (table === 'marketplace_seller_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
        }),
      };

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn().mockResolvedValue(mockSupabase),
      }));

      vi.doMock('@/lib/security/api-error', () => ({
        logApiError: vi.fn(),
        internalErrorMessage: vi.fn(() => 'Internal server error'),
      }));

      vi.doMock('@/lib/security/cors', () => ({
        buildCorsHeaders: vi.fn((req) => new Headers()),
        buildPreflightResponse: vi.fn((req) => new Response(null, { status: 204 })),
      }));

      // Mock Stripe
      vi.doMock('stripe', () => ({
        default: vi.fn(() => ({
          accounts: {
            retrieve: vi.fn().mockResolvedValue({
              id: 'acct_123',
              charges_enabled: false,
              payouts_enabled: false,
              requirements: { eventually_due: [] },
            }),
          },
        })),
      }));

      const { GET } = await import('@/app/api/marketplace/sellers/[id]/status/route');

      const request = new Request('http://localhost:3000/api/marketplace/sellers/seller-123/status', {
        method: 'GET',
      });

      const res = await GET(request as any, {
        params: Promise.resolve({ id: 'seller-123' }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('seller_id');
      expect(body).toHaveProperty('kyc_status');
      expect(body).toHaveProperty('verified');
      expect(body).toHaveProperty('account_link_url');
      expect(body).toHaveProperty('charges_enabled');
      expect(body).toHaveProperty('payouts_enabled');
    });
  });
});
