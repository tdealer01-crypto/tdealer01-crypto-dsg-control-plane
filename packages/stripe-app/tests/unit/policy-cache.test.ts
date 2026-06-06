import { PolicyCache } from '../../src/lib/policy-cache';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PolicyCache', () => {
  let cache: PolicyCache;

  beforeEach(() => {
    cache = new PolicyCache();
  });

  describe('get/set operations', () => {
    it('should store and retrieve policies', () => {
      const policy = {
        stripe_account_id: 'acct_test',
        operation_type: 'charge',
        conditions: { max_amount: 50000 },
        action: 'allow' as const,
        cached_at: Date.now(),
      };

      cache.set('acct_test', 'charge', policy);
      const retrieved = cache.get('acct_test', 'charge');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.action).toBe('allow');
      expect(retrieved?.conditions).toEqual({ max_amount: 50000 });
    });

    it('should return null for non-existent policy', () => {
      const retrieved = cache.get('acct_nonexistent', 'charge');
      expect(retrieved).toBeNull();
    });

    it('should update policy when setting existing key', () => {
      const policy1 = {
        stripe_account_id: 'acct_test',
        operation_type: 'charge',
        conditions: {},
        action: 'allow' as const,
        cached_at: Date.now(),
      };

      const policy2 = {
        stripe_account_id: 'acct_test',
        operation_type: 'charge',
        conditions: {},
        action: 'block' as const,
        cached_at: Date.now(),
      };

      cache.set('acct_test', 'charge', policy1);
      expect(cache.get('acct_test', 'charge')?.action).toBe('allow');

      cache.set('acct_test', 'charge', policy2);
      expect(cache.get('acct_test', 'charge')?.action).toBe('block');
    });

    it('should handle different operation types for same account', () => {
      const chargePolicy = {
        stripe_account_id: 'acct_test',
        operation_type: 'charge',
        conditions: {},
        action: 'allow' as const,
        cached_at: Date.now(),
      };

      const payoutPolicy = {
        stripe_account_id: 'acct_test',
        operation_type: 'payout',
        conditions: {},
        action: 'block' as const,
        cached_at: Date.now(),
      };

      cache.set('acct_test', 'charge', chargePolicy);
      cache.set('acct_test', 'payout', payoutPolicy);

      expect(cache.get('acct_test', 'charge')?.action).toBe('allow');
      expect(cache.get('acct_test', 'payout')?.action).toBe('block');
    });
  });

  describe('TTL expiration', () => {
    it('should return null for expired policies', () => {
      vi.useFakeTimers();

      const policy = {
        stripe_account_id: 'acct_test',
        operation_type: 'charge',
        conditions: {},
        action: 'block' as const,
        cached_at: Date.now(),
      };

      cache.set('acct_test', 'charge', policy);

      // Policy should exist immediately
      expect(cache.get('acct_test', 'charge')).not.toBeNull();

      // Fast forward past TTL (5 minutes + 1 second)
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

      // Policy should be expired now
      expect(cache.get('acct_test', 'charge')).toBeNull();

      vi.useRealTimers();
    });

    it('should keep fresh policies', () => {
      vi.useFakeTimers();

      const policy = {
        stripe_account_id: 'acct_test',
        operation_type: 'charge',
        conditions: {},
        action: 'allow' as const,
        cached_at: Date.now(),
      };

      cache.set('acct_test', 'charge', policy);

      // Fast forward 2 minutes (less than TTL)
      vi.advanceTimersByTime(2 * 60 * 1000);

      expect(cache.get('acct_test', 'charge')).not.toBeNull();

      vi.useRealTimers();
    });

    it('should clean up expired entries from cache on retrieval', () => {
      vi.useFakeTimers();

      const policy = {
        stripe_account_id: 'acct_test',
        operation_type: 'charge',
        conditions: {},
        action: 'allow' as const,
        cached_at: Date.now(),
      };

      cache.set('acct_test', 'charge', policy);

      // Fast forward past TTL
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Trigger retrieval which should clean up
      cache.get('acct_test', 'charge');

      // Second retrieval should also return null
      expect(cache.get('acct_test', 'charge')).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('invalidation', () => {
    it('should invalidate specific policies', () => {
      const policy = {
        stripe_account_id: 'acct_test',
        operation_type: 'charge',
        conditions: {},
        action: 'allow' as const,
        cached_at: Date.now(),
      };

      cache.set('acct_test', 'charge', policy);
      expect(cache.get('acct_test', 'charge')).not.toBeNull();

      cache.invalidate('acct_test', 'charge');

      expect(cache.get('acct_test', 'charge')).toBeNull();
    });

    it('should invalidate all policies for account when operation type not provided', () => {
      const chargePolicy = {
        stripe_account_id: 'acct_test',
        operation_type: 'charge',
        conditions: {},
        action: 'allow' as const,
        cached_at: Date.now(),
      };

      const payoutPolicy = {
        stripe_account_id: 'acct_test',
        operation_type: 'payout',
        conditions: {},
        action: 'review' as const,
        cached_at: Date.now(),
      };

      const refundPolicy = {
        stripe_account_id: 'acct_test',
        operation_type: 'refund',
        conditions: {},
        action: 'block' as const,
        cached_at: Date.now(),
      };

      cache.set('acct_test', 'charge', chargePolicy);
      cache.set('acct_test', 'payout', payoutPolicy);
      cache.set('acct_test', 'refund', refundPolicy);

      cache.invalidate('acct_test');

      expect(cache.get('acct_test', 'charge')).toBeNull();
      expect(cache.get('acct_test', 'payout')).toBeNull();
      expect(cache.get('acct_test', 'refund')).toBeNull();
    });

    it('should not affect other accounts when invalidating', () => {
      const policy1 = {
        stripe_account_id: 'acct_test1',
        operation_type: 'charge',
        conditions: {},
        action: 'allow' as const,
        cached_at: Date.now(),
      };

      const policy2 = {
        stripe_account_id: 'acct_test2',
        operation_type: 'charge',
        conditions: {},
        action: 'block' as const,
        cached_at: Date.now(),
      };

      cache.set('acct_test1', 'charge', policy1);
      cache.set('acct_test2', 'charge', policy2);

      cache.invalidate('acct_test1', 'charge');

      expect(cache.get('acct_test1', 'charge')).toBeNull();
      expect(cache.get('acct_test2', 'charge')).not.toBeNull();
    });
  });

  describe('concurrent access', () => {
    it('should handle multiple rapid get/set operations', () => {
      for (let i = 0; i < 100; i++) {
        const policy = {
          stripe_account_id: `acct_test_${i}`,
          operation_type: 'charge',
          conditions: { iteration: i },
          action: 'allow' as const,
          cached_at: Date.now(),
        };

        cache.set(`acct_test_${i}`, 'charge', policy);
      }

      for (let i = 0; i < 100; i++) {
        const retrieved = cache.get(`acct_test_${i}`, 'charge');
        expect(retrieved).not.toBeNull();
        expect(retrieved?.conditions.iteration).toBe(i);
      }
    });

    it('should handle mixed operations on same cache', () => {
      const policy1 = {
        stripe_account_id: 'acct_concurrent',
        operation_type: 'charge',
        conditions: {},
        action: 'allow' as const,
        cached_at: Date.now(),
      };

      const policy2 = {
        stripe_account_id: 'acct_concurrent',
        operation_type: 'payout',
        conditions: {},
        action: 'block' as const,
        cached_at: Date.now(),
      };

      cache.set('acct_concurrent', 'charge', policy1);
      cache.set('acct_concurrent', 'payout', policy2);

      expect(cache.get('acct_concurrent', 'charge')).not.toBeNull();
      expect(cache.get('acct_concurrent', 'payout')).not.toBeNull();

      cache.invalidate('acct_concurrent', 'charge');

      expect(cache.get('acct_concurrent', 'charge')).toBeNull();
      expect(cache.get('acct_concurrent', 'payout')).not.toBeNull();
    });
  });

  describe('clear operation', () => {
    it('should clear all cached policies', () => {
      cache.set('acct_test1', 'charge', {
        stripe_account_id: 'acct_test1',
        operation_type: 'charge',
        conditions: {},
        action: 'allow' as const,
        cached_at: Date.now(),
      });

      cache.set('acct_test2', 'payout', {
        stripe_account_id: 'acct_test2',
        operation_type: 'payout',
        conditions: {},
        action: 'block' as const,
        cached_at: Date.now(),
      });

      cache.clear();

      expect(cache.get('acct_test1', 'charge')).toBeNull();
      expect(cache.get('acct_test2', 'payout')).toBeNull();
    });
  });
});
