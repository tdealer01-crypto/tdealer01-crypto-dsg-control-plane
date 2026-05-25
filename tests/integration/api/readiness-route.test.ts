import { describe, it, expect, vi, beforeEach } from 'vitest';

const PASSING_READINESS = {
  ok: true,
  checks: {
    env: { ok: true },
    nextAuthSecret: { ok: true },
    supabaseServiceRole: { ok: true },
    dsgCoreConfig: { ok: true },
    dsgCoreHealth: { ok: true },
    financeGovernanceSurface: { ok: true },
    financeGovernanceBackend: { ok: true },
  },
  timestamp: new Date().toISOString(),
};

const FAILING_READINESS = {
  ok: false,
  checks: {
    env: { ok: false, detail: 'NEXT_PUBLIC_SUPABASE_URL not set' },
    nextAuthSecret: { ok: false, detail: 'missing' },
    supabaseServiceRole: { ok: false, detail: 'missing' },
    dsgCoreConfig: { ok: false, detail: 'missing' },
    dsgCoreHealth: { ok: false, detail: 'unreachable' },
    financeGovernanceSurface: { ok: false, detail: 'missing' },
    financeGovernanceBackend: { ok: false, detail: 'missing' },
  },
  timestamp: new Date().toISOString(),
};

describe('GET /api/readiness', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with ok:true when all checks pass', async () => {
    vi.doMock('../../../lib/deployment/readiness', () => ({
      getDeploymentReadiness: vi.fn(async () => PASSING_READINESS),
    }));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((_label: string, error: unknown) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        return Response.json({ error: msg }, { status: 500 });
      }),
    }));

    const { GET } = await import('../../../app/api/readiness/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it('returns 503 with ok:false when any check fails', async () => {
    vi.doMock('../../../lib/deployment/readiness', () => ({
      getDeploymentReadiness: vi.fn(async () => FAILING_READINESS),
    }));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((_label: string, error: unknown) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        return Response.json({ error: msg }, { status: 500 });
      }),
    }));

    const { GET } = await import('../../../app/api/readiness/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.ok).toBe(false);
  });

  it('response body matches ReadinessReport shape with checks and timestamp', async () => {
    vi.doMock('../../../lib/deployment/readiness', () => ({
      getDeploymentReadiness: vi.fn(async () => PASSING_READINESS),
    }));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((_label: string, error: unknown) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        return Response.json({ error: msg }, { status: 500 });
      }),
    }));

    const { GET } = await import('../../../app/api/readiness/route');
    const res = await GET();
    const body = await res.json();

    expect(typeof body.checks).toBe('object');
    expect(typeof body.timestamp).toBe('string');
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it('checks object contains expected keys', async () => {
    vi.doMock('../../../lib/deployment/readiness', () => ({
      getDeploymentReadiness: vi.fn(async () => PASSING_READINESS),
    }));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((_label: string, error: unknown) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        return Response.json({ error: msg }, { status: 500 });
      }),
    }));

    const { GET } = await import('../../../app/api/readiness/route');
    const res = await GET();
    const body = await res.json();

    expect(body.checks).toHaveProperty('env');
    expect(body.checks).toHaveProperty('nextAuthSecret');
    expect(body.checks).toHaveProperty('supabaseServiceRole');
    expect(body.checks).toHaveProperty('dsgCoreConfig');
    expect(body.checks).toHaveProperty('dsgCoreHealth');
  });

  it('returns 500 when getDeploymentReadiness throws', async () => {
    vi.doMock('../../../lib/deployment/readiness', () => ({
      getDeploymentReadiness: vi.fn(async () => {
        throw new Error('readiness_probe_failed');
      }),
    }));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((_label: string, _error: unknown) => {
        return Response.json({ error: 'Internal server error' }, { status: 500 });
      }),
    }));

    const { GET } = await import('../../../app/api/readiness/route');
    const res = await GET();

    expect(res.status).toBe(500);
  });
});
