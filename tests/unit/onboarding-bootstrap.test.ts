import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('bootstrapOrgStarterState', () => {
  beforeEach(() => vi.resetModules());

  it('is idempotent when already completed', async () => {
    vi.doMock('../../lib/supabase-server', () => ({
      getSupabaseAdmin: () => ({
        from: () => ({
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 's1', bootstrap_status: 'completed' }, error: null }) }) }),
        }),
      }),
    }));
    const { bootstrapOrgStarterState } = await import('../../lib/onboarding/bootstrap');
    const res = await bootstrapOrgStarterState('o1');
    expect(res.created).toBe(false);
  });
});
