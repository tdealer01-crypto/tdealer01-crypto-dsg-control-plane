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

function errorMessage(error: unknown) {
  return String((error as { message?: string } | null)?.message || 'unknown error');
}

export async function ensureUserWorkspace(
  admin: unknown,
  input: { authUserId: string; email?: string | null }
): Promise<EnsureUserWorkspaceResult> {
  if (!input.authUserId) {
    return { ok: false, status: 401, error: 'missing_auth_user' };
  }

  const client = admin as SupabaseAdminLoose;

  const { data: ensuredOrgId, error: rpcError } = await client.rpc(
    'dsg_ensure_workspace_for_auth_user',
    {
      p_auth_user_id: input.authUserId,
      p_email: input.email || null,
    }
  );

  if (rpcError || !ensuredOrgId) {
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

  const orgId = String(profile?.org_id || ensuredOrgId || '');
  if (!orgId) {
    return { ok: false, status: 500, error: 'workspace_bootstrap_missing_org_id' };
  }

  return {
    ok: true,
    bootstrapped: !profile?.org_id || profile?.is_active !== true,
    profile: {
      id: profile?.id || null,
      auth_user_id: String(profile?.auth_user_id || input.authUserId),
      email: (profile?.email || input.email || null) as string | null,
      org_id: orgId,
      is_active: true,
    },
  };
}
