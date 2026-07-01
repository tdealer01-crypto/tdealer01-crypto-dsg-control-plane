import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireInternalServiceMock = vi.fn();
const requireActiveProfileMock = vi.fn();
const insertRevenueEventMock = vi.fn();
const listRevenueEventsMock = vi.fn();

vi.mock('../../../lib/auth/internal-service', () => ({
  requireInternalService: requireInternalServiceMock,
}));

vi.mock('../../../lib/auth/require-active-profile', () => ({
  requireActiveProfile: requireActiveProfileMock,
}));

vi.mock('../../../lib/revenue/events', () => ({
  insertRevenueEvent: insertRevenueEventMock,
  listRevenueEvents: listRevenueEventsMock,
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

  it('persists authenticated writes with the internal org id', async () => {
    requireInternalServiceMock.mockReturnValue({
      ok: true,
      orgId: 'org-test',
      service: 'billing-worker',
      actorType: 'internal_service',
    });
    insertRevenueEventMock.mockResolvedValue({ id: 'rev_123' });

    const { POST } = await import('../../../app/api/revenue/events/route');
    const res = await POST(
      new Request('http://localhost/api/revenue/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'delivery_proof_upgrade', source: '/delivery-proof', amount: 49 }),
      })
    );

    expect(insertRevenueEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-test',
        eventType: 'delivery_proof_upgrade',
        source: '/delivery-proof',
        amount: 49,
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      eventId: 'rev_123',
      queued: false,
      message: 'Event persisted to revenue_events',
    });
  });

  it('loads recent events for signed-in dashboard users', async () => {
    requireActiveProfileMock.mockResolvedValue({ ok: true, orgId: 'org-dashboard' });
    listRevenueEventsMock.mockResolvedValue([
      {
        id: 'rev_1',
        createdAt: '2026-07-01T00:00:00.000Z',
        orgId: 'org-dashboard',
        userId: null,
        eventType: 'stripe_checkout',
        planId: 'pro',
        amount: 99,
        currency: 'USD',
        source: 'stripe.checkout.session.completed',
        metadata: null,
      },
    ]);

    const { GET } = await import('../../../app/api/revenue/events/route');
    const res = await GET(new Request('http://localhost/api/revenue/events?limit=5'));

    expect(listRevenueEventsMock).toHaveBeenCalledWith('org-dashboard', { limit: 5 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.count).toBe(1);
    expect(body.events[0]).toEqual(
      expect.objectContaining({
        eventType: 'stripe_checkout',
        source: 'stripe.checkout.session.completed',
      })
    );
  });
});
