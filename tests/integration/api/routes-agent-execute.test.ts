import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock factories
function makeOrgPermissionMock(allowed = true) {
  return {
    requireOrgPermission: vi.fn(async () => {
      if (allowed) {
        return { ok: true, orgId: 'org-1', userId: 'user-1' };
      }
      return { ok: false, status: 401, error: 'Unauthorized' };
    }),
  };
}

function makeExecutionServiceMock(error: unknown = null) {
  return {
    createExecutionRequest: vi.fn(async (body: any) => {
      if (error) throw error;
      return {
        id: 'exec-1',
        org_id: body.org_id,
        agent_id: body.agent_id,
        workspace_id: body.workspace_id,
        steps: body.plan || [],
      };
    }),
    planExecution: vi.fn(async (message: string) => {
      if (error) throw error;
      return [{ action: 'analyze', params: { query: message } }];
    }),
  };
}

function makeReadJsonBodyMock(success = true, value: any = {}) {
  return {
    readJsonBody: vi.fn(async (req: Request, opts: any) => {
      if (!success) {
        return { ok: false, status: 400, error: 'Invalid JSON' };
      }
      return { ok: true, value };
    }),
  };
}

describe('POST /api/agent-execute', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () => ({
      requireOrgPermission: vi.fn(async () => ({
        ok: false,
        status: 401,
        error: 'Unauthorized'
      })),
    }));
    vi.doMock('../../../lib/security/request-json', () => ({
      readJsonBody: vi.fn(async () => ({ ok: true, value: {} })),
    }));

    const { POST } = await import('../../../app/api/agent-execute/route');
    const req = new Request('http://localhost/api/agent-execute', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields missing', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () => makeOrgPermissionMock(true));
    vi.doMock('../../../lib/security/request-json', () =>
      makeReadJsonBodyMock(true, { agent_id: 'a1' }) // missing workspace_id and provider
    );
    vi.doMock('../../../lib/agent-governance/service', () => ({
      createExecutionRequest: vi.fn(),
      planExecution: vi.fn(),
    }));
    vi.doMock('../../../lib/webhooks/deliver', () => ({
      fireWebhook: vi.fn(),
    }));

    const { POST } = await import('../../../app/api/agent-execute/route');
    const req = new Request('http://localhost/api/agent-execute', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_payload');
  });

  it('returns 403 when org_id mismatch', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () => ({
      requireOrgPermission: vi.fn(async () => ({
        ok: true,
        orgId: 'org-1',
        userId: 'user-1',
      })),
    }));
    vi.doMock('../../../lib/security/request-json', () =>
      makeReadJsonBodyMock(true, {
        workspace_id: 'ws-1',
        provider: 'anthropic',
        agent_id: 'a1',
        org_id: 'org-2', // mismatch
      })
    );
    vi.doMock('../../../lib/agent-governance/service', () => ({
      createExecutionRequest: vi.fn(),
      planExecution: vi.fn(),
    }));
    vi.doMock('../../../lib/webhooks/deliver', () => ({
      fireWebhook: vi.fn(),
    }));

    const { POST } = await import('../../../app/api/agent-execute/route');
    const req = new Request('http://localhost/api/agent-execute', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('org_mismatch');
  });

  it('returns 201 with execution_id on success', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () => makeOrgPermissionMock(true));
    vi.doMock('../../../lib/security/request-json', () =>
      makeReadJsonBodyMock(true, {
        workspace_id: 'ws-1',
        provider: 'anthropic',
        agent_id: 'a1',
        message: 'test execution',
        plan: [{ action: 'analyze' }],
      })
    );
    vi.doMock('../../../lib/agent-governance/service', () => makeExecutionServiceMock());
    vi.doMock('../../../lib/webhooks/deliver', () => ({
      fireWebhook: vi.fn(async () => {}),
    }));

    const { POST } = await import('../../../app/api/agent-execute/route');
    const req = new Request('http://localhost/api/agent-execute', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.execution_id).toBe('exec-1');
    expect(Array.isArray(body.steps)).toBe(true);
  });

  it('plans execution when plan not provided', async () => {
    const planExecMock = vi.fn(async () => [{ action: 'auto-planned' }]);

    vi.doMock('../../../lib/auth/require-org-permission', () => makeOrgPermissionMock(true));
    vi.doMock('../../../lib/security/request-json', () =>
      makeReadJsonBodyMock(true, {
        workspace_id: 'ws-1',
        provider: 'anthropic',
        agent_id: 'a1',
        message: 'analyze this',
      })
    );
    vi.doMock('../../../lib/agent-governance/service', () => ({
      createExecutionRequest: vi.fn(async (body: any) => ({
        id: 'exec-1',
        org_id: body.org_id,
        agent_id: body.agent_id,
        steps: body.plan,
      })),
      planExecution: planExecMock,
    }));
    vi.doMock('../../../lib/webhooks/deliver', () => ({
      fireWebhook: vi.fn(async () => {}),
    }));

    const { POST } = await import('../../../app/api/agent-execute/route');
    const req = new Request('http://localhost/api/agent-execute', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(planExecMock).toHaveBeenCalled();
  });

  it('fires webhook on successful execution creation', async () => {
    const fireWebhookMock = vi.fn(async () => {});

    vi.doMock('../../../lib/auth/require-org-permission', () => makeOrgPermissionMock(true));
    vi.doMock('../../../lib/security/request-json', () =>
      makeReadJsonBodyMock(true, {
        workspace_id: 'ws-1',
        provider: 'anthropic',
        agent_id: 'a1',
        message: 'test',
        plan: [],
      })
    );
    vi.doMock('../../../lib/agent-governance/service', () => makeExecutionServiceMock());
    vi.doMock('../../../lib/webhooks/deliver', () => ({
      fireWebhook: fireWebhookMock,
    }));

    const { POST } = await import('../../../app/api/agent-execute/route');
    const req = new Request('http://localhost/api/agent-execute', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(fireWebhookMock).toHaveBeenCalledWith('org-1', 'execution.initiated', expect.objectContaining({
      execution_id: 'exec-1',
      agent_id: 'a1',
      workspace_id: 'ws-1',
    }));
  });

  it('returns 400 when request body is malformed JSON', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () => makeOrgPermissionMock(true));
    vi.doMock('../../../lib/security/request-json', () =>
      makeReadJsonBodyMock(false)
    );
    vi.doMock('../../../lib/agent-governance/service', () => ({
      createExecutionRequest: vi.fn(),
      planExecution: vi.fn(),
    }));
    vi.doMock('../../../lib/webhooks/deliver', () => ({
      fireWebhook: vi.fn(),
    }));

    const { POST } = await import('../../../app/api/agent-execute/route');
    const req = new Request('http://localhost/api/agent-execute', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/agent-executions', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when no auth provided', async () => {
    vi.doMock('../../../lib/authz-runtime', () => ({
      requireRuntimeAccess: vi.fn(async () => ({
        ok: false,
        status: 401,
        error: 'Missing Bearer token'
      })),
    }));
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({})),
    }));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((label, error) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        return Response.json({ error: msg }, { status: 500 });
      }),
    }));

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('returns 403 when user not authorized', async () => {
    vi.doMock('../../../lib/authz-runtime', () => ({
      requireRuntimeAccess: vi.fn(async () => ({
        ok: false,
        status: 403,
        error: 'Forbidden'
      })),
    }));
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({})),
    }));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((label, error) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        return Response.json({ error: msg }, { status: 500 });
      }),
    }));

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions');
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it('returns 200 with execution list when authorized', async () => {
    vi.doMock('../../../lib/authz-runtime', () => ({
      requireRuntimeAccess: vi.fn(async () => ({
        ok: true,
        orgId: 'org-1',
      })),
    }));
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'exec-1',
                workspace_id: 'ws-1',
                org_id: 'org-1',
                provider: 'anthropic',
                agent_id: 'a1',
                status: 'completed',
                created_at: '2024-01-01',
                updated_at: '2024-01-01',
              },
            ],
            error: null,
          }),
        })),
      })),
    }));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((label, error) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        return Response.json({ error: msg }, { status: 500 });
      }),
    }));

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items[0]?.id).toBe('exec-1');
  });

  it('returns empty list when no executions found', async () => {
    vi.doMock('../../../lib/authz-runtime', () => ({
      requireRuntimeAccess: vi.fn(async () => ({
        ok: true,
        orgId: 'org-1',
      })),
    }));
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })),
      })),
    }));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((label, error) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        return Response.json({ error: msg }, { status: 500 });
      }),
    }));

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
  });

  it('respects limit query parameter', async () => {
    const selectMock = vi.fn().mockReturnThis();
    const limitMock = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    vi.doMock('../../../lib/authz-runtime', () => ({
      requireRuntimeAccess: vi.fn(async () => ({
        ok: true,
        orgId: 'org-1',
      })),
    }));
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: selectMock,
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: limitMock,
        })),
      })),
    }));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((label, error) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        return Response.json({ error: msg }, { status: 500 });
      }),
    }));

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions?limit=50');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(limitMock).toHaveBeenCalledWith(50);
  });

  it('returns 500 when database query fails', async () => {
    vi.doMock('../../../lib/authz-runtime', () => ({
      requireRuntimeAccess: vi.fn(async () => ({
        ok: true,
        orgId: 'org-1',
      })),
    }));
    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        })),
      })),
    }));
    vi.doMock('../../../lib/security/api-error', () => ({
      handleApiError: vi.fn((label, error) => {
        return Response.json({ error: 'Database query failed' }, { status: 500 });
      }),
    }));

    const { GET } = await import('../../../app/api/agent-executions/route');
    const req = new Request('http://localhost/api/agent-executions');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
