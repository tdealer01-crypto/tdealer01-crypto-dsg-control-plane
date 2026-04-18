import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const maybeSingle = vi.fn();
const runtimeRolesEq = vi.fn();

vi.mock('../../lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser,
    },
  })),
}));

vi.mock('../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle,
            })),
          })),
        };
      }

      if (table === 'runtime_roles') {
        return {
          select: vi.fn(() => ({
            eq: runtimeRolesEq,
          })),
        };
      }

      return {};
    }),
  })),
}));

describe('requireOrgRole runtime_roles fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('falls back to base admin role when runtime_roles relation is missing', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null });
    maybeSingle.mockResolvedValue({
      data: { id: 'user-1', org_id: 'org-1', is_active: true, role: 'admin' },
      error: null,
    });
    runtimeRolesEq.mockReturnValue({
      eq: vi.fn(async () => ({
        data: null,
        error: { message: "Could not find the table 'public.runtime_roles' in the schema cache" },
      })),
    });

    const { requireOrgRole } = await import('../../lib/authz');
    const result = await requireOrgRole(['org_admin']);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.grantedRoles).toContain('org_admin');
      expect(result.grantedRoles).toContain('operator');
    }
  });

  it('returns forbidden when fallback role set does not satisfy required role', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null });
    maybeSingle.mockResolvedValue({
      data: { id: 'user-1', org_id: 'org-1', is_active: true, role: 'viewer' },
      error: null,
    });
    runtimeRolesEq.mockReturnValue({
      eq: vi.fn(async () => ({
        data: null,
        error: { message: "Could not find the table 'public.runtime_roles' in the schema cache" },
      })),
    });

    const { requireOrgRole } = await import('../../lib/authz');
    const result = await requireOrgRole(['operator']);

    expect(result).toEqual({ ok: false, status: 403, error: 'Forbidden' });
  });
});
