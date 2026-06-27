import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration tests for /api/agent-executions and related execution history routes
 * - GET /api/agent-executions (list executions)
 * - GET /api/executions (alternate execution history endpoint)
 */

function makeRuntimeAccessMock(result: { ok: boolean; status?: number; error?: string; orgId?: string }) {
  return {
    requireRuntimeAccess: vi.fn(async () =>
      result.ok
        ? {
            ok: true,
            orgId: result.orgId ?? 'org-test-1',
            grantedRoles: ['monitor'],
            actorType: 'user' as const,
          }
        : { ok: false, status: result.status ?? 401, error: result.error ?? 'Unauthorized' }
    ),
  };
}

function makeSupabaseMock(dbError: unknown = null) {
  return {
    getSupabaseAdmin: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (dbError) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: null, error: dbError }),
          };
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'exec-1',
                workspace_id: 'ws-1',
                org_id: 'org-test-1',
                provider: 'anthropic',
                agent_id: 'agent-1',
                status: 'completed',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:05:00Z',
              },
              {
                id: 'exec-2',
                workspace_id: 'ws-1',
                org_id: 'org-test-1',
                provider: 'openai',
                agent_id: 'agent-2',
                status: 'pending',
                created_at: '2025-01-02T00:00:00Z',
                updated_at: '2025-01-02T00:00:00Z',
              },
            ],
            error: null,
          }),
        };
      }),
    })),
  };
}

function makeApiErrorMock() {
  return {
    handleApiError: vi.fn((_label: string, error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return Response.json({ error: msg }, { status: 500 });
    }),
    logApiError: vi.fn(),
    toSafeErrorResponse: vi.fn((status = 500) => ({ error: status >= 500 ? 'Internal server error' : 'Request failed' })),
  };
}

describe('GET /api/agent-executions', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: false, status: 401, error: 'Unauthorized' })
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBeTruthy();
  });

  it('returns 403 when insufficient permissions', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: false, status: 403, error: 'Insufficient role' })
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBeTruthy();
  });

  it('returns 200 with ok:true and empty items when authorized but no executions', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    }));

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBe(0);
  });

  it('returns 200 with ok:true and executions list when authorized', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0].id).toBeTruthy();
    expect(body.items[0].status).toBeTruthy();
  });

  it('respects limit query parameter', async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      data: [
        { id: 'exec-1', workspace_id: 'ws-1', status: 'completed', created_at: '2025-01-01T00:00:00Z' },
      ],
      error: null,
    });

    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: mockLimit,
        })),
      })),
    }));

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions?limit=5');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockLimit).toHaveBeenCalledWith(5);
  });

  it('defaults to limit:20 when not specified', async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });

    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: mockLimit,
        })),
      })),
    }));

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions');
    await GET(req);

    expect(mockLimit).toHaveBeenCalledWith(20);
  });

  it('returns 500 when database error occurs', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () =>
      makeSupabaseMock({ message: 'Database connection failed' })
    );
    vi.doMock('../../../lib/security/api-error', () => makeApiErrorMock());

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBeTruthy();
  });

  it('filters executions by org_id from auth context', async () => {
    const mockEq = vi.fn().mockReturnThis();

    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: mockEq,
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    }));

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions');
    await GET(req);

    expect(mockEq).toHaveBeenCalledWith('org_id', 'org-test-1');
  });

  it('orders results by created_at descending', async () => {
    const mockOrder = vi.fn().mockReturnThis();

    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: mockOrder,
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    }));

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions');
    await GET(req);

    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});

describe('GET /api/executions (alias endpoint)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: false, status: 401 })
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { GET } = await import('../../../app/api/executions/route');
    const req = new Request('http://localhost/api/executions');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('returns 200 with execution items when authorized', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());
    // DSG_CORE_MODE may not be set in test env; mock dsg-core to avoid parseMode() throw
    vi.doMock('../../../lib/dsg-core', () => ({
      getDSGCoreLedger: vi.fn(async () => ({ ok: true, items: [] })),
      getDSGCoreMetrics: vi.fn(async () => ({ ok: true, data: null })),
    }));

    const { GET } = await import('../../../app/api/executions/route');
    const req = new Request('http://localhost/api/executions');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.items) || body.ok).toBeTruthy();
  });
});
