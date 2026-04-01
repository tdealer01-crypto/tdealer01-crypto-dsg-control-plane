import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('sign in event instrumentation', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.APP_URL = 'http://localhost';
  });

  it('logs event for successful magic link request', async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const logSignInEvent = vi.fn(async () => {});

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

    vi.doMock('../../../lib/auth/sign-in-events', () => ({ logSignInEvent }));

    const { POST } = await import('../../../app/auth/continue/route');
    const req = buildFormRequest({ email: 'op@co.com', next: '/dashboard' });
    await POST(req as never);

    expect(logSignInEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'magic_link_requested', success: true }));
  });
});
