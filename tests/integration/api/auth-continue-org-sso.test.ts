import { beforeEach, describe, expect, it, vi } from 'vitest';

function buildReq() {
  const form = new FormData();
  form.set('email', 'user@acme.com');
  form.set('org', 'acme');
  form.set('next', '/quickstart');
  return new Request('http://localhost/auth/continue', { method: 'POST', body: form });
}


function setAuthEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.APP_URL = 'http://localhost';
}

describe('/auth/continue org-scoped sso', () => {
  beforeEach(() => {
    vi.resetModules();
    setAuthEnv();
  });

  it('blocks email flow when break-glass is disabled', async () => {
    vi.doMock('../../../lib/auth/login-context', () => ({ resolveLoginContext: vi.fn(async () => ({ mode: 'sso-only', org: { slug: 'acme' } })) }));
    vi.doMock('../../../lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ auth: { signInWithOtp: vi.fn() } })) }));
    vi.doMock('../../../lib/supabase-server', () => ({ getSupabaseAdmin: vi.fn(() => ({ from: vi.fn() })) }));

    const { POST } = await import('../../../app/auth/continue/route');
    const res = await POST(buildReq() as never);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('error=sso-required');
    expect(res.headers.get('location')).toContain('org=acme');
  });
});
