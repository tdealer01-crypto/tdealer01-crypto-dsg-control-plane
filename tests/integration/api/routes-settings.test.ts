import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock factories
function makeSupabaseAdminMock(dbError: unknown = null) {
  return {
    getSupabaseAdmin: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === 'org_domains') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: dbError ? null : [
                { id: 'domain-1', org_id: 'org-1', domain: 'example.com', status: 'approved', created_at: '2024-01-01' }
              ],
              error: dbError,
            }),
            insert: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: dbError ? null : { id: 'domain-1', org_id: 'org-1', domain: 'example.com', status: 'approved', verification_token: 'dsg-verify-xxx' },
              error: dbError,
            }),
          };
        }
        if (table === 'org_security_settings') {
          return {
            select: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: dbError ? null : { org_id: 'org-1', sso_enabled: true, sso_enforced: false, break_glass_email_enabled: true },
              error: dbError,
            }),
          };
        }
        // Generic fallback: supports select().eq() chain returning empty array
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: dbError ? null : [], error: dbError }),
          order: vi.fn().mockResolvedValue({ data: dbError ? null : [], error: dbError }),
          upsert: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
        };
      }),
    })),
  };
}

function makeAuthzMock(allowAdmin = true) {
  return {
    requireOrgRole: vi.fn(async () => {
      if (allowAdmin) {
        return { ok: true, orgId: 'org-1', grantedRoles: ['org_admin'] };
      }
      return { ok: false, status: 401, error: 'Unauthorized' };
    }),
  };
}

describe('GET /api/settings/domains', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/authz', () => ({
      requireOrgRole: vi.fn(async () => ({
        ok: false,
        status: 401,
        error: 'Unauthorized'
      })),
    }));

    const { GET } = await import('../../../app/api/settings/domains/route');
    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks org_admin role', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/authz', () => ({
      requireOrgRole: vi.fn(async () => ({
        ok: false,
        status: 403,
        error: 'Forbidden'
      })),
    }));

    const { GET } = await import('../../../app/api/settings/domains/route');
    const res = await GET();

    expect(res.status).toBe(403);
  });

  it('returns 200 with domain list when authorized', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/authz', () => makeAuthzMock(true));

    const { GET } = await import('../../../app/api/settings/domains/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items[0]?.domain).toBe('example.com');
  });

  it('returns 500 when database query fails', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock({ message: 'db_error' }));
    vi.doMock('../../../lib/authz', () => makeAuthzMock(true));

    const { GET } = await import('../../../app/api/settings/domains/route');
    const res = await GET();

    expect(res.status).toBe(500);
  });
});

describe('POST /api/settings/domains', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/authz', () => ({
      requireOrgRole: vi.fn(async () => ({
        ok: false,
        status: 401,
        error: 'Unauthorized'
      })),
    }));

    const { POST } = await import('../../../app/api/settings/domains/route');
    const req = new Request('http://localhost/api/settings/domains', {
      method: 'POST',
      body: JSON.stringify({ domain: 'test.com' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 when domain is missing', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/authz', () => makeAuthzMock(true));
    vi.doMock('../../../lib/auth/domain-governance', () => ({
      normalizeDomain: vi.fn(() => null),
    }));

    const { POST } = await import('../../../app/api/settings/domains/route');
    const req = new Request('http://localhost/api/settings/domains', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Domain is required');
  });

  it('returns 201 with created domain on success', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/authz', () => makeAuthzMock(true));
    vi.doMock('../../../lib/auth/domain-governance', () => ({
      normalizeDomain: vi.fn((d) => d || null),
    }));

    const { POST } = await import('../../../app/api/settings/domains/route');
    const req = new Request('http://localhost/api/settings/domains', {
      method: 'POST',
      body: JSON.stringify({ domain: 'example.com' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.item).toBeDefined();
    expect(body.item.domain).toBe('example.com');
    expect(body.verification_step).toBeDefined();
  });

  it('returns 500 when database insert fails', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock({ message: 'db_error' }));
    vi.doMock('../../../lib/authz', () => makeAuthzMock(true));
    vi.doMock('../../../lib/auth/domain-governance', () => ({
      normalizeDomain: vi.fn((d) => d || null),
    }));

    const { POST } = await import('../../../app/api/settings/domains/route');
    const req = new Request('http://localhost/api/settings/domains', {
      method: 'POST',
      body: JSON.stringify({ domain: 'example.com' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/settings/security', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/authz', () => ({
      requireOrgRole: vi.fn(async () => ({
        ok: false,
        status: 401,
        error: 'Unauthorized'
      })),
    }));

    const { PATCH } = await import('../../../app/api/settings/security/route');
    const req = new Request('http://localhost/api/settings/security', {
      method: 'PATCH',
      body: JSON.stringify({ sso_enabled: true }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks org_admin role', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/authz', () => ({
      requireOrgRole: vi.fn(async () => ({
        ok: false,
        status: 403,
        error: 'Forbidden'
      })),
    }));

    const { PATCH } = await import('../../../app/api/settings/security/route');
    const req = new Request('http://localhost/api/settings/security', {
      method: 'PATCH',
      body: JSON.stringify({ sso_enabled: true }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(403);
  });

  it('returns 200 with updated security settings', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/authz', () => makeAuthzMock(true));
    vi.doMock('../../../lib/auth/admin-safety', () => ({
      preventDisablingAllRecoveryPaths: vi.fn(async () => {}),
    }));

    const { PATCH } = await import('../../../app/api/settings/security/route');
    const req = new Request('http://localhost/api/settings/security', {
      method: 'PATCH',
      body: JSON.stringify({ sso_enabled: true, break_glass_email_enabled: true }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item).toBeDefined();
  });

  it('returns 409 when SSO enforcement fails recovery path check', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/authz', () => makeAuthzMock(true));
    vi.doMock('../../../lib/auth/admin-safety', () => ({
      preventDisablingAllRecoveryPaths: vi.fn(async () => {
        throw new Error('Cannot disable all recovery paths');
      }),
    }));

    const { PATCH } = await import('../../../app/api/settings/security/route');
    const req = new Request('http://localhost/api/settings/security', {
      method: 'PATCH',
      body: JSON.stringify({ sso_enforced: true }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(409);
  });

  it('returns 500 when database update fails', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock({ message: 'db_error' }));
    vi.doMock('../../../lib/authz', () => makeAuthzMock(true));
    vi.doMock('../../../lib/auth/admin-safety', () => ({
      preventDisablingAllRecoveryPaths: vi.fn(async () => {}),
    }));

    const { PATCH } = await import('../../../app/api/settings/security/route');
    const req = new Request('http://localhost/api/settings/security', {
      method: 'PATCH',
      body: JSON.stringify({ sso_enabled: true }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(500);
  });
});

describe('GET /api/settings/quota', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/authz', () => ({
      requireOrgRole: vi.fn(async () => ({
        ok: false,
        status: 401,
        error: 'Unauthorized'
      })),
    }));

    const { GET } = await import('../../../app/api/settings/quota/route');
    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks required role', async () => {
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseAdminMock());
    vi.doMock('../../../lib/authz', () => ({
      requireOrgRole: vi.fn(async () => ({
        ok: false,
        status: 403,
        error: 'Forbidden'
      })),
    }));

    const { GET } = await import('../../../app/api/settings/quota/route');
    const res = await GET();

    expect(res.status).toBe(403);
  });

  it('returns 200 with quota summary when authorized', async () => {
    const supabaseMock = makeSupabaseAdminMock();
    // Override for usage_counters table
    const originalFrom = supabaseMock.getSupabaseAdmin().from;
    supabaseMock.getSupabaseAdmin().from = vi.fn((table: string) => {
      if (table === 'usage_counters') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ executions: 42 }],
            error: null,
          }),
        };
      }
      return originalFrom.call({}, table);
    });

    vi.doMock('../../../lib/supabase-server', () => supabaseMock);
    vi.doMock('../../../lib/authz', () => ({
      requireOrgRole: vi.fn(async () => ({
        ok: true,
        orgId: 'org-1',
        grantedRoles: ['org_admin']
      })),
    }));
    vi.doMock('../../../lib/billing/quota-policy', () => ({
      getEffectiveExecutionQuotaForOrg: vi.fn(async () => ({
        planKey: 'pro',
        windowDays: 30,
      })),
      buildQuotaSummary: vi.fn((plan, executions) => ({
        limit: 1000,
        current: executions,
        remaining: 1000 - executions,
        planKey: plan,
      })),
    }));

    const { GET } = await import('../../../app/api/settings/quota/route');
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quota).toBeDefined();
    expect(body.quota.windowDays).toBe(30);
  });
});
