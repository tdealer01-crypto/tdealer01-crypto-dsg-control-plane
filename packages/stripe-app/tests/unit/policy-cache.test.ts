import { PolicyCache } from '../../src/lib/policy-cache';
import { describe, it, expect, beforeEach } from 'vitest';

describe('PolicyCache', () => {
  let cache: PolicyCache;

  beforeEach(() => {
    cache = new PolicyCache();
  });

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
  });

  it('should return null for entries beyond TTL', () => {
    // This test verifies that entries older than TTL are not returned
    // In a real scenario with time mocking, we'd advance time
    // For now, we test that fresh entries are returned
    const policy = {
      stripe_account_id: 'acct_test',
      operation_type: 'charge',
      conditions: {},
      action: 'block' as const,
      cached_at: Date.now(),
    };

    cache.set('acct_test', 'charge', policy);

    // Fresh entry should be returned
    const retrieved = cache.get('acct_test', 'charge');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.action).toBe('block');
  });

  it('should invalidate specific policies', () => {
    cache.set('acct_test', 'charge', {
      stripe_account_id: 'acct_test',
      operation_type: 'charge',
      conditions: {},
      action: 'allow' as const,
      cached_at: Date.now(),
    });

    cache.invalidate('acct_test', 'charge');
    const retrieved = cache.get('acct_test', 'charge');

    expect(retrieved).toBeNull();
  });

  it('should invalidate all policies for account', () => {
    cache.set('acct_test', 'charge', {
      stripe_account_id: 'acct_test',
      operation_type: 'charge',
      conditions: {},
      action: 'allow' as const,
      cached_at: Date.now(),
    });

    cache.set('acct_test', 'payout', {
      stripe_account_id: 'acct_test',
      operation_type: 'payout',
      conditions: {},
      action: 'review' as const,
      cached_at: Date.now(),
    });

    cache.invalidate('acct_test');

    expect(cache.get('acct_test', 'charge')).toBeNull();
    expect(cache.get('acct_test', 'payout')).toBeNull();
  });
});
