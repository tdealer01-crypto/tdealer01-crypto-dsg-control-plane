import { beforeEach, describe, expect, it, vi } from 'vitest';

const allowedAccess = {
  ok: true as const,
  orgId: 'org-test',
  userId: 'user-test',
  authUserId: 'auth-test',
  grantedRoles: ['operator'] as const,
};

function makeAuthzMock(result: object) {
  return { requireOrgRole: vi.fn(async () => result) };
}

function makeReconcileMock(result: object) {
  return { reconcileEffectCallback: vi.fn(async () => result) };
}

function makeErrorMocks() {
  return {
    logServerError: vi.fn(),
    serverErrorResponse: vi.fn(() => Response.json({ error: 'Internal Server Error' }, { status: 500 })),
  };
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/effect-callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/effect-callback', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    vi.doMock('../../../lib/authz', () =>
      makeAuthzMock({ ok: false, status: 401, error: 'Unauthorized' })
    );
    vi.doMock('../../../lib/runtime/reconcile', () =>
      makeReconcileMock({ found: true, alreadyFinal: false })
    );
    vi.doMock('../../../lib/security/error-response', () => makeErrorMocks());

    const { POST } = await import('../../../app/api/effect-callback/route');
    const res = await POST(postRequest({ effect_id: 'eff-1' }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when role is insufficient', async () => {
    vi.doMock('../../../lib/authz', () =>
      makeAuthzMock({ ok: false, status: 403, error: 'Insufficient role' })
    );
    vi.doMock('../../../lib/runtime/reconcile', () =>
      makeReconcileMock({ found: true, alreadyFinal: false })
    );
    vi.doMock('../../../lib/security/error-response', () => makeErrorMocks());

    const { POST } = await import('../../../app/api/effect-callback/route');
    const res = await POST(postRequest({ effect_id: 'eff-1' }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Insufficient role');
  });

  it('returns 400 when effect_id is missing', async () => {
    vi.doMock('../../../lib/authz', () => makeAuthzMock(allowedAccess));
    vi.doMock('../../../lib/runtime/reconcile', () =>
      makeReconcileMock({ found: true, alreadyFinal: false })
    );
    vi.doMock('../../../lib/security/error-response', () => makeErrorMocks());

    const { POST } = await import('../../../app/api/effect-callback/route');
    const res = await POST(postRequest({}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/effect_id/);
  });

  it('returns 400 when body is not valid JSON', async () => {
    vi.doMock('../../../lib/authz', () => makeAuthzMock(allowedAccess));
    vi.doMock('../../../lib/runtime/reconcile', () =>
      makeReconcileMock({ found: true, alreadyFinal: false })
    );
    vi.doMock('../../../lib/security/error-response', () => makeErrorMocks());

    const { POST } = await import('../../../app/api/effect-callback/route');
    const badReq = new Request('http://localhost/api/effect-callback', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await POST(badReq);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/effect_id/);
  });

  it('returns 404 when effect_id does not exist', async () => {
    vi.doMock('../../../lib/authz', () => makeAuthzMock(allowedAccess));
    vi.doMock('../../../lib/runtime/reconcile', () =>
      makeReconcileMock({ found: false, alreadyFinal: false })
    );
    vi.doMock('../../../lib/security/error-response', () => makeErrorMocks());

    const { POST } = await import('../../../app/api/effect-callback/route');
    const res = await POST(postRequest({ effect_id: 'unknown-eff' }));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });

  it('returns 200 with idempotent:false for a fresh pending effect', async () => {
    const reconcile = makeReconcileMock({ found: true, alreadyFinal: false });
    vi.doMock('../../../lib/authz', () => makeAuthzMock(allowedAccess));
    vi.doMock('../../../lib/runtime/reconcile', () => reconcile);
    vi.doMock('../../../lib/security/error-response', () => makeErrorMocks());

    const { POST } = await import('../../../app/api/effect-callback/route');
    const res = await POST(postRequest({ effect_id: 'eff-pending', status: 'succeeded' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, idempotent: false });
  });

  it('returns 200 with idempotent:true when already in final state', async () => {
    vi.doMock('../../../lib/authz', () => makeAuthzMock(allowedAccess));
    vi.doMock('../../../lib/runtime/reconcile', () =>
      makeReconcileMock({ found: true, alreadyFinal: true })
    );
    vi.doMock('../../../lib/security/error-response', () => makeErrorMocks());

    const { POST } = await import('../../../app/api/effect-callback/route');
    const res = await POST(postRequest({ effect_id: 'eff-done', status: 'succeeded' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, idempotent: true });
  });

  it('accepts status:failed and passes it to reconcile', async () => {
    const reconcile = makeReconcileMock({ found: true, alreadyFinal: false });
    vi.doMock('../../../lib/authz', () => makeAuthzMock(allowedAccess));
    vi.doMock('../../../lib/runtime/reconcile', () => reconcile);
    vi.doMock('../../../lib/security/error-response', () => makeErrorMocks());

    const { POST } = await import('../../../app/api/effect-callback/route');
    await POST(postRequest({ effect_id: 'eff-1', status: 'failed' }));

    expect(reconcile.reconcileEffectCallback).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    );
  });

  it('defaults to status:succeeded when status is omitted', async () => {
    const reconcile = makeReconcileMock({ found: true, alreadyFinal: false });
    vi.doMock('../../../lib/authz', () => makeAuthzMock(allowedAccess));
    vi.doMock('../../../lib/runtime/reconcile', () => reconcile);
    vi.doMock('../../../lib/security/error-response', () => makeErrorMocks());

    const { POST } = await import('../../../app/api/effect-callback/route');
    await POST(postRequest({ effect_id: 'eff-1' }));

    expect(reconcile.reconcileEffectCallback).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'succeeded' })
    );
  });

  it('passes orgId from auth context to reconcile (cross-org isolation)', async () => {
    const access = { ...allowedAccess, orgId: 'org-specific' };
    const reconcile = makeReconcileMock({ found: true, alreadyFinal: false });
    vi.doMock('../../../lib/authz', () => makeAuthzMock(access));
    vi.doMock('../../../lib/runtime/reconcile', () => reconcile);
    vi.doMock('../../../lib/security/error-response', () => makeErrorMocks());

    const { POST } = await import('../../../app/api/effect-callback/route');
    await POST(postRequest({ effect_id: 'eff-1' }));

    expect(reconcile.reconcileEffectCallback).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-specific' })
    );
  });

  it('returns 500 when reconcile throws unexpectedly', async () => {
    const errorMocks = makeErrorMocks();
    vi.doMock('../../../lib/authz', () => makeAuthzMock(allowedAccess));
    vi.doMock('../../../lib/runtime/reconcile', () => ({
      reconcileEffectCallback: vi.fn(async () => { throw new Error('DB exploded'); }),
    }));
    vi.doMock('../../../lib/security/error-response', () => errorMocks);

    const { POST } = await import('../../../app/api/effect-callback/route');
    const res = await POST(postRequest({ effect_id: 'eff-1' }));

    expect(res.status).toBe(500);
    expect(errorMocks.logServerError).toHaveBeenCalledWith(
      expect.any(Error),
      'effect-callback-post'
    );
  });
});
