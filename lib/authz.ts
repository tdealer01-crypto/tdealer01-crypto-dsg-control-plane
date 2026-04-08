import { createClient } from './supabase/server';

export type RuntimeRole = 'org_admin' | 'operator' | 'reviewer' | 'runtime_auditor' | 'billing_admin';

type RoleRow = { role?: unknown };

function mapOrgRoleToRuntimeRole(role: string): RuntimeRole | null {
  const normalized = role.trim().toLowerCase();
  if (normalized === 'owner' || normalized === 'admin') return 'org_admin';
  if (normalized === 'operator') return 'operator';
  if (normalized === 'reviewer' || normalized === 'viewer') return 'reviewer';
  if (normalized === 'runtime_auditor' || normalized === 'auditor') return 'runtime_auditor';
  if (normalized === 'billing' || normalized === 'billing_admin') return 'billing_admin';
  return null;
}

function hasMissingRelationError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = String((error as { message?: unknown }).message || '').toLowerCase();
  return message.includes('does not exist') || message.includes('undefined table') || message.includes('relation');
}

function collectRoles(rows: RoleRow[] | null | undefined): Set<RuntimeRole> {
  const out = new Set<RuntimeRole>();
  for (const row of rows || []) {
    const mapped = mapOrgRoleToRuntimeRole(String(row.role || ''));
    if (mapped) out.add(mapped);
  }
  return out;
}

export async function requireOrgRole(roles: RuntimeRole[]) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false as const, status: 401, error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('users')
    .select('id, org_id, is_active, role')
    .eq('auth_user_id', auth.user.id)
    .maybeSingle();

  if (!profile?.org_id || !profile.is_active) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }

  let granted = new Set<RuntimeRole>();

  const { data: runtimeRoleRows, error: runtimeRoleError } = await supabase
    .from('runtime_roles')
    .select('role')
    .eq('org_id', profile.org_id)
    .eq('user_id', profile.id);

  if (!runtimeRoleError) {
    granted = collectRoles(runtimeRoleRows as RoleRow[]);
  } else if (hasMissingRelationError(runtimeRoleError)) {
    const fallbackRows: RoleRow[] = [];

    const { data: userOrgRoleRows, error: userOrgRoleError } = await supabase
      .from('user_org_roles')
      .select('role')
      .eq('org_id', profile.org_id)
      .eq('user_id', profile.id);

    if (!userOrgRoleError) {
      fallbackRows.push(...((userOrgRoleRows || []) as RoleRow[]));
    }

    if (profile.role) {
      fallbackRows.push({ role: profile.role });
    }

    granted = collectRoles(fallbackRows);
  }

  const hasRole = roles.some((role) => granted.has(role));
  if (!hasRole) {
    return { ok: false as const, status: 403, error: 'Insufficient role', orgId: String(profile.org_id), userId: String(profile.id) };
  }

  return { ok: true as const, orgId: String(profile.org_id), userId: String(profile.id), grantedRoles: Array.from(granted) };
}
