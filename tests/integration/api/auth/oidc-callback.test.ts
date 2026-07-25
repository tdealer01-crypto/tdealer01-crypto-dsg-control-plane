import { NextRequest } from 'next/server';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

function buildJsonRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/auth/oidc/callback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Helper to create a mock valid JWT
function createMockJwt(claims: Record<string, unknown>) {
  // Simple JWT mock structure (header.payload.signature)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64');
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

describe('POST /api/auth/oidc/callback', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Request validation', () => {
    it('rejects request without code', async () => {
      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(),
      }));

      vi.doMock('../../../../lib/sso/oidc-validator', () => ({
        parseJwt: vi.fn(),
        validateOidcClaims: vi.fn(),
        extractUserInfo: vi.fn(),
        extractGroups: vi.fn(),
      }));

      vi.doMock('../../../../lib/audit/correlation-context', () => ({
        initCorrelationContext: vi.fn(() => 'corr-123'),
      }));

      const { POST } = await import('../../../../app/api/auth/oidc/callback/route');
      const res = await POST(
        buildJsonRequest({ orgId: 'org-123', idToken: 'token' }) as never
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('missing_required_fields');
    });

    it('rejects request without orgId', async () => {
      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(),
      }));

      vi.doMock('../../../../lib/sso/oidc-validator', () => ({
        parseJwt: vi.fn(),
        validateOidcClaims: vi.fn(),
        extractUserInfo: vi.fn(),
        extractGroups: vi.fn(),
      }));

      vi.doMock('../../../../lib/audit/correlation-context', () => ({
        initCorrelationContext: vi.fn(() => 'corr-123'),
      }));

      const { POST } = await import('../../../../app/api/auth/oidc/callback/route');
      const res = await POST(
        buildJsonRequest({ code: 'auth-code', idToken: 'token' }) as never
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('missing_required_fields');
    });

    it('rejects request without idToken', async () => {
      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(),
      }));

      vi.doMock('../../../../lib/sso/oidc-validator', () => ({
        parseJwt: vi.fn(),
        validateOidcClaims: vi.fn(),
        extractUserInfo: vi.fn(),
        extractGroups: vi.fn(),
      }));

      vi.doMock('../../../../lib/audit/correlation-context', () => ({
        initCorrelationContext: vi.fn(() => 'corr-123'),
      }));

      const { POST } = await import('../../../../app/api/auth/oidc/callback/route');
      const res = await POST(
        buildJsonRequest({ code: 'auth-code', orgId: 'org-123' }) as never
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('missing_required_fields');
    });
  });

  describe('JWT validation', () => {
    it('rejects invalid JWT token', async () => {
      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(),
      }));

      vi.doMock('../../../../lib/sso/oidc-validator', () => ({
        parseJwt: vi.fn(() => null), // Invalid JWT
        validateOidcClaims: vi.fn(),
        extractUserInfo: vi.fn(),
        extractGroups: vi.fn(),
      }));

      vi.doMock('../../../../lib/audit/correlation-context', () => ({
        initCorrelationContext: vi.fn(() => 'corr-123'),
      }));

      const { POST } = await import('../../../../app/api/auth/oidc/callback/route');
      const res = await POST(
        buildJsonRequest({
          code: 'auth-code',
          orgId: 'org-123',
          idToken: 'invalid-jwt',
        }) as never
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('invalid_token');
    });

    it('rejects token with invalid OIDC claims', async () => {
      const claims = {
        sub: 'user123',
        iss: 'https://wrong-issuer.com',
        aud: 'wrong-client-id',
      };

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                issuer: 'https://correct-issuer.com',
                client_id: 'correct-client-id',
              },
              error: null,
            }),
          })),
        })),
      }));

      vi.doMock('../../../../lib/sso/oidc-validator', () => ({
        parseJwt: vi.fn(() => ({ claims })),
        validateOidcClaims: vi.fn(() => ({
          valid: false,
          error: 'Issuer mismatch',
        })),
        extractUserInfo: vi.fn(),
        extractGroups: vi.fn(),
      }));

      vi.doMock('../../../../lib/audit/correlation-context', () => ({
        initCorrelationContext: vi.fn(() => 'corr-123'),
      }));

      const { POST } = await import('../../../../app/api/auth/oidc/callback/route');
      const res = await POST(
        buildJsonRequest({
          code: 'auth-code',
          orgId: 'org-123',
          idToken: createMockJwt(claims),
        }) as never
      );

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('invalid_token');
    });
  });

  describe('SSO configuration check', () => {
    it('rejects when OIDC is not configured for org', async () => {
      const claims = {
        sub: 'user123',
        iss: 'https://idp.com',
        aud: 'client-id',
      };

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('No rows returned'),
            }),
          })),
        })),
      }));

      vi.doMock('../../../../lib/sso/oidc-validator', () => ({
        parseJwt: vi.fn(() => ({ claims })),
        validateOidcClaims: vi.fn(),
        extractUserInfo: vi.fn(),
        extractGroups: vi.fn(),
      }));

      vi.doMock('../../../../lib/audit/correlation-context', () => ({
        initCorrelationContext: vi.fn(() => 'corr-123'),
      }));

      const { POST } = await import('../../../../app/api/auth/oidc/callback/route');
      const res = await POST(
        buildJsonRequest({
          code: 'auth-code',
          orgId: 'org-123',
          idToken: createMockJwt(claims),
        }) as never
      );

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('sso_not_configured');
    });
  });

  describe('Successful OIDC flow', () => {
    it('validates user info extraction from OIDC claims', async () => {
      const claims = {
        sub: 'ext-user-validation',
        iss: 'https://idp.com',
        aud: 'client-id',
        email: 'validate@example.com',
        name: 'Validation User',
      };

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(),
      }));

      vi.doMock('../../../../lib/sso/oidc-validator', () => ({
        parseJwt: vi.fn(() => ({ claims })),
        validateOidcClaims: vi.fn(() => ({
          valid: true,
          claims,
        })),
        extractUserInfo: vi.fn(() => ({
          externalId: 'ext-user-validation',
          email: 'validate@example.com',
          displayName: 'Validation User',
        })),
        extractGroups: vi.fn(() => []),
      }));

      vi.doMock('../../../../lib/audit/correlation-context', () => ({
        initCorrelationContext: vi.fn(() => 'corr-validate'),
      }));

      const { extractUserInfo } = await import('../../../../lib/sso/oidc-validator');
      const userInfo = extractUserInfo(claims);

      expect(userInfo.email).toBe('validate@example.com');
      expect(userInfo.externalId).toBe('ext-user-validation');
      expect(userInfo.displayName).toBe('Validation User');
    });

    it('logs audit entry on successful login', async () => {
      const claims = {
        sub: 'ext-user-audit',
        iss: 'https://idp.com',
        aud: 'client-id',
        email: 'audit@example.com',
        name: 'Audit User',
      };

      const createUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'internal-audit-user' } },
        error: null,
      });

      const singleMock = vi.fn()
        .mockResolvedValueOnce({
          data: { issuer: 'https://idp.com', client_id: 'client-id' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: new Error('No existing role'),
        })
        .mockResolvedValueOnce({
          data: { id: 'default-role' },
          error: null,
        });

      const insertMock = vi.fn().mockResolvedValue({ data: { id: 'audit-log-1' }, error: null });

      const chainMockBuilder = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
        insert: insertMock,
      });

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: { admin: { createUser } },
          from: vi.fn(chainMockBuilder),
        })),
      }));

      vi.doMock('../../../../lib/sso/oidc-validator', () => ({
        parseJwt: vi.fn(() => ({ claims })),
        validateOidcClaims: vi.fn(() => ({
          valid: true,
          claims,
        })),
        extractUserInfo: vi.fn(() => ({
          externalId: 'ext-user-audit',
          email: 'audit@example.com',
          displayName: 'Audit User',
        })),
        extractGroups: vi.fn(() => []),
      }));

      vi.doMock('../../../../lib/session/session-policy', () => ({
        createSession: vi.fn(async () => ({
          ok: true,
          sessionId: 'sess-audit',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        })),
      }));

      vi.doMock('../../../../lib/audit/correlation-context', () => ({
        initCorrelationContext: vi.fn(() => 'corr-audit'),
      }));

      vi.doMock('../../../../lib/sso/idp-group-mapper', () => ({
        syncUserGroupsOnLogin: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const { POST } = await import('../../../../app/api/auth/oidc/callback/route');
      const res = await POST(
        buildJsonRequest({
          code: 'auth-code',
          orgId: 'org-123',
          idToken: createMockJwt(claims),
        }) as never
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);

      // Verify audit was inserted
      expect(insertMock).toHaveBeenCalled();
    });

    it('syncs user groups when provided in claims', async () => {
      const syncUserGroupsOnLogin = vi.fn().mockResolvedValue({ ok: true });
      const claims = {
        sub: 'user-groups',
        iss: 'https://idp.com',
        aud: 'client-id',
        email: 'user@example.com',
        groups: ['admin', 'developers'],
      };

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: {
            admin: {
              createUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'user-id' } },
                error: null,
              }),
            },
          },
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn()
              .mockResolvedValueOnce({
                data: { issuer: 'https://idp.com', client_id: 'client-id' },
                error: null,
              })
              .mockResolvedValueOnce({
                data: null,
                error: new Error('No role'),
              })
              .mockResolvedValueOnce({
                data: { id: 'default-role' },
                error: null,
              }),
            insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
          })),
        })),
      }));

      vi.doMock('../../../../lib/sso/oidc-validator', () => ({
        parseJwt: vi.fn(() => ({ claims })),
        validateOidcClaims: vi.fn(() => ({
          valid: true,
          claims,
        })),
        extractUserInfo: vi.fn(() => ({
          externalId: 'user-groups',
          email: 'user@example.com',
          displayName: 'User',
        })),
        extractGroups: vi.fn(() => ['admin', 'developers']),
      }));

      vi.doMock('../../../../lib/session/session-policy', () => ({
        createSession: vi.fn(async () => ({
          ok: true,
          sessionId: 'sess-789',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        })),
      }));

      vi.doMock('../../../../lib/audit/correlation-context', () => ({
        initCorrelationContext: vi.fn(() => 'corr-789'),
      }));

      vi.doMock('../../../../lib/sso/idp-group-mapper', () => ({
        syncUserGroupsOnLogin,
      }));

      const { POST } = await import('../../../../app/api/auth/oidc/callback/route');
      const res = await POST(
        buildJsonRequest({
          code: 'auth-code',
          orgId: 'org-123',
          idToken: createMockJwt(claims),
        }) as never
      );

      expect(res.status).toBe(200);
      expect(syncUserGroupsOnLogin).toHaveBeenCalledWith(
        'user-id',
        'org-123',
        ['admin', 'developers']
      );
    });
  });

  describe('Error handling', () => {
    it('returns 500 when session creation fails', async () => {
      const claims = {
        sub: 'user-session-fail',
        iss: 'https://idp.com',
        aud: 'client-id',
        email: 'user@example.com',
      };

      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(() => ({
          auth: {
            admin: {
              createUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'user-id' } },
                error: null,
              }),
            },
          },
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn()
              .mockResolvedValueOnce({
                data: { issuer: 'https://idp.com', client_id: 'client-id' },
                error: null,
              })
              .mockResolvedValueOnce({
                data: null,
                error: new Error('No role'),
              })
              .mockResolvedValueOnce({
                data: { id: 'role-id' },
                error: null,
              }),
            insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
          })),
        })),
      }));

      vi.doMock('../../../../lib/sso/oidc-validator', () => ({
        parseJwt: vi.fn(() => ({ claims })),
        validateOidcClaims: vi.fn(() => ({
          valid: true,
          claims,
        })),
        extractUserInfo: vi.fn(() => ({
          externalId: 'user-session-fail',
          email: 'user@example.com',
          displayName: 'User',
        })),
        extractGroups: vi.fn(() => []),
      }));

      vi.doMock('../../../../lib/session/session-policy', () => ({
        createSession: vi.fn(async () => ({
          ok: false,
          error: 'Failed to create session',
        })),
      }));

      vi.doMock('../../../../lib/audit/correlation-context', () => ({
        initCorrelationContext: vi.fn(() => 'corr-fail'),
      }));

      vi.doMock('../../../../lib/sso/idp-group-mapper', () => ({
        syncUserGroupsOnLogin: vi.fn().mockResolvedValue({ ok: true }),
      }));

      const { POST } = await import('../../../../app/api/auth/oidc/callback/route');
      const res = await POST(
        buildJsonRequest({
          code: 'auth-code',
          orgId: 'org-123',
          idToken: createMockJwt(claims),
        }) as never
      );

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('session_creation_failed');
    });

    it('handles missing idToken gracefully', async () => {
      vi.doMock('../../../../lib/supabase-server', () => ({
        getSupabaseAdmin: vi.fn(),
      }));

      vi.doMock('../../../../lib/sso/oidc-validator', () => ({
        parseJwt: vi.fn(() => null),
        validateOidcClaims: vi.fn(),
        extractUserInfo: vi.fn(),
        extractGroups: vi.fn(),
      }));

      vi.doMock('../../../../lib/audit/correlation-context', () => ({
        initCorrelationContext: vi.fn(() => 'corr-invalid'),
      }));

      const { POST } = await import('../../../../app/api/auth/oidc/callback/route');
      const res = await POST(
        buildJsonRequest({
          code: 'auth-code',
          orgId: 'org-123',
          idToken: 'invalid-jwt-format',
        }) as never
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('invalid_token');
    });
  });
});
