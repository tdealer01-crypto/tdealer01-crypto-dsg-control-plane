import { randomUUID } from 'crypto';

type SupabaseAdminLike = {
  from: (table: string) => any;
};

export type EnsuredWorkspaceProfile = {
  user_id?: string | null;
  auth_user_id: string;
  email: string | null;
  org_id: string;
  is_active: boolean;
  role?: string | null;
};

function workspaceName(email: string | null) {
  return email ? `${email} Workspace` : 'DSG Owner Workspace';
}

function ignorableSchemaError(error: unknown) {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return (
    message.includes('could not find') ||
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('column')
  );
}

async function bestEffortUpsert(admin: SupabaseAdminLike, table: string, payload: Record<string, unknown>, onConflict: string) {
  const { error } = await admin.from(table).upsert(payload, { onConflict });
  if (error && !ignorableSchemaError(error)) {
    return { ok: false as const, error };
  }
  return { ok: true as const };
}

export async function ensureUserWorkspace(
  admin: SupabaseAdminLike,
  input: { authUserId: string; email?: string | null }
): Promise<
  | { ok: true; profile: EnsuredWorkspaceProfile; created: boolean }
  | { ok: false; status: number; error: string }
> {
  const email = input.email || null;

  const { data: existing, error: readError } = await admin
    .from('users')
    .select('id, auth_user_id, email, org_id, is_active, role')
    .eq('auth_user_id', input.authUserId)
    .maybeSingle();

  if (readError && !ignorableSchemaError(readError)) {
    return { ok: false, status: 500, error: `profile_lookup_failed: ${readError.message}` };
  }

  const orgId = existing?.org_id || randomUUID();
  const resolvedEmail = existing?.email || email;

  const orgPayload = {
    id: orgId,
    name: workspaceName(resolvedEmail),
    plan: 'trial',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  for (const table of ['organizations', 'orgs']) {
    const result = await bestEffortUpsert(admin, table, orgPayload, 'id');
    if (!result.ok) {
      return { ok: false, status: 500, error: `org_bootstrap_failed: ${result.error.message}` };
    }
  }

  let userId = existing?.id || null;

  if (existing) {
    const updatePayload: Record<string, unknown> = {
      org_id: orgId,
      is_active: true,
    };

    if (!existing.email && resolvedEmail) updatePayload.email = resolvedEmail;
    if (!existing.role) updatePayload.role = 'owner';

    const { error: updateError } = await admin
      .from('users')
      .update(updatePayload)
      .eq('auth_user_id', input.authUserId);

    if (updateError) {
      return { ok: false, status: 500, error: `profile_update_failed: ${updateError.message}` };
    }
  } else {
    const { data: inserted, error: insertError } = await admin
      .from('users')
      .insert({
        auth_user_id: input.authUserId,
        email: resolvedEmail,
        org_id: orgId,
        is_active: true,
        role: 'owner',
      })
      .select('id')
      .maybeSingle();

    if (insertError) {
      return { ok: false, status: 500, error: `profile_insert_failed: ${insertError.message}` };
    }

    userId = inserted?.id || null;
  }

  if (userId) {
    await bestEffortUpsert(
      admin,
      'user_org_roles',
      {
        org_id: orgId,
        user_id: userId,
        role: 'owner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      'org_id,user_id,role'
    );

    await bestEffortUpsert(
      admin,
      'runtime_roles',
      {
        org_id: orgId,
        user_id: userId,
        role: 'org_admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      'org_id,user_id,role'
    );
  }

  return {
    ok: true,
    created: !existing || !existing.org_id || !existing.is_active,
    profile: {
      user_id: userId,
      auth_user_id: input.authUserId,
      email: resolvedEmail,
      org_id: orgId,
      is_active: true,
      role: existing?.role || 'owner',
    },
  };
}
