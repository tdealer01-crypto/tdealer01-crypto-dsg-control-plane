import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/audit/correlation-context', () => ({
  getCorrelationId: vi.fn(() => 'test-correlation-id'),
}));

describe('Session Policy', () => {
  let checkSessionValidity: typeof import('@/lib/session/session-policy').checkSessionValidity;
  let updateSessionActivity: typeof import('@/lib/session/session-policy').updateSessionActivity;
  let checkConcurrentSessions: typeof import('@/lib/session/session-policy').checkConcurrentSessions;
  let revokeOldestSession: typeof import('@/lib/session/session-policy').revokeOldestSession;
  let createSession: typeof import('@/lib/session/session-policy').createSession;
  let DEFAULT_POLICY: typeof import('@/lib/session/session-policy').DEFAULT_POLICY;
  let mockGetSupabaseAdmin: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));

    const module = await import('@/lib/session/session-policy');
    checkSessionValidity = module.checkSessionValidity;
    updateSessionActivity = module.updateSessionActivity;
    checkConcurrentSessions = module.checkConcurrentSessions;
    revokeOldestSession = module.revokeOldestSession;
    createSession = module.createSession;
    DEFAULT_POLICY = module.DEFAULT_POLICY;

    mockGetSupabaseAdmin = vi.mocked((await import('@/lib/supabase-server')).getSupabaseAdmin);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('checkSessionValidity', () => {
    it('returns session valid for active session', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'session-123',
            user_id: 'user-456',
            org_id: 'org-789',
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            last_activity_at: new Date().toISOString(),
            revoked_at: null,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await checkSessionValidity('session-123');

      expect(result.ok).toBe(true);
      expect(result.sessionValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('returns session invalid when session not found', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Session not found'),
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await checkSessionValidity('nonexistent-session');

      expect(result.ok).toBe(false);
      expect(result.sessionValid).toBe(false);
      expect(result.reason).toBe('session_not_found');
    });

    it('returns revoked reason when session is revoked', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'session-123',
            user_id: 'user-456',
            org_id: 'org-789',
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            last_activity_at: new Date().toISOString(),
            revoked_at: new Date().toISOString(),
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await checkSessionValidity('session-123');

      expect(result.ok).toBe(false);
      expect(result.sessionValid).toBe(false);
      expect(result.reason).toBe('revoked');
    });

    it('returns expired reason when session has passed expiration', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'session-123',
            user_id: 'user-456',
            org_id: 'org-789',
            expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            last_activity_at: new Date().toISOString(),
            revoked_at: null,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await checkSessionValidity('session-123');

      expect(result.ok).toBe(false);
      expect(result.sessionValid).toBe(false);
      expect(result.reason).toBe('expired');
    });

    it('returns idle_timeout reason when session exceeds idle timeout', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'session-123',
            user_id: 'user-456',
            org_id: 'org-789',
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            last_activity_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
            revoked_at: null,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await checkSessionValidity('session-123');

      expect(result.ok).toBe(false);
      expect(result.sessionValid).toBe(false);
      expect(result.reason).toBe('idle_timeout');
    });

    it('respects custom idle timeout policy', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'session-123',
            user_id: 'user-456',
            org_id: 'org-789',
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            last_activity_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
            revoked_at: null,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await checkSessionValidity('session-123', { idleTimeoutMs: 60 * 60 * 1000 });

      expect(result.ok).toBe(true);
      expect(result.sessionValid).toBe(true);
    });

    it('handles database exceptions gracefully', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await checkSessionValidity('session-123');

      expect(result.ok).toBe(false);
      expect(result.sessionValid).toBe(false);
      expect(result.reason).toBe('check_failed');
    });
  });

  describe('updateSessionActivity', () => {
    it('successfully updates session activity', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'session-123' }],
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await updateSessionActivity('session-123');

      expect(result.ok).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockSupabase.update).toHaveBeenCalledWith({
        last_activity_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
    });

    it('returns error when update fails', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Update failed'),
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await updateSessionActivity('session-123');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('handles database exceptions', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockRejectedValue(new Error('Connection error')),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await updateSessionActivity('session-123');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Failed to update session');
    });
  });

  describe('checkConcurrentSessions', () => {
    it('returns count of active sessions', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 3,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await checkConcurrentSessions('user-456', 'org-789');

      expect(result.ok).toBe(true);
      expect(result.activeSessions).toBe(3);
      expect(result.limitExceeded).toBe(false);
    });

    it('returns limitExceeded when at or above maxConcurrentSessions', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 5,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await checkConcurrentSessions('user-456', 'org-789');

      expect(result.ok).toBe(true);
      expect(result.activeSessions).toBe(5);
      expect(result.limitExceeded).toBe(true);
    });

    it('respects custom concurrent limit in policy', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 4,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await checkConcurrentSessions('user-456', 'org-789', { maxConcurrentSessions: 3 });

      expect(result.ok).toBe(true);
      expect(result.activeSessions).toBe(4);
      expect(result.limitExceeded).toBe(true);
    });

    it('handles database exceptions', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockRejectedValue(new Error('Connection lost')),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await checkConcurrentSessions('user-456', 'org-789');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Check failed');
    });

    it('queries with correct table and filters', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockGt = vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 2,
      });

      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: mockSelect,
        eq: mockEq,
        is: mockIs,
        gt: mockGt,
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      await checkConcurrentSessions('user-123', 'org-456');

      expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });
  });

  describe('revokeOldestSession', () => {
    it('successfully revokes oldest session', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { id: 'session-oldest-123' },
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await revokeOldestSession('user-456', 'org-789');

      expect(result.ok).toBe(true);
      expect(result.revokedSessionId).toBe('session-oldest-123');
    });

    it('returns error when no session to revoke', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('No rows found'),
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await revokeOldestSession('user-456', 'org-789');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('No session to revoke');
    });

    it('handles database exceptions', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Connection error')),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await revokeOldestSession('user-456', 'org-789');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Revoke failed');
    });
  });

  describe('createSession', () => {
    it('successfully creates new session', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnValue({
          data: [],
          error: null,
          count: 0,
        }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'session-new-123' },
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await createSession('user-456', 'org-789', 'token-hash-abc');

      expect(result.ok).toBe(true);
      expect(result.sessionId).toBe('session-new-123');
      expect(result.expiresAt).toBeDefined();
    });

    it('includes ip address and user agent in session', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnValue({
          data: [],
          error: null,
          count: 0,
        }),
        insert: mockInsert,
        single: vi.fn().mockResolvedValue({
          data: { id: 'session-123' },
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      await createSession('user-456', 'org-789', 'token-hash', '192.168.1.1', 'Mozilla/5.0');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-456',
          org_id: 'org-789',
          token_hash: 'token-hash',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
        }),
      );
    });

    it('returns error when insert fails', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnValue({
          data: [],
          error: null,
          count: 0,
        }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Insert failed'),
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await createSession('user-456', 'org-789', 'token-hash');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Insert failed');
      expect(result.sessionId).toBeUndefined();
    });

    it('respects custom absolute timeout policy', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnValue({
          data: [],
          error: null,
          count: 0,
        }),
        insert: mockInsert,
        single: vi.fn().mockResolvedValue({
          data: { id: 'session-123' },
          error: null,
        }),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const customTimeout = 2 * 60 * 60 * 1000;
      await createSession('user-456', 'org-789', 'token-hash', undefined, undefined, {
        absoluteTimeoutMs: customTimeout,
      });

      const expectedExpiry = new Date(Date.now() + customTimeout);
      const insertCall = mockInsert.mock.calls[0][0];
      const actualExpiry = new Date(insertCall.expires_at);

      expect(Math.abs(actualExpiry.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });

    it('handles database exceptions', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnValue({
          data: [],
          error: null,
          count: 0,
        }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Connection error')),
      };
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await createSession('user-456', 'org-789', 'token-hash');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Session creation failed');
    });
  });

  describe('DEFAULT_POLICY', () => {
    it('has correct default values', () => {
      expect(DEFAULT_POLICY.idleTimeoutMs).toBe(30 * 60 * 1000);
      expect(DEFAULT_POLICY.absoluteTimeoutMs).toBe(8 * 60 * 60 * 1000);
      expect(DEFAULT_POLICY.maxConcurrentSessions).toBe(5);
      expect(DEFAULT_POLICY.requireMfaAfterTimeout).toBe(false);
    });
  });
});
