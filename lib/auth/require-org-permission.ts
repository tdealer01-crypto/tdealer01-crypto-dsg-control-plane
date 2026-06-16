import { headers } from 'next/headers';
import { createClient } from '../supabase/server';
import { getSupabaseAdmin } from '../supabase-server';
import { requireInternalService, type InternalServiceIdentity } from './internal-service';
import { hasOrgPermission, normalizeOrgRole, type OrgPermission, type OrgRole } from './rbac';

export type OrgPermissionContext = {
  ok: true;
  orgId: string;
  userId?: string;
  authUserId?: string;
  email?: string;
  role: OrgRole;
  actorType: 'user' | 'agent';
  agentId?: string;
};

export type OrgPermissionDenied = {
  ok: false;
  status: 401 | 403;
  error: string;
};

async function resolveUserFromRequest() {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get('authorization') || '';
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);

  if (bearerMatch?.[1]) {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
    } = await admin.auth.getUser(bearerMatch[1]);
    return user;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireOrgPermission(permission: OrgPermission): Promise<OrgPermissionContext | OrgPermissionDenied> {
  const req = new Request('http://localhost', {
    headers: await headers(),
  });

  // Try agent access first
  const agentAccess = requireInternalService(req);
  if (agentAccess.ok) {
    return checkAgentPermission(agentAccess, permission);
  }

  // Fall back to user access
  const user = await resolveUserFromRequest();
  if (!user?.id || !user.email) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const admin = getSupabaseAdmin();
  const { data: profile, error } = await admin
    .from('users')
    .select('id, org_id, role, is_active, email')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error || !profile?.id || !profile.org_id || !profile.is_active) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  const role = normalizeOrgRole(profile.role);
  if (!hasOrgPermission(role, permission)) {
    return { ok: false, status: 403, error: 'Insufficient permission' };
  }

  return {
    ok: true,
    orgId: String(profile.org_id),
    userId: String(profile.id),
    authUserId: String(user.id),
    email: String(profile.email || user.email).toLowerCase(),
    role,
    actorType: 'user',
  };
}

/**
 * Check if agent has required permission
 */
async function checkAgentPermission(
  agentAccess: InternalServiceIdentity,
  permission: OrgPermission,
): Promise<OrgPermissionContext | OrgPermissionDenied> {
  if (!agentAccess.agentId) {
    return { ok: false, status: 403, error: 'Agent ID required' };
  }

  const admin = getSupabaseAdmin();

  // Get agent's default role (fallback to 'operator' for most agents)
  // Note: TypeScript types will be updated after migration
  const { data: agentPerms } = await admin
    .from('agent_permissions' as any)
    .select('permissions, default_role')
    .eq('org_id', agentAccess.orgId)
    .eq('agent_id', agentAccess.agentId)
    .maybeSingle();

  // If no explicit permissions, use default role-based permissions
  let hasPermission = false;
  const perms = agentPerms as any;
  if (perms?.permissions?.length > 0) {
    hasPermission = perms.permissions.includes(permission);
  } else {
    // Fallback: check default role
    const role = normalizeOrgRole(perms?.default_role ?? 'operator');
    hasPermission = hasOrgPermission(role, permission);
  }

  if (!hasPermission) {
    return { ok: false, status: 403, error: 'Agent lacks permission' };
  }

  return {
    ok: true,
    orgId: agentAccess.orgId,
    agentId: agentAccess.agentId,
    role: normalizeOrgRole((agentPerms as any)?.default_role ?? 'operator'),
    actorType: 'agent',
  };
}
