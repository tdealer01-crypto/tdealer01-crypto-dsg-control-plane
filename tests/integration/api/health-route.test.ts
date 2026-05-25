import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock factories
function makeSupabaseMock(dbError: unknown = null) {
  return {
    getSupabaseAdmin: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: dbError ? null : [{ id: 'org-1' }], error: dbError }),
      })),
    })),
  };
}

function makeReadinessMock(ok: boolean) {
  return {
    getDeploymentReadiness: vi.fn(async () => ({
      ok,
      checks: {
        env: { ok },
        nextAuthSecret: { ok },
        supabaseServiceRole: { ok },
        dsgCoreConfig: { ok },
        dsgCoreHealth: { ok },
        financeGovernanceSurface: { ok },
        financeGovernanceBackend: { ok },
      },
      timestamp: new Date().toISOString(),
    })),
  };
}

function makeDsgCoreMock(ok: boolean) {
  return {
    getDSGCoreHealth: vi.fn(async () => ({
      ok,
      status: ok ? 'healthy' : 'degraded',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      ...(ok ? {} : { error: 'core_unreachable' }),
    })),
  };
}

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns a response with ok field', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());
    vi.doMock('../../../lib/deployment/readiness', () => makeReadinessMock(true));
    vi.doMock('../../../lib/dsg-core', () => makeDsgCoreMock(true));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((_label: string, error: unknown) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        return Response.json({ error: msg }, { status: 500 });
      }),
    }));
    vi.doMock('../../../lib/security/rate-limit', () => ({
      isRateLimiterConfigured: vi.fn(() => true),
    }));

    const { GET } = await import('../../../app/api/health/route');
    const res = await GET();
    const body = await res.json();

    expect(typeof body.ok).toBe('boolean');
  });

  it('response shape includes service, timestamp, db_ok, core_ok, rateLimiter, core, readiness', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());
    vi.doMock('../../../lib/deployment/readiness', () => makeReadinessMock(true));
    vi.doMock('../../../lib/dsg-core', () => makeDsgCoreMock(true));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((_label: string, error: unknown) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        return Response.json({ error: msg }, { status: 500 });
      }),
    }));
    vi.doMock('../../../lib/security/rate-limit', () => ({
      isRateLimiterConfigured: vi.fn(() => true),
    }));

    const { GET } = await import('../../../app/api/health/route');
    const res = await GET();
    const body = await res.json();

    expect(body.service).toBe('dsg-control-plane');
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.db_ok).toBe('boolean');
    expect(typeof body.core_ok).toBe('boolean');
    expect(typeof body.rateLimiter).toBe('object');
    expect(typeof body.core).toBe('object');
    expect(typeof body.readiness).toBe('object');
  });

  it('returns 200 when all checks pass', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());
    vi.doMock('../../../lib/deployment/readiness', () => makeReadinessMock(true));
    vi.doMock('../../../lib/dsg-core', () => makeDsgCoreMock(true));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((_label: string, error: unknown) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        return Response.json({ error: msg }, { status: 500 });
      }),
    }));
    vi.doMock('../../../lib/security/rate-limit', () => ({
      isRateLimiterConfigured: vi.fn(() => true),
    }));

    const { GET } = await import('../../../app/api/health/route');
    const res = await GET();

    expect(res.status).toBe(200);
  });

  it('returns 503 when db is unreachable', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock({ message: 'connection refused' }));
    vi.doMock('../../../lib/deployment/readiness', () => makeReadinessMock(true));
    vi.doMock('../../../lib/dsg-core', () => makeDsgCoreMock(true));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((_label: string, error: unknown) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        return Response.json({ error: msg }, { status: 500 });
      }),
    }));
    vi.doMock('../../../lib/security/rate-limit', () => ({
      isRateLimiterConfigured: vi.fn(() => true),
    }));

    const { GET } = await import('../../../app/api/health/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.db_ok).toBe(false);
  });

  it('returns 503 when rate limiter is not configured', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());
    vi.doMock('../../../lib/deployment/readiness', () => makeReadinessMock(true));
    vi.doMock('../../../lib/dsg-core', () => makeDsgCoreMock(true));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((_label: string, error: unknown) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        return Response.json({ error: msg }, { status: 500 });
      }),
    }));
    vi.doMock('../../../lib/security/rate-limit', () => ({
      isRateLimiterConfigured: vi.fn(() => false),
    }));

    const { GET } = await import('../../../app/api/health/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.rateLimiter.ok).toBe(false);
  });
});
