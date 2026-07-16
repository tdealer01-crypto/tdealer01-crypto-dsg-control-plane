import { createClient } from './supabase/server';
import { getSupabaseAdmin } from './supabase-server';
import { isMissingRelationError } from './supabase/resolve-policy';
import { internalErrorMessage, logApiError } from './security/api-error';

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

export async function requireOrgRole(requiredRoles: RuntimeRole[], req?: Request){
 try {
  let userId: string | null = null;

  // First, check if middleware set JWT user info in headers
  if (req && req.headers) {
    userId = req.headers.get('x-user-id') || null;
  }

  // Fall back to session-based auth if no JWT
  if (!userId) {
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

    userId = user.id;
  }

  if (!userId) {
    return {
      ok: false as const,
      status: 401,
      error: 'Unauthorized',
    };
  }

  let admin: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof getSupabaseAdmin>;
  try {
    admin = getSupabaseAdmin();
  } catch {
    // Fallback for deployments that only expose public Supabase keys.
    admin = await createClient();
  }

  // runtime_roles.user_id references public.users.id, NOT auth.users.id.
  // Map auth.users.id -> public.users.id first.
  const profile = await admin
    .from('users')
    .select('id, org_id, is_active, role')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (profile.error) {
    logApiError('lib/authz/requireOrgRole:profile', profile.error);
    return {
      ok: false as const,
      status: 500,
      error: internalErrorMessage(),
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
        authUserId: String(userId),
        grantedRoles: fallbackList,
      };
    }

    logApiError('lib/authz/requireOrgRole:runtime_roles', runtimeRolesResult.error);
    return {
      ok: false as const,
      status: 500,
      error: internalErrorMessage(),
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
    authUserId: String(userId),
    grantedRoles: effectiveRolesList as RuntimeRole[],
  };
 } catch (error) {
  // Fail closed: any failure to construct the Supabase client or resolve the
  // session (e.g. missing env, network error) must deny access, never 500.
  logApiError('lib/authz/requireOrgRole', error);
  return {
    ok: false as const,
    status: 401,
    error: 'Unauthorized',
  };
 }
}
