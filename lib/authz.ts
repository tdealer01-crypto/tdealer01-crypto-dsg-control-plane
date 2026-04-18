import { createClient } from './supabase/server';
import { getSupabaseAdmin } from './supabase-server';
import { isMissingRelationError } from './supabase/resolve-policy';

export type RuntimeRole = 'org_admin' | 'operator' | 'reviewer' | 'runtime_auditor' | 'billing_admin';

function includesRequiredRole(userRoles: string[], requiredRoles: string[]) {
  return requiredRoles.some((role) => userRoles.includes(role));
}

function isMissingRuntimeRolesError(error: { message?: string; code?: string | null }) {
  if (error.code === 'PGRST205') return true;
  if (isMissingRelationError(error)) return true;

  const message = String(error.message || '').toLowerCase();
  return (
    message.includes('schema cache') &&
    message.includes('runtime_roles')
  );
}

export async function requireOrgRole(requiredRoles: RuntimeRole[]){
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return {
      ok: false as const,
      status: 401,
      error: 'Unauthorized',
    };
  }

  const admin = getSupabaseAdmin();

  // runtime_roles.user_id references public.users.id, NOT auth.users.id.
  // Map auth.users.id -> public.users.id first.
  const profile = await admin
    .from('users')
    .select('id, org_id, is_active, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profile.error) {
    return {
      ok: false as const,
      status: 500,
      error: profile.error.message,
    };
  }

  if (!profile.data?.id || !profile.data?.org_id || !profile.data?.is_active) {
    return {
      ok: false as const,
      status: 401,
      error: 'Unauthorized',
    };
  }

  const appUserId = String(profile.data.id);
  const orgId = String(profile.data.org_id);
  const baseRole = String(profile.data.role || '').trim().toLowerCase();

  const runtimeRolesResult = await admin
    .from('runtime_roles')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', appUserId);

  if (runtimeRolesResult.error) {
    if (isMissingRuntimeRolesError(runtimeRolesResult.error)) {
      const fallbackRoles = new Set<RuntimeRole>();

      if (baseRole === 'owner' || baseRole === 'admin') {
        fallbackRoles.add('org_admin');
        fallbackRoles.add('operator');
        fallbackRoles.add('reviewer');
        fallbackRoles.add('runtime_auditor');
        fallbackRoles.add('billing_admin');
      } else if (baseRole === 'viewer' || baseRole === 'guest_auditor') {
        fallbackRoles.add('reviewer');
      } else if (
        baseRole === 'operator' ||
        baseRole === 'reviewer' ||
        baseRole === 'runtime_auditor' ||
        baseRole === 'billing_admin'
      ) {
        fallbackRoles.add(baseRole);
      }

      const fallbackList = Array.from(fallbackRoles);
      if (!includesRequiredRole(fallbackList, requiredRoles)) {
        return {
          ok: false as const,
          status: 403,
          error: 'Forbidden',
        };
      }

      return {
        ok: true as const,
        orgId,
        userId: appUserId,
        authUserId: String(user.id),
        grantedRoles: fallbackList,
      };
    }

    return {
      ok: false as const,
      status: 500,
      error: runtimeRolesResult.error.message,
    };
  }

  const runtimeRoles = (runtimeRolesResult.data ?? [])
    .map((row) => String(row.role))
    .filter((role): role is RuntimeRole => {
      return role === 'org_admin' || role === 'operator' || role === 'reviewer' || role === 'runtime_auditor' || role === 'billing_admin';
    });

  // Bootstrap fallback for first-run seed state.
  const effectiveRoles = new Set<string>(runtimeRoles);

  if (baseRole === 'owner' || baseRole === 'admin') {
    effectiveRoles.add('org_admin');
    effectiveRoles.add('operator');
    effectiveRoles.add('reviewer');
    effectiveRoles.add('runtime_auditor');
    effectiveRoles.add('billing_admin');
  }

  if (baseRole === 'viewer' || baseRole === 'guest_auditor') {
    effectiveRoles.add('reviewer');
  }

  const effectiveRolesList = Array.from(effectiveRoles);

  if (!includesRequiredRole(effectiveRolesList, requiredRoles)) {
    return {
      ok: false as const,
      status: 403,
      error: 'Forbidden',
    };
  }

  return {
    ok: true as const,
    orgId,
    userId: appUserId,
    authUserId: String(user.id),
    grantedRoles: effectiveRolesList as RuntimeRole[],
  };
}
