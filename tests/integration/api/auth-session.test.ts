import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/auth/session', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns authenticated=false when no user session exists', async () => {
    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: vi.fn(async () => ({ data: { user: null } })),
        },
      })),
    }));

    const { GET } = await import('../../../app/api/auth/session/route');
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ authenticated: false, email: null });
  });

  it('returns 200 with authenticated=false when createClient throws', async () => {
    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => {
        throw new Error('Missing env');
      }),
    }));

    const { GET } = await import('../../../app/api/auth/session/route');
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ authenticated: false, email: null });
  });
});
