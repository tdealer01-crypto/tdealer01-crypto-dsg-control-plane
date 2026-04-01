import { afterEach, describe, expect, it, vi } from 'vitest';

describe('billing overage config', () => {
  afterEach(() => {
    delete process.env.OVERAGE_RATE_USD;
    vi.resetModules();
  });

  it('uses default overage rate when env is unset', async () => {
    const { getOverageRateUsd } = await import('../../../lib/billing/overage-config');
    expect(getOverageRateUsd()).toBe(0.001);
  });

  it('uses env overage rate when env value is valid', async () => {
    process.env.OVERAGE_RATE_USD = '0.125';
    const { getOverageRateUsd } = await import('../../../lib/billing/overage-config');
    expect(getOverageRateUsd()).toBe(0.125);
  });

  it('falls back to default when env value is invalid', async () => {
    process.env.OVERAGE_RATE_USD = '-1';
    const { getOverageRateUsd } = await import('../../../lib/billing/overage-config');
    expect(getOverageRateUsd()).toBe(0.001);
  });
});
