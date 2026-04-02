import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('resolveLoginContext', () => {
  beforeEach(() => vi.resetModules());

  it('renders sso-only for enforced org without break-glass', async () => {
    vi.doMock('../../lib/supabase-server', () => ({
      getSupabaseAdmin: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'o1', slug: 'acme', name: 'Acme', status: 'active' }, error: null }) }) }) }) }),
    }));
    vi.doMock('../../lib/auth/sso-config', async (orig) => ({
      ...(await orig()),
      getOrgSsoConfig: vi.fn(async () => ({ is_enabled: true, enforce_sso: true, break_glass_email_login_enabled: false })),
      getSsoDisplayState: vi.fn(async () => ({ mode: 'sso-only' })),
    }));
    const { resolveLoginContext } = await import('../../lib/auth/login-context');
    const context = await resolveLoginContext({ orgSlug: 'acme' });
    expect(context.mode).toBe('sso-only');
  });
});
