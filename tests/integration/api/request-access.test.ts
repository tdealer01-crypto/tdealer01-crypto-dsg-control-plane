import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/access/request', () => {
  beforeEach(() => vi.resetModules());

  it('creates pending access request row', async () => {
    const insert = vi.fn(async () => ({ data: null, error: null }));
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));

    const selectChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle,
              })),
            })),
          })),
        })),
      })),
      insert,
    };

    const from = vi.fn((table: string) => {
      if (table === 'access_requests') return selectChain;
      if (table === 'sign_in_events') return { insert: vi.fn(async () => ({ data: null, error: null })) };
      return { insert: vi.fn(async () => ({ data: null, error: null })) };
    });

    vi.doMock('../../../lib/supabase-server', () => ({ getSupabaseAdmin: vi.fn(() => ({ from })) }));
    vi.doMock('../../../lib/auth/sign-in-events', () => ({ logSignInEvent: vi.fn(async () => {}) }));

    const { POST } = await import('../../../app/api/access/request/route');
    const req = new Request('http://localhost/api/access/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email: 'Test@Acme.com', workspace_name: 'Acme' }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledOnce();
    expect((insert.mock.calls as any)[0][0]).toMatchObject({ email: 'test@acme.com', email_domain: 'acme.com', status: 'pending' });
  });
});
