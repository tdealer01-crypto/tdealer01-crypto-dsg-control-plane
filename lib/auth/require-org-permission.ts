import { createClient } from '../supabase/server';
import { getSupabaseAdmin } from '../supabase-server';
import { hasOrgPermission, normalizeOrgRole, type OrgPermission, type OrgRole } from './rbac';

export type OrgPermissionContext = {
  ok: true;
  orgId: string;
  userId: string;
  authUserId: string;
  email: string;
  role: OrgRole;
};

export type OrgPermissionDenied = {
  ok: false;
  status: 401 | 403;
  error: string;
};

export async function requireOrgPermission(permission: OrgPermission): Promise<OrgPermissionContext | OrgPermissionDenied> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  };
}
