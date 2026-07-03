import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSupabaseAdminMock = vi.fn();

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

vi.mock('../../../lib/billing/metered', () => ({
  reportMeterEvent: vi.fn(async () => ({ ok: false, error: 'not_configured', skipped: true })),
}));

vi.mock('../../../lib/database/quotas', () => ({
  logQuotaConsumption: vi.fn(async () => ({ id: 'quota_1' })),
}));

describe('delivery proof entitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns demo entitlement for unauthenticated callers', async () => {
    const { checkDeliveryProofEntitlement } = await import('../../../lib/delivery-proof/entitlement');
    const result = await checkDeliveryProofEntitlement(null);

    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('free');
    expect(result.scansRemaining).toBe(1);
  });

  it('maps business tier to unlimited and computes remaining quota', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        org_id: '00000000-0000-0000-0000-000000000123',
        current_tier: 'business',
        scans_included_monthly: null,
        customer_id: null,
      },
      error: null,
    });

    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'delivery_proof_entitlements') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle })),
            })),
          };
        }

        if (table === 'delivery_proof_scans') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lt: vi.fn().mockResolvedValue({ count: 8, error: null }),
                })),
              })),
            })),
          };
        }

        throw new Error(`unexpected table ${table}`);
      }),
    });

    const { checkDeliveryProofEntitlement } = await import('../../../lib/delivery-proof/entitlement');
    const result = await checkDeliveryProofEntitlement('00000000-0000-0000-0000-000000000123');

    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('unlimited');
    expect(result.scansRemaining).toBeGreaterThan(0);
    expect(result.requiresPayment).toBe(false);
  });
});
