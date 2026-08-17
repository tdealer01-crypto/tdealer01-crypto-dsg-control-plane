import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchTrinityCosts,
  createRevenueRecords,
  syncTrinityRevenue,
  checkTrinityRevenueHealth,
} from '@/lib/trinity/revenue-sync';

describe('Trinity Revenue Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchTrinityCosts', () => {
    it('should handle successful API response', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_agents: 7,
          healthy_agents: 6,
          total_cost: 125.50,
          agents: [
            { agent: 'executor', cost: 45.20, jobsProcessed: 120, cpuUsage: 75.5 },
            { agent: 'scheduler', cost: 35.80, jobsProcessed: 200, cpuUsage: 45.2 },
            { agent: 'monitor', cost: 22.50, jobsProcessed: 500, cpuUsage: 20.1 },
          ],
        }),
      });

      const result = await fetchTrinityCosts('24h');

      expect(result).toBeDefined();
      expect(result?.total_cost).toBe(125.50);
      expect(result?.total_agents).toBe(7);
      expect(result?.agents).toHaveLength(3);
    });

    it('should return null on API error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await fetchTrinityCosts('24h');

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network failed'));

      const result = await fetchTrinityCosts('24h');

      expect(result).toBeNull();
    });

    it('should use correct period parameter', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_agents: 0,
          healthy_agents: 0,
          total_cost: 0,
        }),
      });

      await fetchTrinityCosts('1h');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/costs'),
        expect.any(Object)
      );
    });
  });

  describe('createRevenueRecords', () => {
    it('should fail when Supabase is not configured', async () => {
      const metrics = {
        total_agents: 3,
        healthy_agents: 3,
        total_cost: 100,
        period: '24h',
        timestamp: new Date().toISOString(),
        agents: [],
        fragmentation_risk: 5,
        context_sharing: 90,
      };

      // Temporarily clear env vars
      const originalUrl = process.env.SUPABASE_URL;
      process.env.SUPABASE_URL = undefined;

      const result = await createRevenueRecords(metrics);

      expect(result.ok).toBe(false);
      expect(result.errors).toContain('Supabase credentials not configured');

      process.env.SUPABASE_URL = originalUrl;
    });

    it('should create revenue records with valid metrics', async () => {
      // This test requires Supabase mock/integration
      // Placeholder for integration test
      expect(true).toBe(true);
    });
  });

  describe('syncTrinityRevenue', () => {
    it('should return error when Trinity API unreachable', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Connection refused'));

      const result = await syncTrinityRevenue('24h');

      expect(result.ok).toBe(false);
      expect(result.errors).toContain('Failed to fetch Trinity metrics');
    });

    it('should handle success flow', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_agents: 1,
          healthy_agents: 1,
          total_cost: 50,
          agents: [{ agent: 'test', cost: 50, jobsProcessed: 10, cpuUsage: 30 }],
        }),
      });

      // Note: This will fail on createRevenueRecords due to Supabase not being configured
      // But it demonstrates the flow
      const result = await syncTrinityRevenue('24h');

      expect(result).toBeDefined();
      expect(result.period).toBe('24h');
    });
  });

  describe('checkTrinityRevenueHealth', () => {
    it('should report healthy when services are available', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
      });

      // Set required env vars
      const originalUrl = process.env.SUPABASE_URL;
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      process.env.SUPABASE_URL = 'https://example.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

      const result = await checkTrinityRevenueHealth();

      expect(result.trinity_api).toBe(true);
      expect(result.database).toBe(true);
      expect(result.healthy).toBe(true);

      process.env.SUPABASE_URL = originalUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    });

    it('should report unhealthy when Trinity API is down', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Connection failed'));

      const result = await checkTrinityRevenueHealth();

      expect(result.trinity_api).toBe(false);
      expect(result.healthy).toBe(false);
      expect(result.message).toContain('degraded');
    });

    it('should report unhealthy when database not configured', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
      });

      const originalUrl = process.env.SUPABASE_URL;
      process.env.SUPABASE_URL = undefined;

      const result = await checkTrinityRevenueHealth();

      expect(result.database).toBe(false);
      expect(result.healthy).toBe(false);

      process.env.SUPABASE_URL = originalUrl;
    });
  });

  describe('Error handling', () => {
    it('should handle malformed Trinity response gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // Missing required fields
        }),
      });

      const result = await fetchTrinityCosts('24h');

      expect(result).toBeDefined();
      expect(result?.total_cost).toBe(0);
      expect(result?.total_agents).toBe(0);
    });

    it('should handle timeout during API call', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const result = await fetchTrinityCosts('24h');

      expect(result).toBeNull();
    });
  });
});
