import { describe, it, expect, vi, beforeEach } from 'vitest';

const SAMPLE_AUDIT_ITEMS = [
  { id: 'evt-1', action: 'execute', sequence: 1, created_at: '2025-01-01T00:00:00Z' },
  { id: 'evt-2', action: 'approve', sequence: 2, created_at: '2025-01-02T00:00:00Z' },
];

function makeDsgCoreMock(ok = true) {
  return {
    getDSGCoreAuditEvents: vi.fn(async () => ({
      ok,
      items: ok ? SAMPLE_AUDIT_ITEMS : [],
      error: ok ? undefined : 'core_unreachable',
    })),
    getDSGCoreDeterminism: vi.fn(async (_seq: number) => ({
      ok: true,
      data: { sequence: _seq, hash: 'abc123', verified: true },
    })),
  };
}

function makeRuntimeAccessMock(result: { ok: boolean; status?: number; error?: string; orgId?: string }) {
  return {
    requireRuntimeAccess: vi.fn(async () =>
      result.ok
        ? { ok: true, orgId: result.orgId ?? 'org-1', grantedRoles: ['monitor'], actorType: 'user' as const }
        : { ok: false, status: result.status ?? 401, error: result.error ?? 'Unauthorized' }
    ),
  };
}

describe('GET /api/audit', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    vi.doMock('../../../lib/dsg-core', () => makeDsgCoreMock(true));
    vi.doMock('../../../lib/authz-runtime', () => makeRuntimeAccessMock({ ok: false, status: 401, error: 'Unauthorized' }));
    vi.doMock('../../../lib/security/api-error', () => ({
      internalErrorMessage: vi.fn(() => 'Internal server error'),
      logApiError: vi.fn(),
    }));

    const { GET } = await import('../../../app/api/audit/route');
    const req = new Request('http://localhost/api/audit', { method: 'GET' });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBeTruthy();
  });

  it('returns 403 when role is insufficient', async () => {
    vi.doMock('../../../lib/dsg-core', () => makeDsgCoreMock(true));
    vi.doMock('../../../lib/authz-runtime', () => makeRuntimeAccessMock({ ok: false, status: 403, error: 'Insufficient role' }));
    vi.doMock('../../../lib/security/api-error', () => ({
      internalErrorMessage: vi.fn(() => 'Internal server error'),
      logApiError: vi.fn(),
    }));

    const { GET } = await import('../../../app/api/audit/route');
    const req = new Request('http://localhost/api/audit', { method: 'GET' });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBeTruthy();
  });

  it('returns 200 with ok, items, and determinism fields when authorized', async () => {
    vi.doMock('../../../lib/dsg-core', () => makeDsgCoreMock(true));
    vi.doMock('../../../lib/authz-runtime', () => makeRuntimeAccessMock({ ok: true, orgId: 'org-1' }));
    vi.doMock('../../../lib/security/api-error', () => ({
      internalErrorMessage: vi.fn(() => 'Internal server error'),
      logApiError: vi.fn(),
    }));

    const { GET } = await import('../../../app/api/audit/route');
    const req = new Request('http://localhost/api/audit', { method: 'GET' });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(typeof body.ok).toBe('boolean');
    expect(Array.isArray(body.items)).toBe(true);
    expect(Array.isArray(body.determinism)).toBe(true);
  });

  it('items array contains audit events', async () => {
    vi.doMock('../../../lib/dsg-core', () => makeDsgCoreMock(true));
    vi.doMock('../../../lib/authz-runtime', () => makeRuntimeAccessMock({ ok: true, orgId: 'org-1' }));
    vi.doMock('../../../lib/security/api-error', () => ({
      internalErrorMessage: vi.fn(() => 'Internal server error'),
      logApiError: vi.fn(),
    }));

    const { GET } = await import('../../../app/api/audit/route');
    const req = new Request('http://localhost/api/audit', { method: 'GET' });
    const res = await GET(req);
    const body = await res.json();

    expect(body.items.length).toBe(SAMPLE_AUDIT_ITEMS.length);
    expect(body.items[0].id).toBe('evt-1');
  });

  it('limit query param caps results at 100', async () => {
    const auditMock = vi.fn(async (limit: number) => ({
      ok: true,
      items: Array.from({ length: limit }, (_, i) => ({ id: `evt-${i}`, sequence: i })),
      error: undefined,
    }));

    vi.doMock('../../../lib/dsg-core', () => ({
      getDSGCoreAuditEvents: auditMock,
      getDSGCoreDeterminism: vi.fn(async () => ({ ok: true, data: {} })),
    }));
    vi.doMock('../../../lib/authz-runtime', () => makeRuntimeAccessMock({ ok: true, orgId: 'org-1' }));
    vi.doMock('../../../lib/security/api-error', () => ({
      internalErrorMessage: vi.fn(() => 'Internal server error'),
      logApiError: vi.fn(),
    }));

    const { GET } = await import('../../../app/api/audit/route');
    // Requesting 200 but route caps at 100
    const req = new Request('http://localhost/api/audit?limit=200', { method: 'GET' });
    await GET(req);

    expect(auditMock).toHaveBeenCalledWith(100, expect.objectContaining({ orgId: 'org-1' }));
  });

  it('returns core_ok field reflecting audit events state', async () => {
    vi.doMock('../../../lib/dsg-core', () => makeDsgCoreMock(true));
    vi.doMock('../../../lib/authz-runtime', () => makeRuntimeAccessMock({ ok: true, orgId: 'org-1' }));
    vi.doMock('../../../lib/security/api-error', () => ({
      internalErrorMessage: vi.fn(() => 'Internal server error'),
      logApiError: vi.fn(),
    }));

    const { GET } = await import('../../../app/api/audit/route');
    const req = new Request('http://localhost/api/audit', { method: 'GET' });
    const res = await GET(req);
    const body = await res.json();

    expect(typeof body.core_ok).toBe('boolean');
    expect(body.core_ok).toBe(true);
  });
});
