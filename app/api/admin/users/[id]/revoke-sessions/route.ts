/**
 * User Session Revocation Endpoint
 *
 * POST /api/admin/users/{id}/revoke-sessions
 * Revoke all active sessions for a user
 *
 * Requires permission: manage:users or admin
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/rbac/require-permission';
import { initCorrelationContext, updateCorrelationContext } from '@/lib/audit/correlation-context';

export const dynamic = 'force-dynamic';

interface RevokeSessionsRequest {
  reason?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId = initCorrelationContext();
  const { id: userId } = await params;

  try {
    const authUserId = (request as any).userId;
    const orgId = (request as any).orgId;
    const body = (await request.json()) as RevokeSessionsRequest;

    if (!authUserId || !orgId) {
      return NextResponse.json({ ok: false, error: 'authentication_required' }, { status: 401 });
    }

    // Check permission - allow both manage:users and admin
    let permResult = await checkPermission(authUserId, orgId, 'manage:users');
    if (!permResult.ok) {
      permResult = await checkPermission(authUserId, orgId, 'admin');
      if (!permResult.ok) {
        return NextResponse.json({ ok: false, error: 'permission_denied' }, { status: 403 });
      }
    }

    const supabase = getSupabaseAdmin() as any;

    // Verify user exists and is in org
    const userOrgResult = await supabase
      .from('user_org_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .single();

    if (userOrgResult.error) {
      return NextResponse.json({ ok: false, error: 'User not in organization' }, { status: 404 });
    }

    updateCorrelationContext({ orgId, userId: authUserId });

    // Get active sessions to revoke
    const sessionsResult = await supabase
      .from('user_sessions')
      .select('id, token')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .is('revoked_at', null);

    if (sessionsResult.error) {
      console.error('[revoke-sessions] Error fetching sessions:', sessionsResult.error);
      return NextResponse.json({ ok: false, error: 'Failed to revoke sessions' }, { status: 500 });
    }

    const sessions = sessionsResult.data || [];
    const revokedCount = sessions.length;

    if (revokedCount > 0) {
      // Revoke all active sessions
      const revokeResult = await supabase
        .from('user_sessions')
        .update({
          revoked_at: new Date().toISOString(),
          revoke_reason: body.reason || 'admin_revocation',
        })
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .is('revoked_at', null);

      if (revokeResult.error) {
        console.error('[revoke-sessions] Error revoking:', revokeResult.error);
        return NextResponse.json({ ok: false, error: 'Failed to revoke sessions' }, { status: 500 });
      }
    }

    // Audit log for each revoked session
    if (revokedCount > 0) {
      for (const session of sessions) {
        await supabase.from('audit_logs').insert({
          org_id: orgId,
          action: 'session_revoked',
          resource_type: 'session',
          resource_id: session.id,
          actor_id: authUserId,
          actor_email: authUserId,
          result: 'success',
          correlation_id: correlationId,
          severity: 'WARN',
          message: `Session revoked: ${body.reason || 'admin_revocation'}`,
        });
      }

      // Audit log for user action
      await supabase.from('audit_logs').insert({
        org_id: orgId,
        action: 'user_sessions_revoked',
        resource_type: 'user',
        resource_id: userId,
        actor_id: authUserId,
        actor_email: authUserId,
        result: 'success',
        correlation_id: correlationId,
        severity: 'WARN',
        message: `Revoked ${revokedCount} active sessions for user`,
      });
    }

    return NextResponse.json({
      ok: true,
      userId,
      sessionsRevoked: revokedCount,
      message: `Revoked ${revokedCount} active session${revokedCount !== 1 ? 's' : ''}`,
    });
  } catch (error) {
    console.error('[revoke-sessions] Exception:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
