import { describe, expect, it } from 'vitest';
import {
  decideGateRevenueAccess,
  normalizeGateTier,
} from '../../../lib/dsg/gate-revenue-policy';

describe('normalizeGateTier', () => {
  it('maps only supported paid plans to gate tiers', () => {
    expect(normalizeGateTier('pro')).toBe('pro');
    expect(normalizeGateTier('business')).toBe('pro');
    expect(normalizeGateTier('enterprise')).toBe('enterprise');
    expect(normalizeGateTier('unknown')).toBe('free');
  });
});

describe('decideGateRevenueAccess', () => {
  it('allows free usage only while included quota remains', () => {
    expect(
      decideGateRevenueAccess({
        tier: 'free',
        subscriptionStatus: 'free',
        includedLimit: 50,
        used: 49,
        overageEnabled: false,
        hasStripeCustomer: false,
        hasStripeSubscription: false,
        meteringConfigured: false,
      }),
    ).toEqual({
      allowed: true,
      remaining: 1,
      accessMode: 'included_quota',
      requiresPayment: false,
    });

    expect(
      decideGateRevenueAccess({
        tier: 'free',
        subscriptionStatus: 'free',
        includedLimit: 50,
        used: 50,
        overageEnabled: false,
        hasStripeCustomer: false,
        hasStripeSubscription: false,
        meteringConfigured: false,
      }).accessMode,
    ).toBe('quota_exceeded');
  });

  it('never grants a paid tier when Stripe says the subscription is inactive', () => {
    const result = decideGateRevenueAccess({
      tier: 'pro',
      subscriptionStatus: 'past_due',
      includedLimit: 5_000,
      used: 0,
      overageEnabled: true,
      hasStripeCustomer: true,
      hasStripeSubscription: true,
      meteringConfigured: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.accessMode).toBe('subscription_inactive');
  });

  it('allows Pro overage only when every billing dependency is present', () => {
    const ready = decideGateRevenueAccess({
      tier: 'pro',
      subscriptionStatus: 'active',
      includedLimit: 5_000,
      used: 5_000,
      overageEnabled: true,
      hasStripeCustomer: true,
      hasStripeSubscription: true,
      meteringConfigured: true,
    });

    expect(ready.allowed).toBe(true);
    expect(ready.accessMode).toBe('metered_overage');

    const missingMeter = decideGateRevenueAccess({
      tier: 'pro',
      subscriptionStatus: 'active',
      includedLimit: 5_000,
      used: 5_000,
      overageEnabled: true,
      hasStripeCustomer: true,
      hasStripeSubscription: true,
      meteringConfigured: false,
    });

    expect(missingMeter.allowed).toBe(false);
    expect(missingMeter.accessMode).toBe('billing_unavailable');
  });

  it('treats active Enterprise as unlimited but blocks canceled Enterprise', () => {
    const active = decideGateRevenueAccess({
      tier: 'enterprise',
      subscriptionStatus: 'active',
      includedLimit: 999_999,
      used: 1_500_000,
      overageEnabled: false,
      hasStripeCustomer: true,
      hasStripeSubscription: true,
      meteringConfigured: false,
    });
    expect(active.allowed).toBe(true);

    const canceled = decideGateRevenueAccess({
      tier: 'enterprise',
      subscriptionStatus: 'canceled',
      includedLimit: 999_999,
      used: 0,
      overageEnabled: false,
      hasStripeCustomer: true,
      hasStripeSubscription: true,
      meteringConfigured: false,
    });
    expect(canceled.allowed).toBe(false);
  });
});
