import { getSupabaseAdmin } from '../supabase-server';
import { getQuotaForPlan } from '../billing/entitlements';

/**
 * Go-live readiness report (re-port of PR #114, adapted to current `main` schema).
 *
 * Schema adaptation notes (see PR "Known limits"):
 * - PR #114 read `org_security_settings` with columns `sso_enabled`, `sso_enforced`,
 *   `sso_metadata`, `break_glass_email_enabled`. None of those exist on current `main`.
 *   Current `main` exposes `org_sso_configs` with only `provider`, `display_name`,
 *   `is_enabled`. SSO *enforcement* and *break-glass* have no backing column, so those
 *   signals are reported as "unknown / not-configured" instead of referencing missing
 *   columns. We do NOT invent columns.
 * - PR #114 read an `org_domains` table for domain governance. No such table exists on
 *   current `main`, so the whole "Domain governance" category is reported as unknown.
 * - PR #114 read `access_requests` and `guest_access_grants` directly. Those tables exist
 *   in `supabase/schema.sql` but are NOT present in the generated `lib/database.types.ts`
 *   on current `main` (the typed client rejects them, which is a pre-existing baseline gap
 *   shared with sibling settings routes). To avoid adding new typecheck errors we use
 *   `audit_logs` as the real, typed evidence source for security/audit signals instead.
 * - PR #114 used `getPlanQuotaPolicy(...).executionsPer30Days`. That module does not exist
 *   on current `main`; the equivalent is `getQuotaForPlan(plan)` in `lib/billing/entitlements`.
 */

export type ReadinessStatus = 'ready' | 'needs-attention' | 'not-ready';

export type ReadinessItem = { key: string; ok: boolean; detail?: string };
export type ReadinessCategory = { name: string; items: ReadinessItem[] };

export type GoLiveReadinessReport = {
  org_id: string;
  status: ReadinessStatus;
  blockers: string[];
  warnings: string[];
  categories: ReadinessCategory[];
  recommended_next_steps: string[];
};

export async function buildGoLiveReadinessReport(orgId: string): Promise<GoLiveReadinessReport> {
  const admin = getSupabaseAdmin();

  const [owners, sso, sub, signIns, audit, onboarding] = await Promise.all([
    admin.from('users').select('id').eq('org_id', orgId).eq('role', 'owner').eq('is_active', true),
    admin.from('org_sso_configs').select('provider,is_enabled').eq('org_id', orgId).maybeSingle(),
    admin
      .from('billing_subscriptions')
      .select('plan_key,status')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from('sign_in_events').select('id').eq('org_id', orgId).limit(1),
    admin.from('audit_logs').select('id').eq('org_id', orgId).limit(1),
    admin.from('org_onboarding_states').select('id,bootstrap_status').eq('org_id', orgId).maybeSingle(),
  ]);

  const blockers: string[] = [];
  const warnings: string[] = [];

  const ownerCount = (owners.data || []).length;
  if (ownerCount < 1) blockers.push('At least one active owner is required.');

  // Current main only knows whether an SSO provider config exists and is enabled.
  // Enforcement and break-glass have no backing column -> reported as unknown.
  const ssoConfigured = Boolean(sso.data?.is_enabled && sso.data?.provider);
  if (!ssoConfigured) warnings.push('SSO is not configured (optional but recommended for enterprise rollout).');

  const planKey = sub.data?.plan_key ?? null;
  const quota = getQuotaForPlan(planKey);
  if (!planKey) warnings.push('No billing subscription found; org is on the default plan.');

  const signInLoggingActive = (signIns.data || []).length > 0;
  const auditLoggingActive = (audit.data || []).length > 0;
  if (!auditLoggingActive) warnings.push('No audit log entries yet; confirm governance logging is wired.');

  const onboardingExists = Boolean(onboarding.data?.id);
  const onboardingComplete = onboarding.data?.bootstrap_status === 'completed';

  const categories: ReadinessCategory[] = [
    {
      name: 'Identity & access',
      items: [
        { key: 'login_entry_unified', ok: true },
        { key: 'access_mode_resolved', ok: true },
        { key: 'sso_configured', ok: ssoConfigured },
        // No backing column on current main -> unknown, surfaced as not-ok with a detail.
        { key: 'sso_enforced', ok: false, detail: 'unknown: no backing column on current schema' },
        { key: 'break_glass_configured', ok: false, detail: 'unknown: no backing column on current schema' },
        { key: 'owner_count_valid', ok: ownerCount > 0 },
      ],
    },
    {
      name: 'Domain governance',
      items: [
        // PR #114 read org_domains; no such table on current main.
        { key: 'verified_domains_present', ok: false, detail: 'unknown: org_domains table not present on current schema' },
        { key: 'approved_domains_present', ok: false, detail: 'unknown: org_domains table not present on current schema' },
        { key: 'claim_mode_defined', ok: false, detail: 'unknown: org_domains table not present on current schema' },
      ],
    },
    {
      name: 'Billing & quota',
      items: [
        { key: 'billing_policy_exists', ok: Boolean(planKey) },
        { key: 'quota_policy_resolvable', ok: quota > 0, detail: `monthly execution quota: ${quota}` },
        { key: 'seat_activation_model_active', ok: true },
      ],
    },
    {
      name: 'Security & audit',
      items: [
        { key: 'sign_in_events_logging_active', ok: signInLoggingActive },
        { key: 'audit_log_active', ok: auditLoggingActive },
        { key: 'audit_export_available', ok: true },
      ],
    },
    {
      name: 'Onboarding',
      items: [
        { key: 'onboarding_state_exists', ok: onboardingExists },
        { key: 'onboarding_bootstrap_complete', ok: onboardingComplete },
        { key: 'quickstart_checklist_available', ok: true },
      ],
    },
  ];

  const status: ReadinessStatus =
    blockers.length > 0 ? 'not-ready' : warnings.length > 0 ? 'needs-attention' : 'ready';

  return {
    org_id: orgId,
    status,
    blockers,
    warnings,
    categories,
    recommended_next_steps: [
      'Configure and enable SSO for the organization',
      'Complete the onboarding bootstrap checklist',
      'Export and archive weekly audit logs',
    ],
  };
}
