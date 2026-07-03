import { describe, it, expect } from 'vitest';
import {
  mapMarketplacePlanName,
  periodEndFrom,
  GHMP_SUBSCRIPTION_PREFIX,
} from '@/lib/marketplace/subscription-sync';

describe('mapMarketplacePlanName', () => {
  it('maps enterprise plan names', () => {
    expect(mapMarketplacePlanName('DSG Gate Enterprise')).toBe('enterprise');
    expect(mapMarketplacePlanName('ENTERPRISE')).toBe('enterprise');
  });

  it('maps business plan names', () => {
    expect(mapMarketplacePlanName('DSG Business')).toBe('business');
    expect(mapMarketplacePlanName('business plan')).toBe('business');
  });

  it('maps pro plan names', () => {
    expect(mapMarketplacePlanName('DSG Gate Pro')).toBe('pro');
    expect(mapMarketplacePlanName('Pro')).toBe('pro');
  });

  it('prefers the highest tier when multiple keywords appear', () => {
    // "Enterprise Pro" must not downgrade to pro
    expect(mapMarketplacePlanName('Enterprise Pro')).toBe('enterprise');
    expect(mapMarketplacePlanName('Business Pro')).toBe('business');
  });

  it('falls back to trial (safe floor) for unknown names', () => {
    expect(mapMarketplacePlanName('Starter')).toBe('trial');
    expect(mapMarketplacePlanName('')).toBe('trial');
    expect(mapMarketplacePlanName(null)).toBe('trial');
    expect(mapMarketplacePlanName(undefined)).toBe('trial');
  });

  it('never over-entitles: unknown input never maps to a paid tier', () => {
    const junk = ['free', 'basic', 'x', '  ', 'ราคาพิเศษ'];
    for (const name of junk) {
      expect(['trial']).toContain(mapMarketplacePlanName(name));
    }
  });
});

describe('periodEndFrom', () => {
  const start = Date.UTC(2026, 0, 1);

  it('monthly cycle ends 30 days after start', () => {
    const end = periodEndFrom(start, 'monthly');
    expect(end.getTime() - start).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('yearly cycle ends 365 days after start', () => {
    const end = periodEndFrom(start, 'yearly');
    expect(end.getTime() - start).toBe(365 * 24 * 60 * 60 * 1000);
  });

  it('unknown cycle defaults to monthly window', () => {
    const end = periodEndFrom(start, 'weekly');
    expect(end.getTime() - start).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe('GHMP_SUBSCRIPTION_PREFIX', () => {
  it('is distinct from real Stripe subscription id prefixes', () => {
    expect(GHMP_SUBSCRIPTION_PREFIX.startsWith('sub_')).toBe(false);
    expect(GHMP_SUBSCRIPTION_PREFIX).toBe('ghmp_');
  });
});
