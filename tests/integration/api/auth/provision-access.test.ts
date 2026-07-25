import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

function chainMock(result: { data: unknown; error: unknown }) {
  const resolved = Promise.resolve(result);
  const chain: Record<string, unknown> = {};
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'then') return resolved.then.bind(resolved);
      if (prop === 'catch') return resolved.catch.bind(resolved);
      if (typeof prop === 'string') {
        if (!chain[prop]) chain[prop] = vi.fn(() => new Proxy({}, handler));
        return chain[prop];
      }
      return undefined;
    },
  };
  return new Proxy({}, handler);
}

describe('POST /api/auth/provision-access', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Authentication', () => {
    it('rejects unauthenticated requests', async () => {
      vi.doMock('../../../../lib/supabase/server', () => ({
        createClient: vi.fn(async () => ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: new Error('Not authenticated'),
            }),
          },
        })),
      }));

      const { POST } = await import('../../../../app/api/auth/provision-access/route');
      const req = new Request('http://localhost/api/auth/provision-access', {
        method: 'POST',
      });

      const res = await POST(req as never);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.reason).toBe('UNAUTHENTICATED');
    });

    it('rejects when user data is missing', async () => {
      vi.doMock('../../../../lib/supabase/server', () => ({
        createClient: vi.fn(async () => ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'user-123' } }, // Missing email
              error: null,
            }),
          },
        })),
      }));

      const { POST } = await import('../../../../app/api/auth/provision-access/route');
      const req = new Request('http://localhost/api/auth/provision-access', {
        method: 'POST',
      });

      const res = await POST(req as never);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.reason).toBe('UNAUTHENTICATED');
    });

    it('rejects when user email is missing', async () => {
      vi.doMock('../../../../lib/supabase/server', () => ({
        createClient: vi.fn(async () => ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'user-456' } }, // No email
              error: null,
            }),
          },
        })),
      }));

      const { POST } = await import('../../../../app/api/auth/provision-access/route');
      const req = new Request('http://localhost/api/auth/provision-access', {
        method: 'POST',
      });

      const res = await POST(req as never);

      expect(res.status).toBe(401);
    });
  });

  describe('Successful provisioning', () => {
    it('provisions user access and creates workspace', async () => {
      const rpc = vi.fn().mockResolvedValue({
        data: {
          ok: true,
          workspace_id: 'ws-123',
          organization_id: 'org-456',
          workspace_name: 'ACME Corp',
        },
        error: null,
      });

      vi.doMock('../../../../lib/supabase/server', () => ({
        createClient: vi.fn(async () => ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: {
                user: {
                  id: 'user-789',
                  email: 'user@example.com',
                },
              },
              error: null,
            }),
          },
        })),
      }));

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          rpc,
        })),
      }));

      vi.doMock('../../../../lib/telemetry/capture-event', () => ({
        captureEvent: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const { POST } = await import('../../../../app/api/auth/provision-access/route');
      const req = new Request('http://localhost/api/auth/provision-access', {
        method: 'POST',
      });

      const res = await POST(req as never);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.workspace_id).toBe('ws-123');
      expect(data.organization_id).toBe('org-456');

      // Verify RPC was called with correct params
      expect(rpc).toHaveBeenCalledWith('dsg_provision_user_access', {
        p_auth_user_id: 'user-789',
        p_email: 'user@example.com',
      });
    });

    it('captures workspace_created event on successful provisioning', async () => {
      const captureEvent = vi.fn().mockResolvedValue({ ok: true });

      vi.doMock('../../../../lib/supabase/server', () => ({
        createClient: vi.fn(async () => ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: {
                user: {
                  id: 'user-event-123',
                  email: 'user@example.com',
                },
              },
              error: null,
            }),
          },
        })),
      }));

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          rpc: vi.fn().mockResolvedValue({
            data: {
              ok: true,
              workspace_id: 'ws-evt-456',
              organization_id: 'org-evt-789',
              workspace_name: 'New Workspace',
            },
            error: null,
          }),
        })),
      }));

      vi.doMock('../../../../lib/telemetry/capture-event', () => ({
        captureEvent,
      }));

      const { POST } = await import('../../../../app/api/auth/provision-access/route');
      const req = new Request('http://localhost/api/auth/provision-access', {
        method: 'POST',
      });

      await POST(req as never);

      expect(captureEvent).toHaveBeenCalledWith(
        'workspace_created',
        {
          userId: 'user-event-123',
          organizationId: 'org-evt-789',
        },
        expect.objectContaining({
          organization_id: 'org-evt-789',
          workspace_id: 'ws-evt-456',
          workspace_name: 'New Workspace',
          created_by_user_id: 'user-event-123',
        })
      );
    });

    it('includes timestamp in workspace_created event', async () => {
      const captureEvent = vi.fn().mockResolvedValue({ ok: true });
      const beforeTime = new Date();

      vi.doMock('../../../../lib/supabase/server', () => ({
        createClient: vi.fn(async () => ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: {
                user: {
                  id: 'user-time-123',
                  email: 'user@example.com',
                },
              },
              error: null,
            }),
          },
        })),
      }));

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          rpc: vi.fn().mockResolvedValue({
            data: {
              ok: true,
              workspace_id: 'ws-time',
              organization_id: 'org-time',
              workspace_name: 'Test',
            },
            error: null,
          }),
        })),
      }));

      vi.doMock('../../../../lib/telemetry/capture-event', () => ({
        captureEvent,
      }));

      const { POST } = await import('../../../../app/api/auth/provision-access/route');
      const req = new Request('http://localhost/api/auth/provision-access', {
        method: 'POST',
      });

      await POST(req as never);

      const eventData = captureEvent.mock.calls[0]?.[2];
      expect(eventData?.created_at).toBeDefined();
      const eventTime = new Date(eventData?.created_at);
      expect(eventTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });

    it('does not capture event when provisioning returns ok:false', async () => {
      const captureEvent = vi.fn();

      vi.doMock('../../../../lib/supabase/server', () => ({
        createClient: vi.fn(async () => ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: {
                user: {
                  id: 'user-no-evt',
                  email: 'user@example.com',
                },
              },
              error: null,
            }),
          },
        })),
      }));

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          rpc: vi.fn().mockResolvedValue({
            data: {
              ok: false,
              reason: 'Already provisioned',
            },
            error: null,
          }),
        })),
      }));

      vi.doMock('../../../../lib/telemetry/capture-event', () => ({
        captureEvent,
      }));

      const { POST } = await import('../../../../app/api/auth/provision-access/route');
      const req = new Request('http://localhost/api/auth/provision-access', {
        method: 'POST',
      });

      await POST(req as never);

      expect(captureEvent).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('returns 500 when RPC call fails', async () => {
      vi.doMock('../../../../lib/supabase/server', () => ({
        createClient: vi.fn(async () => ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: {
                user: {
                  id: 'user-rpc-fail',
                  email: 'user@example.com',
                },
              },
              error: null,
            }),
          },
        })),
      }));

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          rpc: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error during provisioning'),
          }),
        })),
      }));

      vi.doMock('../../../../lib/security/api-error', () => ({
        internalErrorMessage: vi.fn(() => 'An error occurred'),
        logApiError: vi.fn(),
      }));

      const { POST } = await import('../../../../app/api/auth/provision-access/route');
      const req = new Request('http://localhost/api/auth/provision-access', {
        method: 'POST',
      });

      const res = await POST(req as never);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.reason).toBe('PROVISION_FAILED');
    });

    it('handles event capture failure gracefully', async () => {
      vi.doMock('../../../../lib/supabase/server', () => ({
        createClient: vi.fn(async () => ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: {
                user: {
                  id: 'user-evt-fail',
                  email: 'user@example.com',
                },
              },
              error: null,
            }),
          },
        })),
      }));

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          rpc: vi.fn().mockResolvedValue({
            data: {
              ok: true,
              workspace_id: 'ws-evt-fail',
              organization_id: 'org-evt-fail',
              workspace_name: 'Test',
            },
            error: null,
          }),
        })),
      }));

      vi.doMock('../../../../lib/telemetry/capture-event', () => ({
        captureEvent: vi.fn().mockRejectedValue(new Error('Event service down')),
      }));

      const { POST } = await import('../../../../app/api/auth/provision-access/route');
      const req = new Request('http://localhost/api/auth/provision-access', {
        method: 'POST',
      });

      const res = await POST(req as never);

      // Should still succeed even if event capture fails (fire and forget)
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    it('returns NO_RESULT when RPC returns null data', async () => {
      vi.doMock('../../../../lib/supabase/server', () => ({
        createClient: vi.fn(async () => ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: {
                user: {
                  id: 'user-no-result',
                  email: 'user@example.com',
                },
              },
              error: null,
            }),
          },
        })),
      }));

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          rpc: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        })),
      }));

      const { POST } = await import('../../../../app/api/auth/provision-access/route');
      const req = new Request('http://localhost/api/auth/provision-access', {
        method: 'POST',
      });

      const res = await POST(req as never);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.reason).toBe('NO_RESULT');
    });
  });

  describe('Idempotency', () => {
    it('handles already provisioned users', async () => {
      vi.doMock('../../../../lib/supabase/server', () => ({
        createClient: vi.fn(async () => ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: {
                user: {
                  id: 'user-idempotent',
                  email: 'user@example.com',
                },
              },
              error: null,
            }),
          },
        })),
      }));

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          rpc: vi.fn().mockResolvedValue({
            data: {
              ok: true,
              workspace_id: 'ws-existing',
              organization_id: 'org-existing',
              workspace_name: 'Existing Workspace',
              already_provisioned: true,
            },
            error: null,
          }),
        })),
      }));

      vi.doMock('../../../../lib/telemetry/capture-event', () => ({
        captureEvent: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const { POST } = await import('../../../../app/api/auth/provision-access/route');
      const req = new Request('http://localhost/api/auth/provision-access', {
        method: 'POST',
      });

      const res = await POST(req as never);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.workspace_id).toBe('ws-existing');
    });

    it('can be called multiple times safely', async () => {
      let callCount = 0;
      const rpc = vi.fn(async () => {
        callCount++;
        return {
          data: {
            ok: true,
            workspace_id: `ws-${callCount}`,
            organization_id: 'org-idempotent',
            workspace_name: 'Workspace',
          },
          error: null,
        };
      });

      vi.doMock('../../../../lib/supabase/server', () => ({
        createClient: vi.fn(async () => ({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: {
                user: {
                  id: 'user-multi-call',
                  email: 'user@example.com',
                },
              },
              error: null,
            }),
          },
        })),
      }));

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          rpc,
        })),
      }));

      vi.doMock('../../../../lib/telemetry/capture-event', () => ({
        captureEvent: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const { POST } = await import('../../../../app/api/auth/provision-access/route');

      // Call twice
      const req1 = new Request('http://localhost/api/auth/provision-access', {
        method: 'POST',
      });
      const res1 = await POST(req1 as never);
      expect(res1.status).toBe(200);

      const req2 = new Request('http://localhost/api/auth/provision-access', {
        method: 'POST',
      });
      const res2 = await POST(req2 as never);
      expect(res2.status).toBe(200);

      // Both should succeed
      expect(callCount).toBe(2);
    });
  });
});
