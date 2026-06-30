import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireInternalServiceMock = vi.fn();

vi.mock('../../../lib/auth/internal-service', () => ({
  requireInternalService: requireInternalServiceMock,
}));

describe('/api/revenue/events route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('rejects anonymous event writes', async () => {
    requireInternalServiceMock.mockReturnValue({
      ok: false,
      status: 401,
      error: 'unauthorized_internal_service',
    });

    const { POST } = await import('../../../app/api/revenue/events/route');
    const res = await POST(
      new Request('http://localhost/api/revenue/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'delivery_proof_upgrade' }),
      })
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: 'unauthorized_internal_service',
    });
  });

  it('rejects anonymous event reads', async () => {
    requireInternalServiceMock.mockReturnValue({
      ok: false,
      status: 401,
      error: 'unauthorized_internal_service',
    });

    const { GET } = await import('../../../app/api/revenue/events/route');
    const res = await GET(new Request('http://localhost/api/revenue/events'));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: 'unauthorized_internal_service',
    });
  });

  it('fills orgId from authenticated internal caller', async () => {
    requireInternalServiceMock.mockReturnValue({
      ok: true,
      orgId: 'org-test',
      service: 'billing-worker',
      actorType: 'internal_service',
    });

    const { POST, GET } = await import('../../../app/api/revenue/events/route');

    const postRes = await POST(
      new Request('http://localhost/api/revenue/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'delivery_proof_upgrade', source: '/delivery-proof' }),
      })
    );

    expect(postRes.status).toBe(200);

    const getRes = await GET(new Request('http://localhost/api/revenue/events'));
    expect(getRes.status).toBe(200);

    const body = await getRes.json();
    expect(body.ok).toBe(true);
    expect(body.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'delivery_proof_upgrade',
          orgId: 'org-test',
          source: '/delivery-proof',
        }),
      ])
    );
  });
});
