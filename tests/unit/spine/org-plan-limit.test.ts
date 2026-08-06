import { describe, it, expect } from 'vitest';
import { getOrgPlanLimit } from '../../../lib/spine/engine';

describe('getOrgPlanLimit', () => {
  it('grants the plan limit for an active subscription', () => {
    expect(getOrgPlanLimit({ plan_key: 'pro', status: 'active' })).toBe(10_000);
  });

  it('grants the plan limit for a trialing subscription', () => {
    expect(getOrgPlanLimit({ plan_key: 'business', status: 'trialing' })).toBe(100_000);
  });

  it('falls back to the trial limit for a canceled subscription instead of keeping its old plan_key', () => {
    // This is the bug this test guards against: a canceled subscription row
    // still carries its last plan_key (e.g. 'pro'), but the org has already
    // been revoked to free by revokeSubscription(). Honoring plan_key here
    // would keep granting the old paid quota after cancellation.
    expect(getOrgPlanLimit({ plan_key: 'pro', status: 'canceled' })).toBe(1_000);
  });

  it('falls back to the trial limit for an unpaid subscription', () => {
    expect(getOrgPlanLimit({ plan_key: 'enterprise', status: 'unpaid' })).toBe(1_000);
  });

  it('falls back to the trial limit for a past_due subscription', () => {
    expect(getOrgPlanLimit({ plan_key: 'business', status: 'past_due' })).toBe(1_000);
  });

  it('falls back to the trial limit when there is no subscription row', () => {
    expect(getOrgPlanLimit(null)).toBe(1_000);
    expect(getOrgPlanLimit(undefined)).toBe(1_000);
  });

  it('falls back to the trial limit for an unknown/missing status', () => {
    expect(getOrgPlanLimit({ plan_key: 'pro', status: null })).toBe(1_000);
  });
});
