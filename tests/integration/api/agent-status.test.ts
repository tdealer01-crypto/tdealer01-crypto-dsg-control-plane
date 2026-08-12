import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('GET /api/agent/status', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with ok:true when db check passes', async () => {
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [{ id: 'org-1' }], error: null }),
        })),
      })),
    }));

    const { GET } = await import('../../../app/api/agent/status/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it('has required fields: repo, version, env, ts, checks', async () => {
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    }));

    const { GET } = await import('../../../app/api/agent/status/route');
    const res = await GET();
    const body = await res.json();

    expect(body.repo).toBe('dsg-control-plane');
    expect(typeof body.version).toBe('string');
    expect(typeof body.env).toBe('string');
    expect(typeof body.ts).toBe('string');
    expect(typeof body.checks).toBe('object');
    expect(typeof body.checks.db).toBe('boolean');
  });

  it('version falls back to "local" when no host supplies a commit', async () => {
    // Every commit source must be cleared, not just the Vercel one: the route
    // resolves through lib/deployment/platform.ts, which also reads
    // RENDER_GIT_COMMIT, GIT_COMMIT_SHA and GITHUB_SHA. GITHUB_SHA in
    // particular is always set inside GitHub Actions, so leaving it in place
    // makes this assertion pass locally and fail in CI.
    const commitSources = [
      'VERCEL_GIT_COMMIT_SHA',
      'RENDER_GIT_COMMIT',
      'GIT_COMMIT_SHA',
      'GITHUB_SHA',
    ] as const;
    const saved: Record<string, string | undefined> = {};
    for (const key of commitSources) {
      saved[key] = process.env[key];
      delete process.env[key];
    }

    try {
      vi.doMock('../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      }));

      const { GET } = await import('../../../app/api/agent/status/route');
      const res = await GET();
      const body = await res.json();

      expect(body.version).toBe('local');
    } finally {
      for (const key of commitSources) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
    }
  });

  it('version reports RENDER_GIT_COMMIT when running on Render', async () => {
    const savedRender = process.env.RENDER_GIT_COMMIT;
    const savedVercel = process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    process.env.RENDER_GIT_COMMIT = 'f'.repeat(40);

    try {
      vi.doMock('../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      }));

      const { GET } = await import('../../../app/api/agent/status/route');
      const res = await GET();
      const body = await res.json();

      expect(body.version).toBe('f'.repeat(40));
      expect(body.commit).toBe('f'.repeat(40));
    } finally {
      if (savedRender === undefined) delete process.env.RENDER_GIT_COMMIT;
      else process.env.RENDER_GIT_COMMIT = savedRender;
      if (savedVercel !== undefined) process.env.VERCEL_GIT_COMMIT_SHA = savedVercel;
    }
  });

  it('env falls back to "local" when VERCEL_ENV is not set', async () => {
    delete process.env.VERCEL_ENV;

    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    }));

    const { GET } = await import('../../../app/api/agent/status/route');
    const res = await GET();
    const body = await res.json();

    expect(body.env).toBe('local');
  });

  it('returns 503 with ok:false when db check fails', async () => {
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'db connection failed' } }),
        })),
      })),
    }));

    const { GET } = await import('../../../app/api/agent/status/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.checks.db).toBe(false);
  });

  it('returns 503 with ok:false when getSupabaseAdmin throws', async () => {
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => {
        throw new Error('Missing Supabase env');
      }),
    }));

    const { GET } = await import('../../../app/api/agent/status/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.ok).toBe(false);
  });

  it('ts field is a valid ISO 8601 timestamp', async () => {
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    }));

    const { GET } = await import('../../../app/api/agent/status/route');
    const res = await GET();
    const body = await res.json();

    expect(new Date(body.ts).toISOString()).toBe(body.ts);
  });
});
