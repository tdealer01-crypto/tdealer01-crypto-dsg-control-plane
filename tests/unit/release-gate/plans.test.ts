import { describe, expect, it } from 'vitest';
import { releaseGatePlans } from '../../../lib/release-gate/plans';

describe('releaseGatePlans', () => {
  it('defines exactly three plans', () => {
    expect(releaseGatePlans).toHaveLength(3);
  });

  it('has plans with ids: free, starter, pro in that order', () => {
    expect(releaseGatePlans.map((p) => p.id)).toEqual(['free', 'starter', 'pro']);
  });

  it('each plan has required fields: id, name, price, description, features', () => {
    for (const plan of releaseGatePlans) {
      expect(plan.id).toBeDefined();
      expect(plan.name).toBeTruthy();
      expect(plan.price).toBeTruthy();
      expect(plan.description).toBeTruthy();
      expect(Array.isArray(plan.features)).toBe(true);
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it('free plan has $0 price', () => {
    const free = releaseGatePlans.find((p) => p.id === 'free');
    expect(free?.price).toBe('$0');
  });

  it('pro plan has more features than free plan', () => {
    const free = releaseGatePlans.find((p) => p.id === 'free')!;
    const pro = releaseGatePlans.find((p) => p.id === 'pro')!;
    expect(pro.features.length).toBeGreaterThan(free.features.length);
  });
});
