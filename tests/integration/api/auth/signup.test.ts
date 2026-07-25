import { NextRequest } from 'next/server';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

function buildJsonRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

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

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Validation', () => {
    it('rejects request with missing email', async () => {
      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }) } },
        })),
      }));

      const { POST } = await import('../../../../app/api/auth/signup/route');
      const res = await POST(
        buildJsonRequest({ password: 'password123', full_name: 'John Doe', workspace_name: 'ACME' }) as never
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('email');
    });

    it('rejects request with empty email', async () => {
      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }) } },
        })),
      }));

      const { POST } = await import('../../../../app/api/auth/signup/route');
      const res = await POST(
        buildJsonRequest({ email: '  ', password: 'password123', full_name: 'John Doe', workspace_name: 'ACME' }) as never
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('email');
    });

    it('rejects password shorter than 8 characters', async () => {
      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }) } },
        })),
      }));

      const { POST } = await import('../../../../app/api/auth/signup/route');
      const res = await POST(
        buildJsonRequest({ email: 'test@example.com', password: 'short', full_name: 'John Doe', workspace_name: 'ACME' }) as never
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('password');
      expect(data.error).toContain('8');
    });

    it('rejects missing password', async () => {
      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }) } },
        })),
      }));

      const { POST } = await import('../../../../app/api/auth/signup/route');
      const res = await POST(
        buildJsonRequest({ email: 'test@example.com', full_name: 'John Doe', workspace_name: 'ACME' }) as never
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('password');
    });

    it('rejects missing full_name', async () => {
      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }) } },
        })),
      }));

      const { POST } = await import('../../../../app/api/auth/signup/route');
      const res = await POST(
        buildJsonRequest({ email: 'test@example.com', password: 'password123', workspace_name: 'ACME' }) as never
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('full_name');
    });

    it('rejects missing workspace_name', async () => {
      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }) } },
        })),
      }));

      const { POST } = await import('../../../../app/api/auth/signup/route');
      const res = await POST(
        buildJsonRequest({ email: 'test@example.com', password: 'password123', full_name: 'John Doe' }) as never
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('workspace_name');
    });
  });

  describe('Duplicate email handling', () => {
    it('rejects signup when email already exists', async () => {
      const existingUser = { email: 'test@example.com', id: 'user-123' };

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: {
            admin: {
              listUsers: vi.fn().mockResolvedValue({
                data: { users: [existingUser] },
                error: null,
              }),
            },
          },
        })),
      }));

      const { POST } = await import('../../../../app/api/auth/signup/route');
      const res = await POST(
        buildJsonRequest({
          email: 'test@example.com',
          password: 'password123',
          full_name: 'John Doe',
          workspace_name: 'ACME',
        }) as never
      );

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toBe('email-taken');
      expect(data.code).toBe('email-taken');
    });

    it('returns 409 when Supabase returns duplicate error during user creation', async () => {
      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: {
            admin: {
              listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
              createUser: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('duplicate key value violates unique constraint'),
              }),
            },
          },
        })),
      }));

      const { POST } = await import('../../../../app/api/auth/signup/route');
      const res = await POST(
        buildJsonRequest({
          email: 'test@example.com',
          password: 'password123',
          full_name: 'John Doe',
          workspace_name: 'ACME',
        }) as never
      );

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toBe('email-taken');
    });
  });

  describe('Successful signup', () => {
    it('creates account with valid credentials', async () => {
      const createUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'new-user-123' } },
        error: null,
      });

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: {
            admin: {
              listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
              createUser,
            },
          },
        })),
      }));

      vi.doMock('../../../../lib/telemetry/capture-event', () => ({
        captureEvent: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const { POST } = await import('../../../../app/api/auth/signup/route');
      const res = await POST(
        buildJsonRequest({
          email: 'newuser@example.com',
          password: 'password123',
          full_name: 'John Doe',
          workspace_name: 'ACME Corp',
        }) as never
      );

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user_id).toBe('new-user-123');
      expect(data.email).toBe('newuser@example.com');
      expect(data.message).toContain('successfully');

      // Verify createUser was called with normalized email and metadata
      expect(createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          password: 'password123',
          email_confirm: false,
          user_metadata: expect.objectContaining({
            full_name: 'John Doe',
            workspace_name: 'ACME Corp',
          }),
        })
      );
    });

    it('normalizes email to lowercase', async () => {
      const createUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'new-user-456' } },
        error: null,
      });

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: {
            admin: {
              listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
              createUser,
            },
          },
        })),
      }));

      vi.doMock('../../../../lib/telemetry/capture-event', () => ({
        captureEvent: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const { POST } = await import('../../../../app/api/auth/signup/route');
      const res = await POST(
        buildJsonRequest({
          email: 'NewUser@EXAMPLE.COM',
          password: 'password123',
          full_name: 'John Doe',
          workspace_name: 'ACME',
        }) as never
      );

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.email).toBe('newuser@example.com');

      const call = createUser.mock.calls[0]?.[0] as any;
      expect(call.email).toBe('newuser@example.com');
    });

    it('trims whitespace from fields', async () => {
      const createUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'new-user-789' } },
        error: null,
      });

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: {
            admin: {
              listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
              createUser,
            },
          },
        })),
      }));

      vi.doMock('../../../../lib/telemetry/capture-event', () => ({
        captureEvent: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const { POST } = await import('../../../../app/api/auth/signup/route');
      await POST(
        buildJsonRequest({
          email: '  test@example.com  ',
          password: 'password123',
          full_name: '  John Doe  ',
          workspace_name: '  ACME  ',
        }) as never
      );

      const call = createUser.mock.calls[0]?.[0] as any;
      expect(call.email).toBe('test@example.com');
      expect(call.user_metadata.full_name).toBe('John Doe');
      expect(call.user_metadata.workspace_name).toBe('ACME');
    });

    it('captures signup event with email domain', async () => {
      const captureEvent = vi.fn().mockResolvedValue({ ok: true });

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: {
            admin: {
              listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
              createUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'user-evt' } },
                error: null,
              }),
            },
          },
        })),
      }));

      vi.doMock('../../../../lib/telemetry/capture-event', () => ({
        captureEvent,
      }));

      const { POST } = await import('../../../../app/api/auth/signup/route');
      await POST(
        buildJsonRequest({
          email: 'user@acmecorp.com',
          password: 'password123',
          full_name: 'John Doe',
          workspace_name: 'ACME',
        }) as never
      );

      expect(captureEvent).toHaveBeenCalledWith(
        'user_signup',
        expect.objectContaining({
          userId: 'user-evt',
          organizationId: '',
        }),
        expect.objectContaining({
          signup_method: 'password',
          email_domain: 'acmecorp.com',
          full_name: 'John Doe',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('returns 500 when user creation fails (non-duplicate error)', async () => {
      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: {
            admin: {
              listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
              createUser: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Internal server error'),
              }),
            },
          },
        })),
      }));

      const { POST } = await import('../../../../app/api/auth/signup/route');
      const res = await POST(
        buildJsonRequest({
          email: 'test@example.com',
          password: 'password123',
          full_name: 'John Doe',
          workspace_name: 'ACME',
        }) as never
      );

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain('Failed to create account');
    });

    it('handles malformed JSON gracefully', async () => {
      const { POST } = await import('../../../../app/api/auth/signup/route');
      const req = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json',
      });

      const res = await POST(req as never);
      expect(res.status).toBe(500);
    });

    it('handles event capture failure gracefully', async () => {
      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: {
            admin: {
              listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
              createUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'user-123' } },
                error: null,
              }),
            },
          },
        })),
      }));

      vi.doMock('../../../../lib/telemetry/capture-event', () => ({
        captureEvent: vi.fn().mockRejectedValue(new Error('Event capture failed')),
      }));

      const { POST } = await import('../../../../app/api/auth/signup/route');
      const res = await POST(
        buildJsonRequest({
          email: 'test@example.com',
          password: 'password123',
          full_name: 'John Doe',
          workspace_name: 'ACME',
        }) as never
      );

      // Should still succeed even if event capture fails
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
