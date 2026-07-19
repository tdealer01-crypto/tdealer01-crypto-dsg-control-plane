/**
 * RBAC Roles Management Endpoint
 *
 * GET /api/admin/roles - List org's RBAC roles
 * POST /api/admin/roles - Create custom role
 *
 * Requires permission: manage:rbac
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/rbac/require-permission';
import { initCorrelationContext, updateCorrelationContext } from '@/lib/audit/correlation-context';
import { isValidPermission, expandPermissions } from '@/lib/rbac/permission-matrix';

export const dynamic = 'force-dynamic';

interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}

export async function GET(request: Request) {
  const correlationId = initCorrelationContext();

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

    // Get org's custom roles (exclude system roles where org_id is NULL)
    const rolesResult = await supabase
      .from('org_rbac_roles')
      .select('id, name, permissions, description, is_custom, created_at')
      .eq('org_id', orgId)
      .order('name', { ascending: true });

    if (rolesResult.error) {
      console.error('[roles-list] Error:', rolesResult.error);
      return NextResponse.json({ ok: false, error: 'Failed to fetch roles' }, { status: 500 });
    }

    const roles = rolesResult.data || [];

    // Also include system default roles
    const systemRoles = [
      {
        id: 'system-admin',
        name: 'admin',
        permissions: ['*'],
        description: 'Full system access',
        is_custom: false,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'system-operator',
        name: 'operator',
        permissions: ['read:*', 'write:audit', 'write:api-keys', 'write:webhooks'],
        description: 'Operator with audit and API key management',
        is_custom: false,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'system-viewer',
        name: 'viewer',
        permissions: ['read:*'],
        description: 'Read-only access',
        is_custom: false,
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'roles_listed',
      resource_type: 'rbac',
      actor_id: userId,
      actor_email: userId,
      result: 'success',
      correlation_id: correlationId,
      severity: 'INFO',
    });

    return NextResponse.json({
      ok: true,
      roles: [...systemRoles, ...roles],
      totalCount: systemRoles.length + roles.length,
    });
  } catch (error) {
    console.error('[roles-list] Exception:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const correlationId = initCorrelationContext();

  try {
    const userId = (request as any).userId;
    const orgId = (request as any).orgId;
    const body = (await request.json()) as CreateRoleRequest;

    if (!userId || !orgId) {
      return NextResponse.json({ ok: false, error: 'authentication_required' }, { status: 401 });
    }

    // Check permission
    const permResult = await checkPermission(userId, orgId, 'manage:rbac');
    if (!permResult.ok) {
      return NextResponse.json({ ok: false, error: 'permission_denied' }, { status: 403 });
    }

    // Validate input
    if (!body.name || !body.permissions || body.permissions.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'name and permissions are required' },
        { status: 400 },
      );
    }

    // Validate all permissions
    const expandedPerms = new Set<string>();
    for (const perm of body.permissions) {
      if (!isValidPermission(perm)) {
        return NextResponse.json(
          { ok: false, error: `Invalid permission: ${perm}` },
          { status: 400 },
        );
      }
    }
    // Expand all permissions at once
    expandPermissions(body.permissions).forEach((p) => expandedPerms.add(p));

    updateCorrelationContext({ orgId, userId });

    const supabase = getSupabaseAdmin() as any;

    // Check if role name already exists
    const existingResult = await supabase
      .from('org_rbac_roles')
      .select('id')
      .eq('org_id', orgId)
      .eq('name', body.name)
      .single();

    if (existingResult.data?.id) {
      return NextResponse.json(
        { ok: false, error: 'Role with this name already exists' },
        { status: 409 },
      );
    }

    // Create role
    const createResult = await supabase
      .from('org_rbac_roles')
      .insert({
        org_id: orgId,
        name: body.name,
        permissions: Array.from(expandedPerms),
        description: body.description,
        is_custom: true,
      })
      .select();

    if (createResult.error) {
      console.error('[role-create] Error:', createResult.error);
      return NextResponse.json({ ok: false, error: 'Failed to create role' }, { status: 500 });
    }

    const role = createResult.data[0];

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'role_created',
      resource_type: 'rbac',
      resource_id: role.id,
      actor_id: userId,
      actor_email: userId,
      result: 'success',
      correlation_id: correlationId,
      severity: 'WARN',
      message: `Created role '${role.name}' with ${role.permissions.length} permissions`,
    });

    return NextResponse.json({
      ok: true,
      role: {
        id: role.id,
        name: role.name,
        permissions: role.permissions,
        description: role.description,
        is_custom: role.is_custom,
        created_at: role.created_at,
      },
    });
  } catch (error) {
    console.error('[role-create] Exception:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
