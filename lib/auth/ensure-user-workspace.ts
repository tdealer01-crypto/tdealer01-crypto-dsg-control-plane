type RpcResult = {
  data: unknown;
  error: { message?: string } | null;
};

type SupabaseAdminLoose = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<RpcResult>;
  from: (table: string) => any;
};

export type EnsuredWorkspaceProfile = {
  id?: string | null;
  auth_user_id: string;
  email: string | null;
  org_id: string;
  is_active: boolean;
};

export type EnsureUserWorkspaceResult =
  | { ok: true; profile: EnsuredWorkspaceProfile; bootstrapped: boolean }
  | { ok: false; status: number; error: string };

export type EnsureUserWorkspaceSuccess = Extract<EnsureUserWorkspaceResult, { ok: true }>;
export type EnsureUserWorkspaceFailure = Extract<EnsureUserWorkspaceResult, { ok: false }>;

export function isWorkspaceFailure(
  result: EnsureUserWorkspaceResult
): result is EnsureUserWorkspaceFailure {
  return result.ok === false;
}

function errorMessage(error: unknown) {
  return String((error as { message?: string } | null)?.message || 'unknown error');
}

function inactiveWorkspaceFailure(): EnsureUserWorkspaceFailure {
  return { ok: false, status: 403, error: 'ACCOUNT_INACTIVE' };
}

export async function ensureUserWorkspace(
  admin: unknown,
  input: { authUserId: string; email?: string | null }
): Promise<EnsureUserWorkspaceResult> {
  if (!input.authUserId) {
    return { ok: false, status: 401, error: 'missing_auth_user' };
  }

  const client = admin as SupabaseAdminLoose;

  // Never use workspace/bootstrap as an implicit account-reactivation path.
  // Existing identity state is authoritative; only a dedicated reactivation
  // workflow may change is_active from false to true.
  const { data: existingProfile, error: existingProfileError } = await client
    .from('users')
    .select('id, auth_user_id, email, org_id, is_active')
    .eq('auth_user_id', input.authUserId)
    .maybeSingle();

  if (existingProfileError) {
    return {
      ok: false,
      status: 500,
      error: `workspace_profile_lookup_failed: ${errorMessage(existingProfileError)}`,
    };
  }

  if (existingProfile && existingProfile.is_active !== true) {
    return inactiveWorkspaceFailure();
  }

  if (existingProfile?.org_id) {
    return {
      ok: true,
      bootstrapped: false,
      profile: {
        id: existingProfile.id || null,
        auth_user_id: String(existingProfile.auth_user_id || input.authUserId),
        email: (existingProfile.email || input.email || null) as string | null,
        org_id: String(existingProfile.org_id),
        is_active: true,
      },
    };
  }

  const { data: ensuredOrgId, error: rpcError } = await client.rpc(
    'dsg_ensure_workspace_for_auth_user',
    {
      p_auth_user_id: input.authUserId,
      p_email: input.email || null,
    }
  );

  if (rpcError || !ensuredOrgId) {
    if (errorMessage(rpcError).includes('ACCOUNT_INACTIVE')) {
      return inactiveWorkspaceFailure();
    }
    return {
      ok: false,
      status: 500,
      error: `workspace_bootstrap_failed: ${errorMessage(rpcError)}`,
    };
  }

  const { data: profile, error: profileError } = await client
    .from('users')
    .select('id, auth_user_id, email, org_id, is_active')
    .eq('auth_user_id', input.authUserId)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      status: 500,
      error: `workspace_profile_lookup_failed: ${errorMessage(profileError)}`,
    };
  }

  if (profile && profile.is_active !== true) {
    return inactiveWorkspaceFailure();
  }

  const orgId = String(profile?.org_id || ensuredOrgId || '');
  if (!orgId) {
    return { ok: false, status: 500, error: 'workspace_bootstrap_missing_org_id' };
  }

  // Parent organization must exist before the profile can be treated as a
  // usable tenant. This turns best-effort org creation into a fail-closed
  // boundary at the application layer as well as the database layer.
  const { data: organization, error: organizationError } = await client
    .from('organizations')
    .select('id')
    .eq('id', orgId)
    .maybeSingle();

  if (organizationError || !organization?.id) {
    return {
      ok: false,
      status: 500,
      error: `workspace_bootstrap_missing_organization: ${errorMessage(organizationError)}`,
    };
  }

  return {
    ok: true,
    bootstrapped: true,
    profile: {
      id: profile?.id || null,
      auth_user_id: String(profile?.auth_user_id || input.authUserId),
      email: (profile?.email || input.email || null) as string | null,
      org_id: orgId,
      is_active: true,
    },
  };
}
