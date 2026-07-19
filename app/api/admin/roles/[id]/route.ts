/**
 * RBAC Role Detail Endpoint
 *
 * PATCH /api/admin/roles/{id} - Update role permissions
 * DELETE /api/admin/roles/{id} - Delete custom role
 *
 * Requires permission: manage:rbac
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/rbac/require-permission';
import { initCorrelationContext, updateCorrelationContext } from '@/lib/audit/correlation-context';
import { isValidPermission, expandPermissions } from '@/lib/rbac/permission-matrix';

export const dynamic = 'force-dynamic';

interface UpdateRoleRequest {
  permissions?: string[];
  description?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId = initCorrelationContext();
  const { id } = await params;

  try {
    const userId = (request as any).userId;
    const orgId = (request as any).orgId;
    const body = (await request.json()) as UpdateRoleRequest;

    if (!userId || !orgId) {
      return NextResponse.json({ ok: false, error: 'authentication_required' }, { status: 401 });
    }

    // Check permission
    const permResult = await checkPermission(userId, orgId, 'manage:rbac');
    if (!permResult.ok) {
      return NextResponse.json({ ok: false, error: 'permission_denied' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin() as any;

    // Verify role exists and belongs to org
    const roleResult = await supabase
      .from('org_rbac_roles')
      .select('id, name, permissions, is_custom')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (roleResult.error || !roleResult.data) {
      return NextResponse.json({ ok: false, error: 'Role not found' }, { status: 404 });
    }

    const role = roleResult.data;

    // Don't allow modifying system roles
    if (!role.is_custom) {
      return NextResponse.json(
        { ok: false, error: 'Cannot modify system roles' },
        { status: 403 },
      );
    }

    updateCorrelationContext({ orgId, userId });

    const updates: Record<string, any> = {};

    // Validate and expand permissions
    if (body.permissions) {
      for (const perm of body.permissions) {
        if (!isValidPermission(perm)) {
          return NextResponse.json(
            { ok: false, error: `Invalid permission: ${perm}` },
            { status: 400 },
          );
        }
      }
      // Expand all permissions at once
      const expandedPerms = new Set<string>();
      expandPermissions(body.permissions).forEach((p) => expandedPerms.add(p));
      updates.permissions = Array.from(expandedPerms);
    }

    if (body.description !== undefined) {
      updates.description = body.description;
    }

    // Update role
    const updateResult = await supabase
      .from('org_rbac_roles')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select();

    if (updateResult.error) {
      console.error('[role-update] Error:', updateResult.error);
      return NextResponse.json({ ok: false, error: 'Failed to update role' }, { status: 500 });
    }

    const updatedRole = updateResult.data[0];

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'role_updated',
      resource_type: 'rbac',
      resource_id: id,
      actor_id: userId,
      actor_email: userId,
      result: 'success',
      correlation_id: correlationId,
      severity: 'WARN',
      message: `Updated role '${updatedRole.name}'`,
    });

    return NextResponse.json({
      ok: true,
      role: updatedRole,
    });
  } catch (error) {
    console.error('[role-update] Exception:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId = initCorrelationContext();
  const { id } = await params;

  try {
    const userId = (request as any).userId;
    const orgId = (request as any).orgId;

    if (!userId || !orgId) {
      return NextResponse.json({ ok: false, error: 'authentication_required' }, { status: 401 });
    }

    // Check permission
    const permResult = await checkPermission(userId, orgId, 'manage:rbac');
    if (!permResult.ok) {
      return NextResponse.json({ ok: false, error: 'permission_denied' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin() as any;

    // Verify role exists and belongs to org
    const roleResult = await supabase
      .from('org_rbac_roles')
      .select('id, name, is_custom')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (roleResult.error || !roleResult.data) {
      return NextResponse.json({ ok: false, error: 'Role not found' }, { status: 404 });
    }

    const role = roleResult.data;

    // Don't allow deleting system roles
    if (!role.is_custom) {
      return NextResponse.json(
        { ok: false, error: 'Cannot delete system roles' },
        { status: 403 },
      );
    }

    // Check if any users have this role assigned
    const userCountResult = await supabase
      .from('user_org_roles')
      .select('id', { count: 'exact' })
      .eq('rbac_role_id', id);

    if ((userCountResult.count || 0) > 0) {
      return NextResponse.json(
        { ok: false, error: `Cannot delete role with ${userCountResult.count} users assigned` },
        { status: 409 },
      );
    }

    updateCorrelationContext({ orgId, userId });

    // Delete role
    const deleteResult = await supabase
      .from('org_rbac_roles')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (deleteResult.error) {
      console.error('[role-delete] Error:', deleteResult.error);
      return NextResponse.json({ ok: false, error: 'Failed to delete role' }, { status: 500 });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'role_deleted',
      resource_type: 'rbac',
      resource_id: id,
      actor_id: userId,
      actor_email: userId,
      result: 'success',
      correlation_id: correlationId,
      severity: 'WARN',
      message: `Deleted role '${role.name}'`,
    });

    return NextResponse.json({
      ok: true,
      message: `Role '${role.name}' deleted`,
    });
  } catch (error) {
    console.error('[role-delete] Exception:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
