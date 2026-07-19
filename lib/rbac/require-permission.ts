/**
 * RBAC Permission Middleware
 *
 * Provides utilities for enforcing RBAC permissions on API routes.
 * Used in middleware and route handlers to check user permissions.
 */

import { hasPermission, expandPermissions } from './permission-matrix';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCorrelationId } from '@/lib/audit/correlation-context';

export interface PermissionCheckResult {
  ok: boolean;
  error?: string;
  userPermissions?: string[];
  roleId?: string;
  roleName?: string;
}

/**
 * Get user's permissions for an organization
 * @param userId User ID
 * @param orgId Organization ID
 * @returns Expanded list of user's permissions
 */
export async function getUserPermissions(userId: string, orgId: string): Promise<PermissionCheckResult> {
  try {
    const supabase = getSupabaseAdmin() as any;

    // Get user's role in the organization
    const roleResult = await supabase
      .from('user_org_roles')
      .select('rbac_role_id, role_name')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .single();

    if (roleResult.error) {
      console.error('[rbac-get-permissions] Error fetching role:', roleResult.error);
      return { ok: false, error: 'User not found in organization' };
    }

    const { rbac_role_id: roleId, role_name: roleName } = roleResult.data;

    // If using new RBAC system, get permissions from org_rbac_roles
    if (roleId) {
      const permissionResult = await supabase
        .from('org_rbac_roles')
        .select('name, permissions')
        .eq('id', roleId)
        .single();

      if (permissionResult.error) {
        console.error('[rbac-get-permissions] Error fetching role permissions:', permissionResult.error);
        return { ok: false, error: 'Role permissions not found' };
      }

      const permissions = expandPermissions(permissionResult.data.permissions || []);
      return { ok: true, userPermissions: permissions, roleId, roleName: permissionResult.data.name };
    }

    // Legacy: map role_name to default permissions
    const legacyPermissions = mapLegacyRoleToPermissions(roleName);
    return { ok: true, userPermissions: legacyPermissions, roleName };
  } catch (error) {
    console.error('[rbac-get-permissions] Exception:', error);
    return { ok: false, error: `Failed to get permissions: ${String(error).slice(0, 100)}` };
  }
}

/**
 * Check if user has required permission
 * @param userId User ID
 * @param orgId Organization ID
 * @param requiredPermission Required permission string (e.g., "read:audit", "write:api-keys")
 * @returns PermissionCheckResult
 */
export async function checkPermission(
  userId: string,
  orgId: string,
  requiredPermission: string,
): Promise<PermissionCheckResult> {
  const permResult = await getUserPermissions(userId, orgId);

  if (!permResult.ok) {
    return permResult;
  }

  if (!hasPermission(permResult.userPermissions || [], requiredPermission)) {
    return {
      ok: false,
      error: `Permission denied: ${requiredPermission}`,
      userPermissions: permResult.userPermissions,
    };
  }

  return permResult;
}

/**
 * Check multiple permissions (any match required)
 * @param userId User ID
 * @param orgId Organization ID
 * @param requiredPermissions Array of required permissions (at least one must match)
 * @returns PermissionCheckResult
 */
export async function checkAnyPermission(
  userId: string,
  orgId: string,
  requiredPermissions: string[],
): Promise<PermissionCheckResult> {
  const permResult = await getUserPermissions(userId, orgId);

  if (!permResult.ok) {
    return permResult;
  }

  const hasAny = requiredPermissions.some((perm) => hasPermission(permResult.userPermissions || [], perm));

  if (!hasAny) {
    return {
      ok: false,
      error: `Permission denied: requires one of [${requiredPermissions.join(', ')}]`,
      userPermissions: permResult.userPermissions,
    };
  }

  return permResult;
}

/**
 * Check multiple permissions (all required)
 * @param userId User ID
 * @param orgId Organization ID
 * @param requiredPermissions Array of required permissions (all must match)
 * @returns PermissionCheckResult
 */
export async function checkAllPermissions(
  userId: string,
  orgId: string,
  requiredPermissions: string[],
): Promise<PermissionCheckResult> {
  const permResult = await getUserPermissions(userId, orgId);

  if (!permResult.ok) {
    return permResult;
  }

  const allPresent = requiredPermissions.every((perm) => hasPermission(permResult.userPermissions || [], perm));

  if (!allPresent) {
    return {
      ok: false,
      error: `Permission denied: requires all of [${requiredPermissions.join(', ')}]`,
      userPermissions: permResult.userPermissions,
    };
  }

  return permResult;
}

/**
 * Map legacy role_name strings to permission arrays
 * @param roleName Legacy role name (free, pro, enterprise, admin, operator, viewer)
 * @returns Array of permissions for this role
 */
function mapLegacyRoleToPermissions(roleName: string): string[] {
  const roleMap: Record<string, string[]> = {
    admin: [
      '*', // All permissions
    ],
    operator: [
      'read:*',
      'write:api-keys',
      'delete:api-keys',
      'write:webhooks',
      'delete:webhooks',
      'write:notifications',
      'export:audit',
    ],
    viewer: ['read:*'],
    free: ['read:usage', 'execute:gates', 'execute:proofs'],
    pro: ['read:*', 'execute:gates', 'execute:proofs', 'export:audit'],
    enterprise: ['*'],
  };

  return roleMap[roleName] || ['read:*'];
}

/**
 * Format permission check result for response
 * @param result Permission check result
 * @returns Object suitable for API response
 */
export function formatPermissionError(result: PermissionCheckResult) {
  return {
    ok: false,
    error: 'permission_denied',
    message: result.error,
  };
}

/**
 * Verify org membership and get org_id
 * @param userId User ID
 * @param orgId Organization ID (from request)
 * @returns { ok: boolean, orgId?: string }
 */
export async function verifyOrgMembership(userId: string, orgId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin() as any;

    const result = await supabase
      .from('user_org_roles')
      .select('org_id')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .single();

    if (result.error) {
      return { ok: false, error: 'User not a member of this organization' };
    }

    return { ok: true };
  } catch (error) {
    console.error('[rbac-verify-org] Exception:', error);
    return { ok: false, error: 'Failed to verify organization membership' };
  }
}

/**
 * High-order function to wrap API route handlers with permission checking
 * @param handler Route handler function
 * @param requiredPermission Required permission
 * @returns Wrapped handler
 */
export function withPermissionCheck(
  handler: (req: any, params?: any) => Promise<Response>,
  requiredPermission: string,
) {
  return async (req: Request, params?: any) => {
    // Extract auth info from request context (set by middleware)
    const userId = (req as any).userId;
    const orgId = (req as any).orgId;

    if (!userId || !orgId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'authentication_required', message: 'User not authenticated' }),
        { status: 401 },
      );
    }

    const permResult = await checkPermission(userId, orgId, requiredPermission);
    if (!permResult.ok) {
      return new Response(JSON.stringify(formatPermissionError(permResult)), { status: 403 });
    }

    // Attach permission info to request for handler use
    (req as any).userPermissions = permResult.userPermissions;
    (req as any).roleName = permResult.roleName;

    return handler(req, params);
  };
}
