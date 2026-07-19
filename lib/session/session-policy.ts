/**
 * Session Management Policy
 *
 * Enforces enterprise session policies: timeout, concurrent limits, revocation.
 */

import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCorrelationId } from '@/lib/audit/correlation-context';

export interface SessionPolicy {
  idleTimeoutMs: number; // Inactivity timeout (30 min default)
  absoluteTimeoutMs: number; // Absolute session lifetime (8 hours default)
  maxConcurrentSessions: number; // Max active sessions per user (5 default)
  requireMfaAfterTimeout: boolean; // Require MFA re-auth after timeout
}

export interface SessionCheckResult {
  ok: boolean;
  sessionValid: boolean;
  reason?: string; // 'expired', 'idle_timeout', 'revoked', 'concurrent_limit'
}

export const DEFAULT_POLICY: SessionPolicy = {
  idleTimeoutMs: 30 * 60 * 1000, // 30 minutes
  absoluteTimeoutMs: 8 * 60 * 60 * 1000, // 8 hours
  maxConcurrentSessions: 5,
  requireMfaAfterTimeout: false,
};

/**
 * Check if session is valid according to policy
 * @param sessionId Session ID
 * @param policy Session policy (uses defaults if not provided)
 * @returns SessionCheckResult
 */
export async function checkSessionValidity(
  sessionId: string,
  policy: Partial<SessionPolicy> = {},
): Promise<SessionCheckResult> {
  const mergedPolicy = { ...DEFAULT_POLICY, ...policy };

  try {
    const supabase = getSupabaseAdmin() as any;

    // Get session from database
    const sessionResult = await supabase
      .from('user_sessions')
      .select('id, user_id, org_id, expires_at, last_activity_at, revoked_at, created_at')
      .eq('id', sessionId)
      .single();

    if (sessionResult.error) {
      return { ok: false, sessionValid: false, reason: 'session_not_found' };
    }

    const session = sessionResult.data;
    const now = new Date();

    // Check if session is revoked
    if (session.revoked_at) {
      return { ok: false, sessionValid: false, reason: 'revoked' };
    }

    // Check absolute timeout (expiration time)
    if (new Date(session.expires_at) < now) {
      return { ok: false, sessionValid: false, reason: 'expired' };
    }

    // Check idle timeout
    const lastActivity = new Date(session.last_activity_at);
    const idleMs = now.getTime() - lastActivity.getTime();
    if (idleMs > mergedPolicy.idleTimeoutMs) {
      return { ok: false, sessionValid: false, reason: 'idle_timeout' };
    }

    return { ok: true, sessionValid: true };
  } catch (error) {
    console.error('[session-check] Exception:', error);
    return { ok: false, sessionValid: false, reason: 'check_failed' };
  }
}

/**
 * Update session last activity timestamp
 * @param sessionId Session ID
 * @returns Success result
 */
export async function updateSessionActivity(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin() as any;

    const result = await supabase
      .from('user_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (result.error) {
      console.error('[session-update] Error:', result.error);
      return { ok: false, error: result.error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('[session-update] Exception:', error);
    return { ok: false, error: `Failed to update session: ${String(error).slice(0, 100)}` };
  }
}

/**
 * Check concurrent sessions and enforce limit
 * @param userId User ID
 * @param orgId Organization ID
 * @param policy Session policy
 * @returns { ok, activeSessions, limitExceeded }
 */
export async function checkConcurrentSessions(
  userId: string,
  orgId: string,
  policy: Partial<SessionPolicy> = {},
): Promise<{ ok: boolean; activeSessions: number; limitExceeded: boolean; error?: string }> {
  const mergedPolicy = { ...DEFAULT_POLICY, ...policy };

  try {
    const supabase = getSupabaseAdmin() as any;

    // Count active, non-revoked sessions
    const countResult = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString());

    if (countResult.error) {
      console.error('[session-concurrent] Error:', countResult.error);
      return { ok: false, activeSessions: 0, limitExceeded: false, error: countResult.error.message };
    }

    const activeSessions = countResult.count || 0;
    const limitExceeded = activeSessions >= mergedPolicy.maxConcurrentSessions;

    return { ok: true, activeSessions, limitExceeded };
  } catch (error) {
    console.error('[session-concurrent] Exception:', error);
    return { ok: false, activeSessions: 0, limitExceeded: false, error: `Check failed: ${String(error).slice(0, 100)}` };
  }
}

/**
 * Revoke oldest session when limit exceeded
 * @param userId User ID
 * @param orgId Organization ID
 * @returns { ok, revokedSessionId }
 */
export async function revokeOldestSession(
  userId: string,
  orgId: string,
): Promise<{ ok: boolean; revokedSessionId?: string; error?: string }> {
  try {
    const supabase = getSupabaseAdmin() as any;

    // Find oldest active session
    const oldestResult = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (oldestResult.error) {
      return { ok: false, error: 'No session to revoke' };
    }

    const oldestSessionId = oldestResult.data.id;

    // Revoke it
    const revokeResult = await supabase
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString(), revoke_reason: 'concurrent_limit_exceeded' })
      .eq('id', oldestSessionId);

    if (revokeResult.error) {
      console.error('[session-revoke] Error:', revokeResult.error);
      return { ok: false, error: revokeResult.error.message };
    }

    return { ok: true, revokedSessionId: oldestSessionId };
  } catch (error) {
    console.error('[session-revoke] Exception:', error);
    return { ok: false, error: `Revoke failed: ${String(error).slice(0, 100)}` };
  }
}

/**
 * Create a new session after successful auth
 * @param userId User ID
 * @param orgId Organization ID
 * @param tokenHash SHA256 hash of session token
 * @param ipAddress Request IP
 * @param userAgent Request user agent
 * @param policy Session policy
 * @returns { ok, sessionId, expiresAt }
 */
export async function createSession(
  userId: string,
  orgId: string,
  tokenHash: string,
  ipAddress?: string,
  userAgent?: string,
  policy: Partial<SessionPolicy> = {},
): Promise<{ ok: boolean; sessionId?: string; expiresAt?: string; error?: string }> {
  const mergedPolicy = { ...DEFAULT_POLICY, ...policy };

  try {
    const supabase = getSupabaseAdmin() as any;

    // Check concurrent limit
    const concurrentCheck = await checkConcurrentSessions(userId, orgId, mergedPolicy);
    if (concurrentCheck.limitExceeded) {
      // Revoke oldest session
      const revokeResult = await revokeOldestSession(userId, orgId);
      if (!revokeResult.ok) {
        console.warn('[session-create] Failed to revoke oldest session:', revokeResult.error);
      }
    }

    // Calculate expiration
    const now = new Date();
    const expiresAt = new Date(now.getTime() + mergedPolicy.absoluteTimeoutMs);

    // Create new session
    const createResult = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        org_id: orgId,
        token_hash: tokenHash,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
        last_activity_at: now.toISOString(),
      })
      .select('id')
      .single();

    if (createResult.error) {
      console.error('[session-create] Error:', createResult.error);
      return { ok: false, error: createResult.error.message };
    }

    return { ok: true, sessionId: createResult.data.id, expiresAt: expiresAt.toISOString() };
  } catch (error) {
    console.error('[session-create] Exception:', error);
    return { ok: false, error: `Session creation failed: ${String(error).slice(0, 100)}` };
  }
}
