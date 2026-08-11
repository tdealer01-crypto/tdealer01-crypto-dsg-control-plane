import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('../../../lib/billing/metered', () => ({
  reportMeterEvent: vi.fn(),
}));

vi.mock('../../../lib/revenue/events', () => ({
  insertRevenueEvent: vi.fn(),
}));

import {
  fulfillSubscription,
  revokeSubscription,
  gateTierForBillingPlan,
} from '../../../lib/billing/fulfillment';

function setupMock(options: { orgError?: any; gateError?: any } = {}) {
  const orgChain: any = {
    update: vi.fn(),
    eq: vi.fn(),
  };
  orgChain.update.mockReturnValue(orgChain);
  orgChain.eq.mockResolvedValue({ error: options.orgError ?? null });

  const gateChain: any = {
    upsert: vi.fn().mockResolvedValue({ error: options.gateError ?? null }),
  };

  mockFrom.mockImplementation((table: string) => {
    if (table === 'organizations') return orgChain;
    if (table === 'dsg_gate_entitlements') return gateChain;
    throw new Error(`unexpected table ${table}`);
  });

  return { orgChain, gateChain };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('gateTierForBillingPlan', () => {
  it('maps Pro and Business to the verified Pro gate tier', () => {
    expect(gateTierForBillingPlan('pro')).toBe('pro');
    expect(gateTierForBillingPlan('business')).toBe('pro');
  });

  it('maps Enterprise to Enterprise and unknown products to Free', () => {
    expect(gateTierForBillingPlan('enterprise')).toBe('enterprise');
    expect(gateTierForBillingPlan('finance_skills')).toBe('free');
    expect(gateTierForBillingPlan('free')).toBe('free');
  });
});

describe('fulfillSubscription', () => {
  it('returns ok:false for empty orgId', async () => {
    const result = await fulfillSubscription('', 'pro', 'active');
    expect(result.ok).toBe(false);
  });

  it('returns ok:false for empty planKey', async () => {
    const result = await fulfillSubscription('org-1', '', 'active');
    expect(result.ok).toBe(false);
  });

  it('writes organizations.plan and Pro gate entitlement on active Pro', async () => {
    const { orgChain, gateChain } = setupMock();
    const result = await fulfillSubscription('org-1', 'pro', 'active');

    expect(result.ok).toBe(true);
    expect(orgChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'pro' }),
    );
    expect(orgChain.eq).toHaveBeenCalledWith('id', 'org-1');
    expect(gateChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-1',
        tier: 'pro',
        evals_per_month: 5000,
      }),
      { onConflict: 'org_id' },
    );
  });

  it('grants the Pro gate tier during the 14-day Pro trial', async () => {
    const { gateChain } = setupMock();
    const result = await fulfillSubscription('org-1', 'pro', 'trialing');

    expect(result.ok).toBe(true);
    expect(gateChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'pro', evals_per_month: 5000 }),
      { onConflict: 'org_id' },
    );
  });

  it('maps active Business billing to Pro gate entitlement instead of Free', async () => {
    const { orgChain, gateChain } = setupMock();
    const result = await fulfillSubscription('org-1', 'business', 'active');

    expect(result.ok).toBe(true);
    expect(orgChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'business' }),
    );
    expect(gateChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'pro', evals_per_month: 5000 }),
      { onConflict: 'org_id' },
    );
  });

  it('writes Enterprise gate entitlement for active Enterprise', async () => {
    const { gateChain } = setupMock();
    const result = await fulfillSubscription('org-1', 'enterprise', 'active');

    expect(result.ok).toBe(true);
    expect(gateChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'enterprise', evals_per_month: 999999 }),
      { onConflict: 'org_id' },
    );
  });

  it('converges canceled status to free org and free gate tier', async () => {
    const { orgChain, gateChain } = setupMock();
    const result = await fulfillSubscription('org-1', 'pro', 'canceled');

    expect(result.ok).toBe(true);
    expect(orgChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'free' }),
    );
    expect(gateChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'free', evals_per_month: 50 }),
      { onConflict: 'org_id' },
    );
  });

  it('returns ok:false when organizations update fails', async () => {
    setupMock({ orgError: { message: 'DB error' } });
    const result = await fulfillSubscription('org-1', 'pro', 'active');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('DB error');
  });

  it('returns ok:false when gate entitlement synchronization fails', async () => {
    setupMock({ gateError: { message: 'gate DB error' } });
    const result = await fulfillSubscription('org-1', 'pro', 'active');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('gate_entitlement_sync_failed');
  });

  it('is idempotent: repeated fulfillment writes the same final state', async () => {
    const { orgChain, gateChain } = setupMock();
    await fulfillSubscription('org-1', 'pro', 'active');
    await fulfillSubscription('org-1', 'pro', 'active');

    expect(orgChain.update).toHaveBeenCalledTimes(2);
    expect(gateChain.upsert).toHaveBeenCalledTimes(2);
    expect(orgChain.update.mock.calls[0][0].plan).toBe(orgChain.update.mock.calls[1][0].plan);
    expect(gateChain.upsert.mock.calls[0][0].tier).toBe(gateChain.upsert.mock.calls[1][0].tier);
  });
});

describe('revokeSubscription', () => {
  it('returns ok:false for empty orgId', async () => {
    const result = await revokeSubscription('');
    expect(result.ok).toBe(false);
  });

  it('sets both organizations and gate entitlement to free', async () => {
    const { orgChain, gateChain } = setupMock();
    const result = await revokeSubscription('org-1');

    expect(result.ok).toBe(true);
    expect(orgChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'free' }),
    );
    expect(gateChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'free', evals_per_month: 50 }),
      { onConflict: 'org_id' },
    );
  });

  it('returns ok:false on organizations error', async () => {
    setupMock({ orgError: { message: 'network timeout' } });
    const result = await revokeSubscription('org-1');
    expect(result.ok).toBe(false);
  });
});
