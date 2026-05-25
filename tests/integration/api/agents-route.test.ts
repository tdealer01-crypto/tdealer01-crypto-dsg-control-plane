import { describe, it, expect, vi, beforeEach } from 'vitest';

const SAMPLE_AGENTS = [
  {
    id: 'agent-1',
    name: 'Test Agent',
    policy_id: null,
    status: 'active',
    monthly_limit: 10000,
  },
];

const SAMPLE_USAGE = [
  { agent_id: 'agent-1', executions: 42 },
];

function makeSupabaseAdminMock(agentError: unknown = null) {
  return {
    getSupabaseAdmin: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === 'agents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: agentError ? null : SAMPLE_AGENTS,
              error: agentError,
              count: agentError ? 0 : 1,
            }),
          };
        }
        if (table === 'usage_counters') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: SAMPLE_USAGE, error: null }),
          };
        }
        return {};
      }),
    })),
  };
}

function makeRateLimitMock(allowed = true) {
  return {
    applyRateLimit: vi.fn(async () => ({ allowed, remaining: allowed ? 59 : 0, resetAt: Date.now() + 60000 })),
    buildRateLimitHeaders: vi.fn(() => ({})),
    getRateLimitKey: vi.fn(() => 'test-key'),
  };
}

describe('GET /api/agents', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when no auth provided (no runtime access, no active profile)', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    }));
    vi.doMock('../../../lib/authz-runtime', () => ({
      requireRuntimeAccess: vi.fn(async () => ({ ok: false, status: 401, error: 'Unauthorized' })),
    }));
    vi.doMock('../../../lib/auth/require-active-profile', () => ({
      requireActiveProfile: vi.fn(async () => ({ ok: false, status: 401, error: 'Unauthorized' })),
    }));
    vi.doMock('../../../lib/security/rate-limit', () => makeRateLimitMock(true));
    vi.doMock('../../../lib/security/error-response', () => ({
      logServerError: vi.fn(),
      serverErrorResponse: vi.fn(() => Response.json({ error: 'Internal server error' }, { status: 500 })),
    }));
    vi.doMock('../../../lib/supabase/resolve-policy', () => ({
      resolvePolicyId: vi.fn(async () => null),
    }));

    const { GET } = await import('../../../app/api/agents/route');
    const req = new Request('http://localhost/api/agents', { method: 'GET' });
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('returns 403 when authenticated but forbidden', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
        },
        from: vi.fn(() => ({})),
      })),
    }));
    vi.doMock('../../../lib/authz-runtime', () => ({
      requireRuntimeAccess: vi.fn(async () => ({ ok: false, status: 403, error: 'Forbidden' })),
    }));
    vi.doMock('../../../lib/auth/require-active-profile', () => ({
      requireActiveProfile: vi.fn(async () => ({ ok: false, status: 403, error: 'Forbidden' })),
    }));
    vi.doMock('../../../lib/security/rate-limit', () => makeRateLimitMock(true));
    vi.doMock('../../../lib/security/error-response', () => ({
      logServerError: vi.fn(),
      serverErrorResponse: vi.fn(() => Response.json({ error: 'Internal server error' }, { status: 500 })),
    }));
    vi.doMock('../../../lib/supabase/resolve-policy', () => ({
      resolvePolicyId: vi.fn(async () => null),
    }));

    const { GET } = await import('../../../app/api/agents/route');
    const req = new Request('http://localhost/api/agents', { method: 'GET' });
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it('returns 429 when rate limited', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({})),
    }));
    vi.doMock('../../../lib/authz-runtime', () => ({
      requireRuntimeAccess: vi.fn(async () => ({ ok: true, orgId: 'org-1', grantedRoles: [], actorType: 'user' })),
    }));
    vi.doMock('../../../lib/auth/require-active-profile', () => ({
      requireActiveProfile: vi.fn(async () => ({ ok: true, orgId: 'org-1' })),
    }));
    vi.doMock('../../../lib/security/rate-limit', () => makeRateLimitMock(false));
    vi.doMock('../../../lib/security/error-response', () => ({
      logServerError: vi.fn(),
      serverErrorResponse: vi.fn(() => Response.json({ error: 'Internal server error' }, { status: 500 })),
    }));
    vi.doMock('../../../lib/supabase/resolve-policy', () => ({
      resolvePolicyId: vi.fn(async () => null),
    }));

    const { GET } = await import('../../../app/api/agents/route');
    const req = new Request('http://localhost/api/agents', { method: 'GET' });
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it('returns 200 with items and pagination shape when authenticated via runtime access', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({})),
    }));
    vi.doMock('../../../lib/authz-runtime', () => ({
      requireRuntimeAccess: vi.fn(async () => ({
        ok: true,
        orgId: 'org-1',
        grantedRoles: ['mcp_call'],
        actorType: 'user' as const,
      })),
    }));
    vi.doMock('../../../lib/auth/require-active-profile', () => ({
      requireActiveProfile: vi.fn(async () => ({ ok: true, orgId: 'org-1' })),
    }));
    vi.doMock('../../../lib/security/rate-limit', () => makeRateLimitMock(true));
    vi.doMock('../../../lib/security/error-response', () => ({
      logServerError: vi.fn(),
      serverErrorResponse: vi.fn(() => Response.json({ error: 'Internal server error' }, { status: 500 })),
    }));
    vi.doMock('../../../lib/supabase/resolve-policy', () => ({
      resolvePolicyId: vi.fn(async () => null),
    }));

    const { GET } = await import('../../../app/api/agents/route');
    const req = new Request('http://localhost/api/agents', { method: 'GET' });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.pagination).toBe('object');
    expect(typeof body.pagination.page).toBe('number');
    expect(typeof body.pagination.per_page).toBe('number');
    expect(typeof body.pagination.total).toBe('number');
    expect(typeof body.pagination.total_pages).toBe('number');
  });

  it('agent items have expected shape fields', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({})),
    }));
    vi.doMock('../../../lib/authz-runtime', () => ({
      requireRuntimeAccess: vi.fn(async () => ({
        ok: true,
        orgId: 'org-1',
        grantedRoles: ['mcp_call'],
        actorType: 'user' as const,
      })),
    }));
    vi.doMock('../../../lib/auth/require-active-profile', () => ({
      requireActiveProfile: vi.fn(async () => ({ ok: true, orgId: 'org-1' })),
    }));
    vi.doMock('../../../lib/security/rate-limit', () => makeRateLimitMock(true));
    vi.doMock('../../../lib/security/error-response', () => ({
      logServerError: vi.fn(),
      serverErrorResponse: vi.fn(() => Response.json({ error: 'Internal server error' }, { status: 500 })),
    }));
    vi.doMock('../../../lib/supabase/resolve-policy', () => ({
      resolvePolicyId: vi.fn(async () => null),
    }));

    const { GET } = await import('../../../app/api/agents/route');
    const req = new Request('http://localhost/api/agents', { method: 'GET' });
    const res = await GET(req);
    const body = await res.json();

    expect(body.items.length).toBeGreaterThan(0);
    const item = body.items[0];
    expect(item.agent_id).toBeDefined();
    expect(item.name).toBeDefined();
    expect(item.status).toBeDefined();
    expect(item.monthly_limit).toBeDefined();
    expect(typeof item.usage_this_month).toBe('number');
    // api_key should never be exposed in list — only preview
    expect(item.api_key).toBeUndefined();
    expect(item.api_key_preview).toBe('hidden');
  });

  it('reports usage_this_month from usage_counters join', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: vi.fn(async () => ({})),
    }));
    vi.doMock('../../../lib/authz-runtime', () => ({
      requireRuntimeAccess: vi.fn(async () => ({
        ok: true,
        orgId: 'org-1',
        grantedRoles: ['mcp_call'],
        actorType: 'user' as const,
      })),
    }));
    vi.doMock('../../../lib/auth/require-active-profile', () => ({
      requireActiveProfile: vi.fn(async () => ({ ok: true, orgId: 'org-1' })),
    }));
    vi.doMock('../../../lib/security/rate-limit', () => makeRateLimitMock(true));
    vi.doMock('../../../lib/security/error-response', () => ({
      logServerError: vi.fn(),
      serverErrorResponse: vi.fn(() => Response.json({ error: 'Internal server error' }, { status: 500 })),
    }));
    vi.doMock('../../../lib/supabase/resolve-policy', () => ({
      resolvePolicyId: vi.fn(async () => null),
    }));

    const { GET } = await import('../../../app/api/agents/route');
    const req = new Request('http://localhost/api/agents', { method: 'GET' });
    const res = await GET(req);
    const body = await res.json();

    const agent = body.items.find((a: { agent_id: string }) => a.agent_id === 'agent-1');
    expect(agent).toBeDefined();
    // Usage from SAMPLE_USAGE: agent-1 has 42 executions
    expect(agent.usage_this_month).toBe(42);
  });
});
