import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('seat activation', () => {
  beforeEach(() => vi.resetModules());

  it('creates seat activation for billable role', async () => {
    const rpc = vi.fn(async () => ({
      data: [{ activated: true, reason: 'ACTIVATED', active_seats: 1, purchased_seats: 10, proof_hash: 'sha256:test' }],
      error: null,
    }));
    vi.doMock('../../lib/supabase-server', () => ({
      getSupabaseAdmin: () => ({
        from: (table: string) => ({
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
        }),
        rpc,
      }),
    }));
    const { activateBillableSeat } = await import('../../lib/billing/seat-activation');
    const res = await activateBillableSeat({ orgId: 'o1', email: 'a@b.com', role: 'viewer' });
    expect(res.activated).toBe(true);
    expect(rpc).toHaveBeenCalledOnce();
  });

  it('does not activate for non-billable role', async () => {
    const rpc = vi.fn();
    vi.doMock('../../lib/supabase-server', () => ({
      getSupabaseAdmin: () => ({
        rpc,
      }),
    }));
    const { activateBillableSeat } = await import('../../lib/billing/seat-activation');
    const res = await activateBillableSeat({ orgId: 'o1', email: 'a@b.com', role: 'guest' });
    expect(res.activated).toBe(false);
    expect(res.reason).toBe('NON_BILLABLE_ROLE');
    expect(rpc).not.toHaveBeenCalled();
  });
});
