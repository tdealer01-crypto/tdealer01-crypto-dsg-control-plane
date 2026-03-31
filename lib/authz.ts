import { createClient } from './supabase/server';

export type RuntimeRole = 'org_admin' | 'operator' | 'reviewer' | 'runtime_auditor' | 'billing_admin';

export async function requireOrgRole(roles: RuntimeRole[]) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false as const, status: 401, error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('users')
    .select('id, org_id, is_active')
    .eq('auth_user_id', auth.user.id)
    .maybeSingle();

  if (!profile?.org_id || !profile.is_active) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }

  const { data: roleRows } = await supabase
    .from('runtime_roles')
    .select('role')
    .eq('org_id', profile.org_id)
    .eq('user_id', profile.id);

  const granted = new Set((roleRows || []).map((r) => String(r.role)));
  const hasRole = roles.some((role) => granted.has(role));
  if (!hasRole) {
    return { ok: false as const, status: 403, error: 'Insufficient role', orgId: String(profile.org_id), userId: String(profile.id) };
  }

  return { ok: true as const, orgId: String(profile.org_id), userId: String(profile.id), grantedRoles: Array.from(granted) };
}
