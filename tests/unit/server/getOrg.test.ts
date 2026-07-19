import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Supabase before any module import
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe('getOrg', () => {
  let getOrg: typeof import('../../lib/server/getOrg').getOrg;
  let OrgAuthError: typeof import('../../lib/server/getOrg').OrgAuthError;
  let mockCreateClient: ReturnType<typeof vi.fn>;
  let mockGetSupabaseAdmin: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    const { getOrg: importedGetOrg, OrgAuthError: ImportedOrgAuthError } = await import(
      '@/lib/server/getOrg'
    );
    getOrg = importedGetOrg;
    OrgAuthError = ImportedOrgAuthError;

    mockCreateClient = vi.mocked((await import('@/lib/supabase/server')).createClient);
    mockGetSupabaseAdmin = vi.mocked((await import('@/lib/supabase-server')).getSupabaseAdmin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('OrgAuthError', () => {
    it('creates error with default message and status', () => {
      const error = new OrgAuthError();
      expect(error.message).toBe('Unauthorized');
      expect(error.status).toBe(401);
      expect(error.name).toBe('OrgAuthError');
    });

    it('creates error with custom message and status', () => {
      const error = new OrgAuthError('Custom message', 403);
      expect(error.message).toBe('Custom message');
      expect(error.status).toBe(403);
    });

    it('extends Error class', () => {
      const error = new OrgAuthError();
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('getOrg', () => {
    it('returns org_id when user exists and is active', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      const mockAdmin = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { org_id: '12345', is_active: true },
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockAdmin);

      const result = await getOrg();
      expect(result).toBe('12345');
    });

    it('throws OrgAuthError when auth.getUser fails', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Auth failed'),
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      await expect(getOrg()).rejects.toThrow(OrgAuthError);
      await expect(getOrg()).rejects.toMatchObject({ status: 401 });
    });

    it('throws OrgAuthError when user is null', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      await expect(getOrg()).rejects.toThrow(OrgAuthError);
    });

    it('throws OrgAuthError when user.id is missing', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: '' } },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      await expect(getOrg()).rejects.toThrow(OrgAuthError);
    });

    it('throws database error when profile query fails', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      const dbError = new Error('Database error');
      const mockAdmin = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockAdmin);

      await expect(getOrg()).rejects.toThrow('Database error');
    });

    it('throws OrgAuthError when profile has no org_id', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      const mockAdmin = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { org_id: null, is_active: true },
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockAdmin);

      await expect(getOrg()).rejects.toThrow(OrgAuthError);
      await expect(getOrg()).rejects.toMatchObject({ status: 401 });
    });

    it('throws OrgAuthError when user is not active', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      const mockAdmin = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { org_id: '12345', is_active: false },
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockAdmin);

      await expect(getOrg()).rejects.toThrow(OrgAuthError);
      await expect(getOrg()).rejects.toMatchObject({ status: 401 });
    });

    it('throws OrgAuthError when profile is null', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      const mockAdmin = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockAdmin);

      await expect(getOrg()).rejects.toThrow(OrgAuthError);
    });

    it('converts org_id to string', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      const mockAdmin = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { org_id: 999, is_active: true }, // numeric org_id
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockAdmin);

      const result = await getOrg();
      expect(result).toBe('999');
      expect(typeof result).toBe('string');
    });

    it('queries the users table with correct filter', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-abc' } },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      const mockAdmin = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { org_id: '12345', is_active: true },
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockAdmin);

      await getOrg();

      expect(mockAdmin.from).toHaveBeenCalledWith('users');
      expect(mockAdmin.select).toHaveBeenCalledWith('org_id, is_active');
      expect(mockAdmin.eq).toHaveBeenCalledWith('auth_user_id', 'user-abc');
    });
  });
});
