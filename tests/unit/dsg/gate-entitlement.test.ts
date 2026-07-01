import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSupabaseAdminMock = vi.fn();

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

vi.mock('../../../lib/revenue/events', () => ({
  insertRevenueEvent: vi.fn(async () => ({ id: 'rev_1' })),
}));

vi.mock('../../../lib/billing/metered', () => ({
  reportMeterEvent: vi.fn(async () => ({ ok: false, error: 'not_configured', skipped: true })),
}));

describe('dsg gate entitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns free defaults for unauthenticated callers', async () => {
    const { checkGateEntitlement } = await import('../../../lib/dsg/gate-entitlement');
    const result = await checkGateEntitlement(null);

    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('free');
    expect(result.evalsRemaining).toBe(50);
  });

  it('uses db-backed entitlement + usage when available', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { org_id: 'org_1', tier: 'pro', evals_per_month: 5000, stripe_customer_id: null },
      error: null,
    });

    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'dsg_gate_entitlements') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle })),
            })),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: 20, error: null }),
    });

    const { checkGateEntitlement } = await import('../../../lib/dsg/gate-entitlement');
    const result = await checkGateEntitlement('org_1');

    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('pro');
    expect(result.evalsRemaining).toBe(4980);
    expect(result.requiresPayment).toBe(false);
  });
});
