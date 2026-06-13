import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration tests for /api/webhooks-config/* and /api/webhooks/* routes
 * - GET /api/webhooks-config (list webhooks)
 * - POST /api/webhooks-config (create webhook)
 * - DELETE /api/webhooks-config/[id] (delete webhook)
 * - POST /api/webhooks/dsg (DSG webhook endpoint)
 * - POST /api/webhooks/stripe (Stripe webhook endpoint)
 */

function makeOrgPermissionMock(permission: string, allowed = true) {
  return {
    requireOrgPermission: vi.fn(async () => {
      if (allowed) {
        return { ok: true, orgId: 'org-test-1', userId: 'user-test-1' };
      }
      return { ok: false, status: 403, error: `Missing permission: ${permission}` };
    }),
  };
}

function makeSupabaseClientMock(dbError: unknown = null) {
  return {
    createClient: vi.fn(async () => ({
      from: vi.fn((table: string) => {
        if (dbError) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
            mockResolvedValue: vi.fn().mockResolvedValue({ data: null, error: dbError }),
          };
        }

        const tableResponses: Record<string, any> = {
          webhook_configs: {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'webhook-1',
                  org_id: 'org-test-1',
                  url: 'https://example.com/webhooks',
                  events: ['execution.completed'],
                  active: true,
                  created_at: '2025-01-01T00:00:00Z',
                },
              ],
              error: null,
            }),
            insert: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'webhook-1',
                org_id: 'org-test-1',
                url: 'https://example.com/webhooks',
                secret_hash: 'abc123hash',
                events: ['execution.completed'],
                active: true,
                created_at: '2025-01-01T00:00:00Z',
              },
              error: null,
            }),
            limit: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
          },
          webhook_deliveries: {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                { webhook_id: 'webhook-1', status: 'success', created_at: '2025-01-01T00:05:00Z' },
              ],
              error: null,
            }),
          },
          users: {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { org_id: 'org-test-1' },
              error: null,
            }),
          },
        };

        return tableResponses[table] || {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        };
      }),
    })),
  };
}

describe('GET /api/webhooks-config', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 403 when user lacks manage_webhooks permission', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_webhooks', false)
    );

    const { GET } = await import('../../../app/api/webhooks-config/route');
    const req = new Request('http://localhost/api/webhooks-config');
    const res = await GET();

    expect(res.status).toBe(403);
  });

  it('returns 200 with webhooks array when authorized', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_webhooks', true)
    );
    vi.doMock('../../../lib/supabase/server', () => makeSupabaseClientMock());

    const { GET } = await import('../../../app/api/webhooks-config/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.webhooks).toBeTruthy();
    expect(Array.isArray(body.webhooks)).toBe(true);
  });

  it('includes webhook status field (ACTIVE, FAILING, DISABLED)', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_webhooks', true)
    );
    vi.doMock('../../../lib/supabase/server', () => makeSupabaseClientMock());

    const { GET } = await import('../../../app/api/webhooks-config/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    if (body.webhooks.length > 0) {
      expect(['ACTIVE', 'FAILING', 'DISABLED']).toContain(body.webhooks[0].status);
    }
  });

  it('returns 500 when database error occurs', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_webhooks', true)
    );
    vi.doMock('../../../lib/supabase/server', () =>
      makeSupabaseClientMock({ message: 'Database connection failed' })
    );

    const { GET } = await import('../../../app/api/webhooks-config/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBeTruthy();
  });
});

describe('POST /api/webhooks-config', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 403 when user lacks manage_webhooks permission', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_webhooks', false)
    );

    const { POST } = await import('../../../app/api/webhooks-config/route');
    const req = new Request('http://localhost/api/webhooks-config', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/hook', events: ['execution.completed'] }),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('returns 400 when URL is missing', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_webhooks', true)
    );
    vi.doMock('../../../lib/supabase/server', () => makeSupabaseClientMock());

    const { POST } = await import('../../../app/api/webhooks-config/route');
    const req = new Request('http://localhost/api/webhooks-config', {
      method: 'POST',
      body: JSON.stringify({ events: ['execution.completed'] }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('url');
  });

  it('returns 400 when URL is not https', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_webhooks', true)
    );
    vi.doMock('../../../lib/supabase/server', () => makeSupabaseClientMock());

    const { POST } = await import('../../../app/api/webhooks-config/route');
    const req = new Request('http://localhost/api/webhooks-config', {
      method: 'POST',
      body: JSON.stringify({ url: 'http://example.com/hook', events: ['execution.completed'] }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('https');
  });

  it('returns 400 when events array is empty', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_webhooks', true)
    );
    vi.doMock('../../../lib/supabase/server', () => makeSupabaseClientMock());

    const { POST } = await import('../../../app/api/webhooks-config/route');
    const req = new Request('http://localhost/api/webhooks-config', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/hook', events: [] }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('events');
  });

  it('returns 201 with webhook and secret when created successfully', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_webhooks', true)
    );
    vi.doMock('../../../lib/supabase/server', () => makeSupabaseClientMock());

    const { POST } = await import('../../../app/api/webhooks-config/route');
    const req = new Request('http://localhost/api/webhooks-config', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/hook',
        events: ['execution.completed'],
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.webhook).toBeTruthy();
    expect(body.secret).toBeTruthy();
    expect(body.webhook.url).toBe('https://example.com/hook');
  });

  it('returns 400 for invalid JSON body', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_webhooks', true)
    );
    vi.doMock('../../../lib/supabase/server', () => makeSupabaseClientMock());

    const { POST } = await import('../../../app/api/webhooks-config/route');
    const req = new Request('http://localhost/api/webhooks-config', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeTruthy();
  });
});

describe('DELETE /api/webhooks-config/[id]', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 403 when user lacks manage_webhooks permission', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_webhooks', false)
    );

    const { DELETE } = await import('../../../app/api/webhooks-config/[id]/route');
    const params = { id: 'webhook-1' };
    const res = await DELETE(new Request('http://localhost/api/webhooks-config/webhook-1'), { params: Promise.resolve(params) } as any);

    expect(res.status).toBe(403);
  });

  it('returns 404 when webhook does not exist', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_webhooks', true)
    );
    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          delete: vi.fn().mockReturnThis(),
        })),
      })),
    }));

    const { DELETE } = await import('../../../app/api/webhooks-config/[id]/route');
    const params = { id: 'webhook-missing' };
    const res = await DELETE(new Request('http://localhost/api/webhooks-config/webhook-missing'), { params: Promise.resolve(params) } as any);

    expect(res.status).toBe(404);
  });

  it('returns 204 when webhook is deleted successfully', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_webhooks', true)
    );
    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'webhook-1', org_id: 'org-test-1' }],
            error: null,
          }),
          delete: vi.fn().mockResolvedValue({ data: {}, error: null }),
        })),
      })),
    }));

    const { DELETE } = await import('../../../app/api/webhooks-config/[id]/route');
    const params = { id: 'webhook-1' };
    const res = await DELETE(new Request('http://localhost/api/webhooks-config/webhook-1'), { params: Promise.resolve(params) } as any);

    expect(res.status).toBe(204);
  });
});

describe('POST /api/webhooks/dsg (DSG webhook handler)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 400 when signature is missing', async () => {
    vi.doMock('../../../lib/webhooks/verify', () => ({
      verifyWebhookSignature: vi.fn(() => false),
    }));

    const { POST } = await import('../../../app/api/webhooks/dsg/route');
    const req = new Request('http://localhost/api/webhooks/dsg', {
      method: 'POST',
      body: JSON.stringify({ event: 'execution.completed' }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('signature');
  });

  it('returns 200 when webhook is processed successfully', async () => {
    vi.doMock('../../../lib/webhooks/verify', () => ({
      verifyWebhookSignature: vi.fn(() => true),
    }));
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'log-1' }, error: null }),
        })),
      })),
    }));

    const { POST } = await import('../../../app/api/webhooks/dsg/route');
    const req = new Request('http://localhost/api/webhooks/dsg', {
      method: 'POST',
      headers: { 'x-webhook-signature': 'sig_abc123' },
      body: JSON.stringify({ event: 'execution.completed', id: 'exec-1' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});

describe('POST /api/webhooks/stripe (Stripe webhook handler)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 400 when stripe signature is invalid', async () => {
    vi.doMock('../../../lib/billing/stripe-webhook', () => ({
      verifyStripeSignature: vi.fn(() => null),
    }));

    const { POST } = await import('../../../app/api/webhooks/stripe/route');
    const req = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'invalid' },
      body: JSON.stringify({ type: 'payment_intent.succeeded' }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('signature');
  });

  it('returns 200 when Stripe event is processed', async () => {
    const mockEvent = { id: 'evt_123', type: 'payment_intent.succeeded' };

    vi.doMock('../../../lib/billing/stripe-webhook', () => ({
      verifyStripeSignature: vi.fn(() => mockEvent),
      handleStripeEvent: vi.fn(async () => ({ ok: true })),
    }));

    const { POST } = await import('../../../app/api/webhooks/stripe/route');
    const req = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid_sig' },
      body: JSON.stringify({ type: 'payment_intent.succeeded', id: 'evt_123' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});
