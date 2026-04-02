import { getSupabaseAdmin } from '../supabase-server';
import { getDirectorySyncConfig, logDirectorySyncEvent } from './directory-sync';

const ROLE_ORDER = ['owner', 'admin', 'operator', 'viewer'] as const;

type MemberRole = (typeof ROLE_ORDER)[number] | 'guest_auditor';

export async function mapExternalGroupsToRole(orgId: string, externalGroupIds: string[]) {
  if (!externalGroupIds.length) return null;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('directory_group_role_mappings')
    .select('external_group_id, target_role')
    .eq('org_id', orgId)
    .in('external_group_id', externalGroupIds);

  if (error) throw error;
  if (!data?.length) return null;

  const sorted = [...data].sort(
    (a, b) => ROLE_ORDER.indexOf(a.target_role as (typeof ROLE_ORDER)[number]) - ROLE_ORDER.indexOf(b.target_role as (typeof ROLE_ORDER)[number]),
  );
  return sorted[0]?.target_role ?? null;
}

export async function applyDirectoryRoleMapping(input: { orgId: string; userId: string; currentRole: string | null; mappedRole: string | null }) {
  if (!input.mappedRole || input.currentRole === 'owner') return { updated: false, role: input.currentRole };

  const admin = getSupabaseAdmin();
  await admin.from('users').update({ role: input.mappedRole, updated_at: new Date().toISOString() }).eq('id', input.userId).eq('org_id', input.orgId);
  await logDirectorySyncEvent({ orgId: input.orgId, eventType: 'group_mapping_applied', payload: { user_id: input.userId, mapped_role: input.mappedRole } });
  return { updated: true, role: input.mappedRole };
}

export async function upsertMemberFromIdentityClaims(input: {
  orgId: string;
  email: string;
  authUserId: string;
  externalUserId?: string | null;
  fullName?: string | null;
  externalGroupIds?: string[];
}) {
  const config = await getDirectorySyncConfig(input.orgId);
  if (!config?.is_enabled) return { created: false, userId: null, role: null, reason: 'jit-disabled' as const };

  const admin = getSupabaseAdmin();
  const email = input.email.toLowerCase();
  const { data: existing, error } = await admin.from('users').select('id, role, org_id, email').eq('org_id', input.orgId).eq('email', email).maybeSingle();
  if (error) throw error;

  let userId = existing?.id ?? null;
  let role: MemberRole = (existing?.role as MemberRole) ?? 'viewer';
  let created = false;

  if (!existing) {
    const inserted = await admin
      .from('users')
      .insert({ org_id: input.orgId, email, auth_user_id: input.authUserId, role: 'viewer', auth_provider: 'sso', is_active: true })
      .select('id, role')
      .single();
    if (inserted.error) throw inserted.error;
    userId = inserted.data.id;
    role = inserted.data.role as MemberRole;
    created = true;
    await logDirectorySyncEvent({ orgId: input.orgId, eventType: 'jit_provision', email, externalUserId: input.externalUserId ?? null, payload: { full_name: input.fullName ?? null } });
  } else {
    await admin.from('users').update({ auth_user_id: input.authUserId, is_active: true, updated_at: new Date().toISOString() }).eq('id', existing.id);
    await logDirectorySyncEvent({ orgId: input.orgId, eventType: 'jit_update', email, externalUserId: input.externalUserId ?? null });
  }

  if (role === 'guest_auditor') return { created, userId, role, reason: 'guest-not-jit' as const };

  if (config.group_sync_enabled && input.externalGroupIds?.length) {
    const mappedRole = await mapExternalGroupsToRole(input.orgId, input.externalGroupIds);
    const mapping = await applyDirectoryRoleMapping({ orgId: input.orgId, userId: String(userId), currentRole: role, mappedRole });
    role = (mapping.role as MemberRole) ?? role;
  }

  return { created, userId, role, reason: 'ok' as const };
}
