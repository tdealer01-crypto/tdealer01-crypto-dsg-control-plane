import { getSupabaseAdmin } from '../supabase-server';

export type GuestScope = {
  reports?: boolean;
  evidence?: boolean;
  executions?: string[];
};

export type GuestAccessGrant = {
  id: string;
  org_id: string;
  email: string;
  role: 'guest_auditor';
  scope: GuestScope;
  expires_at: string | null;
  status: 'active' | 'expired' | 'revoked';
};

export function isGuestGrantExpired(grant: { expires_at: string | null }): boolean {
  if (!grant.expires_at) return false;
  return new Date(grant.expires_at).getTime() <= Date.now();
}

export async function getActiveGuestGrantForEmail(orgId: string, email: string): Promise<GuestAccessGrant | null> {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!orgId || !normalizedEmail) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('guest_access_grants')
    .select('id, org_id, email, role, scope, expires_at, status')
    .eq('org_id', orgId)
    .eq('email', normalizedEmail)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  if (isGuestGrantExpired(data)) return null;

  return {
    ...data,
    scope: (data.scope || {}) as GuestScope,
  } as GuestAccessGrant;
}

export function canGuestAccessResource(grant: Pick<GuestAccessGrant, 'scope' | 'status' | 'expires_at'>, resource: 'reports' | 'evidence' | 'executions'): boolean {
  if (!grant || grant.status !== 'active' || isGuestGrantExpired(grant)) {
    return false;
  }

  if (resource === 'executions') {
    return false;
  }

  if (resource === 'reports') {
    return grant.scope?.reports === true;
  }

  return grant.scope?.evidence === true;
}
