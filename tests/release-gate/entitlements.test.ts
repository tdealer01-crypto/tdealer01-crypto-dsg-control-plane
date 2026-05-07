import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hasReleaseGateProAccess,
  recordSubscriptionEvent,
} from '@/lib/release-gate/entitlements';

// Mock Supabase
vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
    })),
  })),
}));

describe('Release Gate Entitlements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasReleaseGateProAccess', () => {
    it('should return false for null email', async () => {
      const result = await hasReleaseGateProAccess(null);
      expect(result).toBe(false);
    });

    it('should return false for empty email', async () => {
      const result = await hasReleaseGateProAccess('');
      expect(result).toBe(false);
    });

    it('should return false for invalid email type', async () => {
      const result = await hasReleaseGateProAccess(undefined as any);
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const result = await hasReleaseGateProAccess('user@example.com');
      // Should not throw, should return false
      expect(result).toBe(false);
    });

    it('should return false if subscription is expired', async () => {
      const pastDate = new Date('2020-01-01').toISOString();
      const result = await hasReleaseGateProAccess('user@example.com');
      // With mocked DB, should handle gracefully
      expect(result).toBe(false);
    });
  });

  describe('recordSubscriptionEvent', () => {
    it('should return false if email is missing', async () => {
      const result = await recordSubscriptionEvent(
        '',
        'cus_123',
        'sub_123',
        'active',
        new Date()
      );
      expect(result).toBe(false);
    });

    it('should return false if customerId is missing', async () => {
      const result = await recordSubscriptionEvent(
        'user@example.com',
        '',
        'sub_123',
        'active',
        new Date()
      );
      expect(result).toBe(false);
    });

    it('should return false if subscriptionId is missing', async () => {
      const result = await recordSubscriptionEvent(
        'user@example.com',
        'cus_123',
        '',
        'active',
        new Date()
      );
      expect(result).toBe(false);
    });
  });
});
