import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('/sso/start', () => {
  beforeEach(() => vi.resetModules());

  it('redirects to sso-unavailable when org config missing', async () => {
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: () => ({
        from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'org_1', slug: 'acme' }, error: null }) }) }) }),
      }),
    }));

    vi.doMock('../../../lib/auth/sso-config', () => ({ getOrgSsoConfig: vi.fn(async () => null) }));

    const { GET } = await import('../../../app/sso/start/route');
    const res = await GET(new Request('http://localhost/sso/start?org=acme&next=%2Fquickstart') as never);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/login?error=sso-unavailable');
  });
});
