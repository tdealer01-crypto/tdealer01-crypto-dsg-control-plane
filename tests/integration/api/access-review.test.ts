import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/access/review', () => {
  beforeEach(() => vi.resetModules());

  it('returns 403 when reviewer lacks org.manage_access', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () => ({
      requireOrgPermission: vi.fn(async () => ({ ok: false, status: 403, error: 'Insufficient permission' })),
    }));
    vi.doMock('../../../lib/supabase-server', () => ({ getSupabaseAdmin: vi.fn(() => ({ from: vi.fn() })) }));

    const { POST } = await import('../../../app/api/access/review/route');
    const req = new Request('http://localhost/api/access/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ request_id: 'req_1', action: 'approve' }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });

  it('approves pending access request and activates matching user', async () => {
    vi.doMock('../../../lib/auth/require-org-permission', () => ({
      requireOrgPermission: vi.fn(async () => ({
        ok: true,
        orgId: 'org_1',
        userId: 'reviewer_1',
        authUserId: 'auth_reviewer_1',
        email: 'admin@acme.com',
        role: 'admin',
      })),
    }));

    const updateRequestEq = vi.fn(async () => ({ data: null, error: null }));
    const updateUserEq = vi.fn(async () => ({ data: null, error: null }));
    const upsertUserRole = vi.fn(async () => ({ data: null, error: null }));
    const upsertRuntimeRole = vi.fn(async () => ({ data: null, error: null }));
    const insertSignIn = vi.fn(async () => ({ data: null, error: null }));

    const from = vi.fn((table: string) => {
      if (table === 'access_requests') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { id: 'req_1', email: 'user@acme.com', org_id: 'org_1', status: 'pending' }, error: null })),
            })),
          })),
          update: vi.fn(() => ({ eq: updateRequestEq })),
        };
      }
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { id: 'user_1' }, error: null })),
            })),
          })),
          update: vi.fn(() => ({ eq: updateUserEq })),
        };
      }
      if (table === 'user_org_roles') return { upsert: upsertUserRole };
      if (table === 'runtime_roles') return { upsert: upsertRuntimeRole };
      if (table === 'sign_in_events') return { insert: insertSignIn };
      return {};
    });

    vi.doMock('../../../lib/supabase-server', () => ({ getSupabaseAdmin: vi.fn(() => ({ from })) }));

    const { POST } = await import('../../../app/api/access/review/route');
    const req = new Request('http://localhost/api/access/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ request_id: 'req_1', action: 'approve', role: 'operator' }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(updateRequestEq).toHaveBeenCalledOnce();
    expect(updateUserEq).toHaveBeenCalledOnce();
    expect(upsertUserRole).toHaveBeenCalledOnce();
    expect(upsertRuntimeRole).toHaveBeenCalledOnce();
    expect(insertSignIn).toHaveBeenCalledOnce();
  });
});
