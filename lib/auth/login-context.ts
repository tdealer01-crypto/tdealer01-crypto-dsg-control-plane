import { getSsoDisplayState, getOrgSsoConfig } from './sso-config';
import { getSupabaseAdmin } from '../supabase-server';

export async function resolveLoginContext({ email, orgSlug }: { email?: string; orgSlug?: string }) {
  const admin = getSupabaseAdmin();
  let org: { id: string; slug: string; name: string; status: string | null } | null = null;

  if (orgSlug) {
    const { data, error } = await admin.from('organizations').select('id, slug, name, status').eq('slug', orgSlug).maybeSingle();
    if (error) throw error;
    org = data;
  } else if (email) {
    const { data, error } = await admin.from('users').select('org_id').eq('email', email.toLowerCase()).eq('is_active', true).not('org_id', 'is', null).limit(1);
    if (error) throw error;
    const orgId = Array.isArray(data) && data.length === 1 ? data[0]?.org_id : null;
    if (orgId) {
      const resolved = await admin.from('organizations').select('id, slug, name, status').eq('id', orgId).maybeSingle();
      if (resolved.error) throw resolved.error;
      org = resolved.data;
    }
  }

  if (!org?.id) return { mode: 'standard' as const, org: null, ssoConfig: null, approvalRequired: false };

  const ssoConfig = await getOrgSsoConfig(org.id);
  const ssoDisplay = await getSsoDisplayState(org.id);
  const approvalRequired = org.status !== 'active';
  if (approvalRequired) return { mode: 'approval-required' as const, org, ssoConfig, approvalRequired };

  return { mode: ssoDisplay.mode, org, ssoConfig, approvalRequired };
}
