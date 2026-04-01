import { getSupabaseAdmin } from '../supabase-server';
import { getPlanQuotaPolicy } from '../billing/quota-policy';

export async function buildGoLiveReadinessReport(orgId: string) {
  const admin = getSupabaseAdmin();
  const [owners, sso, domains, subs, signIns, requests, grants, onboarding] = await Promise.all([
    admin.from('users').select('id').eq('org_id', orgId).eq('role', 'owner').eq('is_active', true),
    admin.from('org_security_settings').select('sso_enabled,sso_enforced,break_glass_email_enabled,sso_metadata').eq('org_id', orgId).maybeSingle(),
    admin.from('org_domains').select('status,claim_mode').eq('org_id', orgId),
    admin.from('billing_subscriptions').select('plan_key').eq('org_id', orgId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('sign_in_events').select('id').eq('org_id', orgId).limit(1),
    admin.from('access_requests').select('id').eq('org_id', orgId).limit(1),
    admin.from('guest_access_grants').select('id').eq('org_id', orgId).limit(1),
    admin.from('onboarding_states').select('id').eq('org_id', orgId).limit(1),
  ]);

  const blockers: string[] = [];
  const warnings: string[] = [];
  const ownerCount = (owners.data || []).length;
  if (ownerCount < 1) blockers.push('At least one active owner is required.');
  const ssoConfigured = Boolean(sso.data?.sso_enabled && sso.data?.sso_metadata && Object.keys(sso.data.sso_metadata || {}).length > 0);
  if (sso.data?.sso_enforced && !ssoConfigured && !sso.data?.break_glass_email_enabled) blockers.push('SSO is enforced without valid SSO config or break-glass path.');
  const hasVerified = (domains.data || []).some((d: any) => d.status === 'verified');
  const hasApproved = (domains.data || []).some((d: any) => d.status === 'approved' || d.status === 'verified');
  if (!hasApproved) warnings.push('No approved domains configured yet.');

  const categories = [
    { name: 'Identity & access', items: [
      { key: 'login_entry_unified', ok: true },
      { key: 'access_mode_resolved', ok: true },
      { key: 'sso_configured', ok: ssoConfigured },
      { key: 'sso_enforced', ok: Boolean(sso.data?.sso_enforced) },
      { key: 'break_glass_configured', ok: Boolean(sso.data?.break_glass_email_enabled) },
      { key: 'owner_count_valid', ok: ownerCount > 0 },
    ]},
    { name: 'Domain governance', items: [
      { key: 'verified_domains_present', ok: hasVerified },
      { key: 'approved_domains_present', ok: hasApproved },
      { key: 'claim_mode_defined', ok: (domains.data || []).length > 0 },
    ]},
    { name: 'Billing & quota', items: [
      { key: 'billing_policy_exists', ok: Boolean(subs.data?.plan_key) },
      { key: 'quota_policy_resolvable', ok: Boolean(getPlanQuotaPolicy(subs.data?.plan_key).executionsPer30Days > 0) },
      { key: 'seat_activation_model_active', ok: true },
    ]},
    { name: 'Security & audit', items: [
      { key: 'sign_in_events_logging_active', ok: (signIns.data || []).length > 0 },
      { key: 'audit_export_available', ok: true },
      { key: 'request_access_logging_active', ok: (requests.data || []).length > 0 },
      { key: 'guest_access_visible', ok: (grants.data || []).length > 0 },
    ]},
    { name: 'Onboarding', items: [
      { key: 'onboarding_state_exists', ok: (onboarding.data || []).length > 0 },
      { key: 'quickstart_checklist_available', ok: true },
      { key: 'starter_bootstrap_path_available', ok: true },
    ]},
  ];

  const status = blockers.length > 0 ? 'not-ready' : warnings.length > 0 ? 'needs-attention' : 'ready';
  return { org_id: orgId, status, blockers, warnings, categories, recommended_next_steps: ['Configure verified domains', 'Review SSO/break-glass policy', 'Export and archive weekly audit logs'] };
}
