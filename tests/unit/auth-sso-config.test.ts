import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('sso config helpers', () => {
  beforeEach(() => vi.resetModules());

  it('orgRequiresSso is true only when enabled + enforced', async () => {
    vi.doMock('../../lib/supabase-server', () => ({
      getSupabaseAdmin: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { is_enabled: true, enforce_sso: true, break_glass_email_login_enabled: false, provider: 'workos', org_id: 'o1', metadata: {} }, error: null }) }) }) }) }),
    }));

    const { orgRequiresSso } = await import('../../lib/auth/sso-config');
    await expect(orgRequiresSso('o1')).resolves.toBe(true);
  });
});
