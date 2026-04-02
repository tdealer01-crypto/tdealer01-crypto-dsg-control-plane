import { getSupabaseAdmin } from '../supabase-server';

export type SsoProvider = 'generic_saml' | 'workos';

type OrgSsoConfig = {
  org_id: string;
  provider: SsoProvider;
  connection_id: string | null;
  display_name: string | null;
  login_hint: string | null;
  is_enabled: boolean;
  enforce_sso: boolean;
  break_glass_email_login_enabled: boolean;
  metadata: Record<string, unknown>;
};

export async function getOrgSsoConfig(orgId: string): Promise<OrgSsoConfig | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('org_sso_configs')
    .select('org_id, provider, connection_id, display_name, login_hint, is_enabled, enforce_sso, break_glass_email_login_enabled, metadata')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) throw error;
  return (data as OrgSsoConfig | null) ?? null;
}

export async function orgRequiresSso(orgId: string) {
  const config = await getOrgSsoConfig(orgId);
  return Boolean(config?.is_enabled && config?.enforce_sso);
}

export async function canUseBreakGlassEmailLogin(orgId: string) {
  const config = await getOrgSsoConfig(orgId);
  return Boolean(config?.is_enabled && config?.enforce_sso && config?.break_glass_email_login_enabled);
}

export async function getSsoDisplayState(orgId: string) {
  const config = await getOrgSsoConfig(orgId);

  if (!config?.is_enabled) return { mode: 'standard' as const, ctaText: null };

  if (config.enforce_sso) {
    return {
      mode: config.break_glass_email_login_enabled ? ('sso-first' as const) : ('sso-only' as const),
      ctaText: 'Continue with your company SSO',
    };
  }

  return { mode: 'standard' as const, ctaText: null };
}
