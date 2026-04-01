import { vi, describe, it, expect, beforeEach } from 'vitest';

function buildFormRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return new Request('http://localhost/auth/continue', {
    method: 'POST',
    body: form,
  });
}

/** Build a chainable Supabase query builder mock where every method returns `this` and the terminal resolves to `result`. */
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

describe('/auth/continue', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.APP_URL = 'http://localhost';
  });

  it('provisioned operator email → operator magic-link path', async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });

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

    const { POST } = await import('../../../app/auth/continue/route');
    const req = buildFormRequest({ email: 'op@co.com', next: '/dashboard' });
    const res = await POST(req as never);

    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('message=check-email');
    expect(signInWithOtp).toHaveBeenCalledOnce();
  });

  it('non-provisioned email + workspace_name → trial path', async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });

    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({ auth: { signInWithOtp } })),
    }));

    let fromCallCount = 0;

    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => {
          fromCallCount++;
          if (fromCallCount === 1) {
            // users table → no operator found
            return chainMock({ data: null, error: null });
          }
          if (fromCallCount === 2) {
            // trial_signups select → no existing pending
            return chainMock({ data: null, error: null });
          }
          // trial_signups insert
          return chainMock({ data: null, error: null });
        }),
      })),
    }));

    const { POST } = await import('../../../app/auth/continue/route');
    const req = buildFormRequest({ email: 'new@co.com', workspace_name: 'Acme Ops', next: '/dashboard' });
    const res = await POST(req as never);

    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('message=check-email');
    expect(signInWithOtp).toHaveBeenCalledOnce();
  });

  it('non-provisioned email without workspace_name → missing-workspace', async () => {
    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({ auth: { signInWithOtp: vi.fn() } })),
    }));

    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => chainMock({ data: null, error: null })),
      })),
    }));

    const { POST } = await import('../../../app/auth/continue/route');
    const req = buildFormRequest({ email: 'new@co.com', next: '/dashboard' });
    const res = await POST(req as never);

    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('error=missing-workspace');
  });

  it('missing email → missing-email', async () => {
    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({ auth: { signInWithOtp: vi.fn() } })),
    }));

    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => chainMock({ data: null, error: null })),
      })),
    }));

    const { POST } = await import('../../../app/auth/continue/route');
    const req = buildFormRequest({ email: '', next: '/dashboard' });
    const res = await POST(req as never);

    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('error=missing-email');
  });

  it('OTP send failure for operator → send-failed', async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: { message: 'rate limited' } });

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

    const { POST } = await import('../../../app/auth/continue/route');
    const req = buildFormRequest({ email: 'op@co.com', next: '/dashboard' });
    const res = await POST(req as never);

    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('error=send-failed');
    expect(signInWithOtp).toHaveBeenCalledOnce();
  });


  it('blocks excessive attempts by email', async () => {
    vi.doMock('../../../lib/security/rate-limit', () => ({
      consumeRateLimit: vi.fn(async () => ({ allowed: false, retryAfterSeconds: 120 })),
    }));

    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({ auth: { signInWithOtp: vi.fn() } })),
    }));

    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({ from: vi.fn(() => chainMock({ data: null, error: null })) })),
    }));

    const { POST } = await import('../../../app/auth/continue/route');
    const req = buildFormRequest({ email: 'op@co.com', next: '/dashboard' });
    const res = await POST(req as never);

    expect(res.status).toBe(302);
    expect(res.headers.get('location') || '').toContain('error=rate-limited');
  });
});
