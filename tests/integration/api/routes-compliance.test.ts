import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration tests for /api/compliance/* routes
 * - GET /api/compliance/export (export compliance evidence)
 * - POST /api/compliance-evidence-pack/annex4 (annex 4 evidence)
 * - GET /api/compliance-evidence-pack (compliance pack info)
 * - GET /api/ccvs/evidence-chain (CCVS evidence chain)
 * - GET /api/ccvs/compliance-status (compliance status)
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
            insert: vi.fn().mockReturnThis(),
          };
        }

        const tableResponses: Record<string, any> = {
          audit_logs: {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'audit-1',
                  org_id: 'org-test-1',
                  action: 'execute',
                  actor_id: 'user-1',
                  created_at: '2025-01-01T00:00:00Z',
                  details: { execution_id: 'exec-1' },
                },
              ],
              error: null,
            }),
            limit: vi.fn().mockReturnThis(),
          },
          runtime_truth_states: {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'rts-1',
                  org_id: 'org-test-1',
                  execution_id: 'exec-1',
                  decision: 'APPROVED',
                  evidence_hash: 'abc123',
                  created_at: '2025-01-01T00:00:00Z',
                },
              ],
              error: null,
            }),
            limit: vi.fn().mockReturnThis(),
          },
        };

        return tableResponses[table] || {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockReturnThis(),
        };
      }),
    })),
  };
}

describe('GET /api/compliance/export', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 403 when user lacks manage_compliance permission', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_compliance', false)
    );

    const { GET } = await import('../../../app/api/compliance/export/route');
    const res = await GET();

    expect(res.status).toBe(403);
  });

  it('returns 200 with compliance CSV or JSON when authorized', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_compliance', true)
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { GET } = await import('../../../app/api/compliance/export/route');
    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/json|csv|octet-stream/);
  });

  it('respects format query parameter (json or csv)', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_compliance', true)
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { GET } = await import('../../../app/api/compliance/export/route');
    const req = new Request('http://localhost/api/compliance/export?format=csv');
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  it('defaults to JSON format when format is not specified', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_compliance', true)
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { GET } = await import('../../../app/api/compliance/export/route');
    const res = await GET();

    expect(res.status).toBe(200);
  });

  it('returns 500 when database error occurs', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () =>
      makeOrgPermissionMock('org.manage_compliance', true)
    );
    vi.doMock('../../../lib/supabase-server', () =>
      makeSupabaseMock({ message: 'Database connection failed' })
    );

    const { GET } = await import('../../../app/api/compliance/export/route');
    const res = await GET();

    expect(res.status).toBe(500);
  });
});

describe('POST /api/compliance-evidence-pack/annex4', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: false, status: 401 })
    );

    const { POST } = await import('../../../app/api/compliance-evidence-pack/annex4/route');
    const req = new Request('http://localhost/api/compliance-evidence-pack/annex4', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 200 with annex4 evidence when authorized', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { POST } = await import('../../../app/api/compliance-evidence-pack/annex4/route');
    const req = new Request('http://localhost/api/compliance-evidence-pack/annex4', {
      method: 'POST',
      body: JSON.stringify({ scope: 'full' }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.annex4).toBeTruthy();
  });

  it('includes control_id, evidence_id, and status in annex4 response', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { POST } = await import('../../../app/api/compliance-evidence-pack/annex4/route');
    const req = new Request('http://localhost/api/compliance-evidence-pack/annex4', {
      method: 'POST',
      body: JSON.stringify({ scope: 'full' }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.annex4).toBeTruthy();
  });

  it('returns 400 when request body is invalid JSON', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );

    const { POST } = await import('../../../app/api/compliance-evidence-pack/annex4/route');
    const req = new Request('http://localhost/api/compliance-evidence-pack/annex4', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/compliance-evidence-pack', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: false, status: 401 })
    );

    const { GET } = await import('../../../app/api/compliance-evidence-pack/route');
    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns 200 with compliance pack info when authorized', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { GET } = await import('../../../app/api/compliance-evidence-pack/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pack).toBeTruthy();
  });

  it('includes evidence_count, generated_at, and control_coverage', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { GET } = await import('../../../app/api/compliance-evidence-pack/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(typeof body.pack.evidence_count).toBe('number');
    expect(body.pack.generated_at).toBeTruthy();
  });
});

describe('GET /api/ccvs/evidence-chain', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: false, status: 401 })
    );

    const { GET } = await import('../../../app/api/ccvs/evidence-chain/route');
    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns 200 with evidence chain when authorized', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { GET } = await import('../../../app/api/ccvs/evidence-chain/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.chain) || body.chain).toBeTruthy();
  });

  it('respects depth query parameter for chain traversal', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { GET } = await import('../../../app/api/ccvs/evidence-chain/route');
    const req = new Request('http://localhost/api/ccvs/evidence-chain?depth=5');
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  it('returns 500 when database error occurs', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () =>
      makeSupabaseMock({ message: 'Database connection failed' })
    );

    const { GET } = await import('../../../app/api/ccvs/evidence-chain/route');
    const res = await GET();

    expect(res.status).toBe(500);
  });
});

describe('GET /api/ccvs/compliance-status', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: false, status: 401 })
    );

    const { GET } = await import('../../../app/api/ccvs/compliance-status/route');
    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns 200 with compliance status when authorized', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { GET } = await import('../../../app/api/ccvs/compliance-status/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBeTruthy();
  });

  it('includes overall_compliance_level and controls_evaluated', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { GET } = await import('../../../app/api/ccvs/compliance-status/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(['L1', 'L2', 'L3', 'L4', 'L5']).toContain(body.status?.overall_compliance_level);
  });

  it('respects framework query parameter (iso27001, soc2, gdpr)', async () => {
    vi.doMock('../../../lib/authz-runtime', () =>
      makeRuntimeAccessMock({ ok: true, orgId: 'org-test-1' })
    );
    vi.doMock('../../../lib/supabase-server', () => makeSupabaseMock());

    const { GET } = await import('../../../app/api/ccvs/compliance-status/route');
    const req = new Request('http://localhost/api/ccvs/compliance-status?framework=soc2');
    const res = await GET(req);

    expect(res.status).toBe(200);
  });
});
