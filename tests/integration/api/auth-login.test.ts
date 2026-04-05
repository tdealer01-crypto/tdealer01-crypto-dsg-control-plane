import { NextRequest } from 'next/server';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function buildFormRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return new NextRequest('http://localhost/auth/login', {
    method: 'POST',
    body: form,
  });
}

function chainMock(result: { data: unknown; error: unknown }) {
  const resolved = Promise.resolve(result);
  const chain: Record<string, unknown> = {};
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'then') return resolved.then.bind(resolved);
      if (prop === 'catch') return resolved.catch.bind(resolved);
      if (typeof prop === 'string') {
        if (!chain[prop]) chain[prop] = vi.fn(() => new Proxy({}, handler));
        return chain[prop];
      }
      return undefined;
    },
  };
  return new Proxy({}, handler);
}

function setAuthEnv({ includeAppUrl = true }: { includeAppUrl?: boolean } = {}) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

  if (includeAppUrl) {
    process.env.APP_URL = 'http://localhost';
  } else {
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
  }
}

describe('/auth/login', () => {
  beforeEach(() => {
    vi.resetModules();
    setAuthEnv();
  });

  it('returns rate-limited when the limiter blocks the request', async () => {
    vi.doMock('../../../lib/security/rate-limit', () => ({
      applyRateLimit: vi.fn(async () => ({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 })),
      getRateLimitKey: vi.fn(() => 'auth-login:test'),
    }));

    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({ auth: { signInWithOtp: vi.fn() } })),
    }));

    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({ from: vi.fn(() => chainMock({ data: null, error: null })) })),
    }));

    const { POST } = await import('../../../app/auth/login/route');
    const res = await POST(buildFormRequest({ email: 'op@co.com', next: '/dashboard' }) as never);

    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('error=rate-limited');
  });

  it('sends operator magic link when provisioned', async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });

    vi.doMock('../../../lib/security/rate-limit', () => ({
      applyRateLimit: vi.fn(async () => ({ allowed: true, remaining: 7, resetAt: Date.now() + 60000 })),
      getRateLimitKey: vi.fn(() => 'auth-login:test'),
    }));

    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({ auth: { signInWithOtp } })),
    }));

    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() =>
          chainMock({
            data: { id: 'u1', email: 'op@co.com', is_active: true, org_id: 'org1', auth_user_id: 'au1' },
            error: null,
          }),
        ),
      })),
    }));

    const { POST } = await import('../../../app/auth/login/route');
    const res = await POST(buildFormRequest({ email: 'op@co.com', next: '/dashboard' }) as never);

    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('message=check-email');
    expect(signInWithOtp).toHaveBeenCalledOnce();
  });

  it('does not block when APP_URL is missing and falls back to request origin', async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });

    setAuthEnv({ includeAppUrl: false });

    vi.doMock('../../../lib/security/rate-limit', () => ({
      applyRateLimit: vi.fn(async () => ({ allowed: true, remaining: 7, resetAt: Date.now() + 60000 })),
      getRateLimitKey: vi.fn(() => 'auth-login:test'),
    }));

    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({ auth: { signInWithOtp } })),
    }));

    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() =>
          chainMock({
            data: { id: 'u1', email: 'op@co.com', is_active: true, org_id: 'org1', auth_user_id: 'au1' },
            error: null,
          }),
        ),
      })),
    }));

    const { POST } = await import('../../../app/auth/login/route');
    const res = await POST(buildFormRequest({ email: 'op@co.com', next: '/dashboard' }) as never);

    expect(res.status).toBe(302);
    expect(signInWithOtp).toHaveBeenCalledOnce();
    const firstCall = signInWithOtp.mock.calls[0]?.[0] as { options?: { emailRedirectTo?: string } };
    expect(firstCall.options?.emailRedirectTo).toContain('http://localhost/auth/confirm');
  });
});
