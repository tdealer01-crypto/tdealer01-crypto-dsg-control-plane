/**
 * User Role Assignment Endpoint
 *
 * PATCH /api/admin/users/{id}/role - Assign RBAC role to user
 *
 * Requires permission: manage:rbac
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/rbac/require-permission';
import { initCorrelationContext, updateCorrelationContext } from '@/lib/audit/correlation-context';

export const dynamic = 'force-dynamic';

interface AssignRoleRequest {
  rbacRoleId: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId = initCorrelationContext();
  const { id: userId } = await params;

  try {
    const authUserId = (request as any).userId;
    const orgId = (request as any).orgId;
    const body = (await request.json()) as AssignRoleRequest;

    if (!authUserId || !orgId) {
      return NextResponse.json({ ok: false, error: 'authentication_required' }, { status: 401 });
    }

    // Check permission
    const permResult = await checkPermission(authUserId, orgId, 'manage:rbac');
    if (!permResult.ok) {
      return NextResponse.json({ ok: false, error: 'permission_denied' }, { status: 403 });
    }

    if (!body.rbacRoleId) {
      return NextResponse.json({ ok: false, error: 'rbacRoleId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin() as any;

    // Verify role exists and belongs to org
    const roleResult = await supabase
      .from('org_rbac_roles')
      .select('id, name')
      .eq('id', body.rbacRoleId)
      .eq('org_id', orgId)
      .single();

    if (roleResult.error || !roleResult.data) {
      return NextResponse.json({ ok: false, error: 'Role not found' }, { status: 404 });
    }

    // Verify user exists and is in org
    const userOrgResult = await supabase
      .from('user_org_roles')
      .select('id, rbac_role_id')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .single();

    if (userOrgResult.error) {
      return NextResponse.json({ ok: false, error: 'User not in organization' }, { status: 404 });
    }

    updateCorrelationContext({ orgId, userId: authUserId });

    // Update user's role
    const updateResult = await supabase
      .from('user_org_roles')
      .update({ rbac_role_id: body.rbacRoleId })
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .select();

    if (updateResult.error) {
      console.error('[role-assign] Error:', updateResult.error);
      return NextResponse.json({ ok: false, error: 'Failed to assign role' }, { status: 500 });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'user_role_assigned',
      resource_type: 'user',
      resource_id: userId,
      actor_id: authUserId,
      actor_email: authUserId,
      result: 'success',
      correlation_id: correlationId,
      severity: 'WARN',
      message: `Assigned role '${roleResult.data.name}' to user`,
    });

    return NextResponse.json({
      ok: true,
      userId,
      rbacRoleId: body.rbacRoleId,
      roleName: roleResult.data.name,
    });
  } catch (error) {
    console.error('[role-assign] Exception:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
