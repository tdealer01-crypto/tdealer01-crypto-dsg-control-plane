import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/supabase-server');

describe('IdP Group Mapper', () => {
  const originalEnv = { ...process.env };
  let mockSupabase: any;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    mockSupabase = {
      from: vi.fn(),
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  describe('getGroupMapping', () => {
    it('returns mapped role for existing group', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase-server');
      mockSupabase.from = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValueOnce({
              eq: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockReturnValueOnce({
                  single: vi.fn().mockResolvedValue({
                    data: { rbac_role_id: 'role-123' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValue({
                data: { id: 'role-123', name: 'Engineer' },
                error: null,
              }),
            }),
          }),
        });

      (getSupabaseAdmin as any).mockReturnValue(mockSupabase);

      const { getGroupMapping } = await import('@/lib/sso/idp-group-mapper');
      const result = await getGroupMapping('org-456', 'engineering@acme.com');

      expect(result.ok).toBe(true);
      expect(result.roleId).toBe('role-123');
      expect(result.roleName).toBe('Engineer');
    });

    it('returns ok when no mapping exists', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase-server');
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              eq: vi.fn().mockReturnValueOnce({
                single: vi.fn().mockResolvedValue({
                  error: { message: 'No rows' },
                  data: null,
                }),
              }),
            }),
          }),
        }),
      });

      (getSupabaseAdmin as any).mockReturnValue(mockSupabase);

      const { getGroupMapping } = await import('@/lib/sso/idp-group-mapper');
      const result = await getGroupMapping('org-456', 'unknown@acme.com');

      expect(result.ok).toBe(true);
      expect(result.roleId).toBeUndefined();
    });

    it('returns error when role not found', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase-server');
      mockSupabase.from = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValueOnce({
              eq: vi.fn().mockReturnValueOnce({
                eq: vi.fn().mockReturnValueOnce({
                  single: vi.fn().mockResolvedValue({
                    data: { rbac_role_id: 'role-999' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValue({
                error: { message: 'No rows' },
                data: null,
              }),
            }),
          }),
        });

      (getSupabaseAdmin as any).mockReturnValue(mockSupabase);

      const { getGroupMapping } = await import('@/lib/sso/idp-group-mapper');
      const result = await getGroupMapping('org-456', 'engineering@acme.com');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Role not found');
    });

    it('handles database exception gracefully', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase-server');
      (getSupabaseAdmin as any).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const { getGroupMapping } = await import('@/lib/sso/idp-group-mapper');
      const result = await getGroupMapping('org-456', 'engineering@acme.com');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Mapping lookup failed');
    });
  });

  describe('getOrgGroupMappings', () => {
    it('returns all group mappings for organization', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase-server');
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              error: null,
              data: [
                { idp_group_name: 'engineering@acme.com', rbac_role_id: 'role-eng' },
                { idp_group_name: 'admin@acme.com', rbac_role_id: 'role-admin' },
              ],
            }),
          }),
        }),
      });

      (getSupabaseAdmin as any).mockReturnValue(mockSupabase);

      const { getOrgGroupMappings } = await import('@/lib/sso/idp-group-mapper');
      const result = await getOrgGroupMappings('org-456');

      expect(result).toEqual({
        'engineering@acme.com': 'role-eng',
        'admin@acme.com': 'role-admin',
      });
    });

    it('returns empty object when no mappings exist', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase-server');
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              error: null,
              data: [],
            }),
          }),
        }),
      });

      (getSupabaseAdmin as any).mockReturnValue(mockSupabase);

      const { getOrgGroupMappings } = await import('@/lib/sso/idp-group-mapper');
      const result = await getOrgGroupMappings('org-456');

      expect(result).toEqual({});
    });

    it('returns null on database error', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase-server');
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              error: { message: 'Database error' },
              data: null,
            }),
          }),
        }),
      });

      (getSupabaseAdmin as any).mockReturnValue(mockSupabase);

      const { getOrgGroupMappings } = await import('@/lib/sso/idp-group-mapper');
      const result = await getOrgGroupMappings('org-456');

      expect(result).toBeNull();
    });

    it('handles exception gracefully', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase-server');
      (getSupabaseAdmin as any).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const { getOrgGroupMappings } = await import('@/lib/sso/idp-group-mapper');
      const result = await getOrgGroupMappings('org-456');

      expect(result).toBeNull();
    });
  });

  describe('createGroupMapping', () => {
    it('creates new group mapping', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase-server');
      mockSupabase.from = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValueOnce({
              eq: vi.fn().mockReturnValueOnce({
                single: vi.fn().mockResolvedValue({
                  error: { message: 'No rows' },
                  data: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: vi.fn().mockResolvedValue({
            error: null,
            data: { id: 'mapping-789' },
          }),
        });

      (getSupabaseAdmin as any).mockReturnValue(mockSupabase);

      const { createGroupMapping } = await import('@/lib/sso/idp-group-mapper');
      const result = await createGroupMapping('org-456', 'engineering@acme.com', 'role-eng');

      expect(result.ok).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('deleteGroupMapping', () => {
    it('deletes group mapping', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase-server');
      mockSupabase.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      });

      (getSupabaseAdmin as any).mockReturnValue(mockSupabase);

      const { deleteGroupMapping } = await import('@/lib/sso/idp-group-mapper');
      const result = await deleteGroupMapping('org-456', 'engineering@acme.com');

      expect(result.ok).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns error when deletion fails', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase-server');
      mockSupabase.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockResolvedValue({
              error: { message: 'Delete failed' },
            }),
          }),
        }),
      });

      (getSupabaseAdmin as any).mockReturnValue(mockSupabase);

      const { deleteGroupMapping } = await import('@/lib/sso/idp-group-mapper');
      const result = await deleteGroupMapping('org-456', 'engineering@acme.com');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });
});
