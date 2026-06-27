import { describe, it, expect } from 'vitest';
import {
  getQuotaForPlan,
  effectivePlan,
  FREE_QUOTA,
  PLAN_QUOTA,
  ACTIVE_STATUSES,
  REVOKED_STATUSES,
} from '../../../lib/billing/entitlements';

describe('getQuotaForPlan', () => {
  it('returns FREE_QUOTA for null', () => {
    expect(getQuotaForPlan(null)).toBe(FREE_QUOTA);
  });

  it('returns FREE_QUOTA for undefined', () => {
    expect(getQuotaForPlan(undefined)).toBe(FREE_QUOTA);
  });

  it('returns FREE_QUOTA for empty string', () => {
    expect(getQuotaForPlan('')).toBe(FREE_QUOTA);
  });

  it('returns FREE_QUOTA for unknown plan', () => {
    expect(getQuotaForPlan('unknown_plan')).toBe(FREE_QUOTA);
  });

  it('returns correct quota for each known plan', () => {
    for (const [plan, quota] of Object.entries(PLAN_QUOTA)) {
      expect(getQuotaForPlan(plan)).toBe(quota);
    }
  });

  it('invariant: result is always a positive integer', () => {
    const plans = ['free', 'trial', 'pro', 'business', 'enterprise', null, 'ghost'];
    for (const plan of plans) {
      const result = getQuotaForPlan(plan);
      expect(result).toBeGreaterThan(0);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('invariant: enterprise > business > pro > trial > free', () => {
    expect(getQuotaForPlan('enterprise')).toBeGreaterThan(getQuotaForPlan('business'));
    expect(getQuotaForPlan('business')).toBeGreaterThan(getQuotaForPlan('pro'));
    expect(getQuotaForPlan('pro')).toBeGreaterThan(getQuotaForPlan('trial'));
    expect(getQuotaForPlan('trial')).toBeGreaterThan(getQuotaForPlan('free'));
  });
});

describe('effectivePlan', () => {
  it('returns free for null status', () => {
    expect(effectivePlan(null, 'pro')).toBe('free');
  });

  it('returns free for null planKey', () => {
    expect(effectivePlan('active', null)).toBe('free');
  });

  it('returns planKey for active status', () => {
    expect(effectivePlan('active', 'pro')).toBe('pro');
    expect(effectivePlan('active', 'business')).toBe('business');
  });

  it('returns planKey for trialing status', () => {
    expect(effectivePlan('trialing', 'pro')).toBe('pro');
  });

  it('returns free for canceled status', () => {
    expect(effectivePlan('canceled', 'pro')).toBe('free');
  });

  it('returns free for unpaid status', () => {
    expect(effectivePlan('unpaid', 'pro')).toBe('free');
  });

  it('returns free for past_due status', () => {
    expect(effectivePlan('past_due', 'pro')).toBe('free');
  });

  it('invariant: ACTIVE_STATUSES and REVOKED_STATUSES are disjoint', () => {
    for (const s of ACTIVE_STATUSES) {
      expect(REVOKED_STATUSES.has(s)).toBe(false);
    }
  });
});
