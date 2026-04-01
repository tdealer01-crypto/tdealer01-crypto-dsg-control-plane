import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('seat activation', () => {
  beforeEach(() => vi.resetModules());

  it('creates seat activation for billable role', async () => {
    const insert = vi.fn(async () => ({ error: null }));
    vi.doMock('../../lib/supabase-server', () => ({
      getSupabaseAdmin: () => ({
        from: (table: string) => ({
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
          insert,
        }),
      }),
    }));
    const { ensureSeatActivatedForUser } = await import('../../lib/billing/seat-activation');
    const res = await ensureSeatActivatedForUser({ orgId: 'o1', email: 'a@b.com', role: 'viewer' });
    expect(res.created).toBe(true);
    expect(insert).toHaveBeenCalledOnce();
  });

  it('does not create for guest role', async () => {
    const { ensureSeatActivatedForUser } = await import('../../lib/billing/seat-activation');
    const res = await ensureSeatActivatedForUser({ orgId: 'o1', email: 'a@b.com', role: 'guest_auditor' });
    expect(res.created).toBe(false);
  });
});
