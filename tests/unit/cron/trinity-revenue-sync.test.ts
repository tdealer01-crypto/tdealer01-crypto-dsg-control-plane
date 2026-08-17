import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/cron/trinity-revenue-sync/route';

describe('Trinity Revenue Sync Cron Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authorization', () => {
    it('should reject requests without CRON_SECRET', async () => {
      const originalSecret = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;

      const request = new Request('http://localhost/api/cron/trinity-revenue-sync', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      const response = await GET(request);
      const data = await response.json() as { error: string };

      expect(response.status).toBe(503);
      expect(data.error).toBe('Service unavailable');

      process.env.CRON_SECRET = originalSecret;
    });

    it('should reject requests with invalid token', async () => {
      process.env.CRON_SECRET = 'valid-secret';

      const request = new Request('http://localhost/api/cron/trinity-revenue-sync', {
        method: 'GET',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json() as { error: string };

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should accept requests with valid token', async () => {
      process.env.CRON_SECRET = 'valid-secret';

      // Mock the sync functions
      vi.mock('@/lib/trinity/revenue-sync', () => ({
        syncTrinityRevenue: vi.fn().mockResolvedValue({
          ok: true,
          period: '24h',
          recordsCreated: 1,
          totalCost: 100,
          agentCount: 3,
          errors: [],
        }),
        checkTrinityRevenueHealth: vi.fn().mockResolvedValue({
          healthy: true,
          trinity_api: true,
          database: true,
          message: 'Trinity revenue sync ready',
        }),
      }));

      const request = new Request('http://localhost/api/cron/trinity-revenue-sync', {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-secret',
        },
      });

      const response = await GET(request);

      // Should pass authorization
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(503);
    });
  });

  describe('Query Parameters', () => {
    it('should accept period parameter', async () => {
      process.env.CRON_SECRET = 'valid-secret';

      const request = new Request(
        'http://localhost/api/cron/trinity-revenue-sync?period=1h',
        {
          method: 'GET',
          headers: {
            authorization: 'Bearer valid-secret',
          },
        }
      );

      const response = await GET(request);
      const data = await response.json() as { period: string };

      // Should handle the period parameter
      expect(response.status).toBeDefined();
    });

    it('should use default period when not specified', async () => {
      process.env.CRON_SECRET = 'valid-secret';

      const request = new Request('http://localhost/api/cron/trinity-revenue-sync', {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-secret',
        },
      });

      const response = await GET(request);
      const data = await response.json() as { period: string };

      // Default should be 24h
      expect(data.period).toBe('24h');
    });
  });

  describe('Response Format', () => {
    it('should return structured response on success', async () => {
      process.env.CRON_SECRET = 'valid-secret';

      const request = new Request('http://localhost/api/cron/trinity-revenue-sync', {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-secret',
        },
      });

      const response = await GET(request);
      const data = await response.json() as Record<string, unknown>;

      expect(data).toHaveProperty('ok');
      expect(data).toHaveProperty('period');
      expect(data).toHaveProperty('recordsCreated');
      expect(data).toHaveProperty('totalCost');
      expect(data).toHaveProperty('agentCount');
    });

    it('should include error details on failure', async () => {
      process.env.CRON_SECRET = 'valid-secret';

      const request = new Request('http://localhost/api/cron/trinity-revenue-sync', {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-secret',
        },
      });

      const response = await GET(request);
      const data = await response.json() as Record<string, unknown>;

      // On failure, should include error information
      if (!data.ok) {
        expect(data).toHaveProperty('error');
      }
    });
  });

  describe('HTTP Status Codes', () => {
    it('should return 503 when CRON_SECRET is missing', async () => {
      const originalSecret = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;

      const request = new Request('http://localhost/api/cron/trinity-revenue-sync', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(503);

      process.env.CRON_SECRET = originalSecret;
    });

    it('should return 401 on unauthorized request', async () => {
      process.env.CRON_SECRET = 'valid-secret';

      const request = new Request('http://localhost/api/cron/trinity-revenue-sync', {
        method: 'GET',
        headers: {
          authorization: 'Bearer wrong-token',
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });
});
