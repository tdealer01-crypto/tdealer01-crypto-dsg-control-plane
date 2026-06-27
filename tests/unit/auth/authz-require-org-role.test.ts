import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/supabase/server', () => ({
  createClient: vi.fn(),
}));
vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(),
}));
vi.mock('../../../lib/supabase/resolve-policy', () => ({
  isMissingRelationError: vi.fn(() => false),
}));

import { requireOrgRole } from '../../../lib/authz';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

const mockCreateClient = vi.mocked(createClient);
const mockGetAdmin = vi.mocked(getSupabaseAdmin);

const AUTH_USER = { id: 'auth-user-1' };
const PROFILE = { id: 'app-user-1', org_id: 'org-1', is_active: true, role: 'viewer' };

function makeRuntimeRolesQuery(result: { data: Array<{ role: string }> | null; error: unknown }) {
  const q = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve as any, reject as any),
    catch: (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject as any),
  };
  q.select.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  return q;
}

function makeAdmin(
  usersResult: { data: unknown; error: unknown },
  runtimeRolesResult: { data: Array<{ role: string }> | null; error: unknown }
) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue(usersResult),
        };
      }
      if (table === 'runtime_roles') {
        return makeRuntimeRolesQuery(runtimeRolesResult);
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

function makeAuthClient(user: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireOrgRole', () => {
  it('returns 401 when auth user is null', async () => {
    mockCreateClient.mockResolvedValue(makeAuthClient(null) as any);
    mockGetAdmin.mockReturnValue(makeAdmin({ data: PROFILE, error: null }, { data: [], error: null }) as any);

    const result = await requireOrgRole(['reviewer']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('returns 401 when auth.getUser returns error', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('session expired') }),
      },
    } as any);

    const result = await requireOrgRole(['reviewer']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('returns 500 when profile lookup fails with DB error', async () => {
    mockCreateClient.mockResolvedValue(makeAuthClient(AUTH_USER) as any);
    mockGetAdmin.mockReturnValue(
      makeAdmin({ data: null, error: { message: 'db error', code: 'PGRST000' } }, { data: [], error: null }) as any
    );

    const result = await requireOrgRole(['reviewer']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
  });

  it('returns 401 when is_active is false', async () => {
    mockCreateClient.mockResolvedValue(makeAuthClient(AUTH_USER) as any);
    mockGetAdmin.mockReturnValue(
      makeAdmin({ data: { ...PROFILE, is_active: false }, error: null }, { data: [], error: null }) as any
    );

    const result = await requireOrgRole(['reviewer']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('returns 401 when profile has no org_id', async () => {
    mockCreateClient.mockResolvedValue(makeAuthClient(AUTH_USER) as any);
    mockGetAdmin.mockReturnValue(
      makeAdmin({ data: { ...PROFILE, org_id: null }, error: null }, { data: [], error: null }) as any
    );

    const result = await requireOrgRole(['reviewer']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('PGRST205 fallback: owner gets all 5 RuntimeRoles', async () => {
    mockCreateClient.mockResolvedValue(makeAuthClient(AUTH_USER) as any);
    mockGetAdmin.mockReturnValue(
      makeAdmin(
        { data: { ...PROFILE, role: 'owner' }, error: null },
        { data: null, error: { code: 'PGRST205', message: 'relation runtime_roles does not exist' } }
      ) as any
    );

    const result = await requireOrgRole(['org_admin']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.grantedRoles).toContain('org_admin');
      expect(result.grantedRoles).toContain('billing_admin');
      expect(result.grantedRoles).toContain('operator');
      expect(result.grantedRoles).toContain('reviewer');
      expect(result.grantedRoles).toContain('runtime_auditor');
    }
  });

  it('PGRST205 fallback: viewer only gets reviewer role', async () => {
    mockCreateClient.mockResolvedValue(makeAuthClient(AUTH_USER) as any);
    mockGetAdmin.mockReturnValue(
      makeAdmin(
        { data: { ...PROFILE, role: 'viewer' }, error: null },
        { data: null, error: { code: 'PGRST205', message: 'relation does not exist' } }
      ) as any
    );

    const result = await requireOrgRole(['reviewer']);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.grantedRoles).toEqual(['reviewer']);
  });

  it('PGRST205 fallback: viewer without required role returns 403', async () => {
    mockCreateClient.mockResolvedValue(makeAuthClient(AUTH_USER) as any);
    mockGetAdmin.mockReturnValue(
      makeAdmin(
        { data: { ...PROFILE, role: 'viewer' }, error: null },
        { data: null, error: { code: 'PGRST205', message: 'relation does not exist' } }
      ) as any
    );

    const result = await requireOrgRole(['org_admin']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('returns ok=true with org/user data when user has required runtime role', async () => {
    mockCreateClient.mockResolvedValue(makeAuthClient(AUTH_USER) as any);
    mockGetAdmin.mockReturnValue(
      makeAdmin(
        { data: { ...PROFILE, role: 'viewer' }, error: null },
        { data: [{ role: 'operator' }, { role: 'reviewer' }], error: null }
      ) as any
    );

    const result = await requireOrgRole(['operator']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.orgId).toBe('org-1');
      expect(result.userId).toBe('app-user-1');
      expect(result.authUserId).toBe('auth-user-1');
      expect(result.grantedRoles).toContain('operator');
    }
  });

  it('returns 403 when user lacks any required role', async () => {
    mockCreateClient.mockResolvedValue(makeAuthClient(AUTH_USER) as any);
    mockGetAdmin.mockReturnValue(
      makeAdmin(
        { data: { ...PROFILE, role: 'viewer' }, error: null },
        { data: [{ role: 'reviewer' }], error: null }
      ) as any
    );

    const result = await requireOrgRole(['org_admin']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('merges owner base role grants on top of fetched runtime_roles', async () => {
    mockCreateClient.mockResolvedValue(makeAuthClient(AUTH_USER) as any);
    mockGetAdmin.mockReturnValue(
      makeAdmin(
        { data: { ...PROFILE, role: 'owner' }, error: null },
        { data: [{ role: 'reviewer' }], error: null }
      ) as any
    );

    const result = await requireOrgRole(['billing_admin']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.grantedRoles).toContain('billing_admin');
      expect(result.grantedRoles).toContain('reviewer');
    }
  });

  it('merges viewer base role grant: adds reviewer even when not in runtime_roles', async () => {
    mockCreateClient.mockResolvedValue(makeAuthClient(AUTH_USER) as any);
    mockGetAdmin.mockReturnValue(
      makeAdmin(
        { data: { ...PROFILE, role: 'viewer' }, error: null },
        { data: [], error: null }
      ) as any
    );

    const result = await requireOrgRole(['reviewer']);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.grantedRoles).toContain('reviewer');
  });
});
