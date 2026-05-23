/**
 * Automated Revenue Pipeline — Upgrade Nudge System
 *
 * Detects orgs approaching quota limits and triggers upgrade prompts.
 *
 * Thresholds (market-validated from SaaS conversion research):
 *   80% usage  → soft nudge (banner + email)
 *   95% usage  → hard nudge (modal + email + in-app alert)
 *   100% usage → quota block (402) + upgrade required
 *
 * Revenue impact: industry benchmark is 15-25% upgrade conversion at 80% threshold.
 */

import { getSupabaseAdmin } from '../supabase-server';
import { getQuotaForPlan, PLAN_QUOTA, type KnownPlan } from '../billing/entitlements';

export type NudgeLevel = 'none' | 'soft' | 'hard' | 'blocked';

export type UsageSnapshot = {
  orgId: string;
  plan: string;
  used: number;
  limit: number;
  pct: number;       // 0–100
  nudge: NudgeLevel;
  upgradeUrl: string;
  nextPlan: string | null;
  nextPlanQuota: number | null;
  savingsVsMonthly: string | null;
};

const SOFT_THRESHOLD  = 0.80; // 80%
const HARD_THRESHOLD  = 0.95; // 95%

const PLAN_UPGRADE_PATH: Record<string, KnownPlan | null> = {
  free:       'trial',
  trial:      'pro',
  pro:        'business',
  business:   'enterprise',
  enterprise: null,
};

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://app.dsg.pics';
}

function buildUpgradeUrl(orgId: string, currentPlan: string): string {
  const nextPlan = PLAN_UPGRADE_PATH[currentPlan];
  const base = appUrl();
  if (!nextPlan) return `${base}/pricing`;
  return `${base}/api/billing/checkout?plan=${nextPlan}&interval=monthly&org_id=${orgId}`;
}

function nudgeLevel(pct: number): NudgeLevel {
  if (pct >= 1.0)           return 'blocked';
  if (pct >= HARD_THRESHOLD) return 'hard';
  if (pct >= SOFT_THRESHOLD) return 'soft';
  return 'none';
}

function formatSavings(plan: string): string | null {
  const next = PLAN_UPGRADE_PATH[plan];
  if (!next) return null;
  const nextQuota = PLAN_QUOTA[next];
  const currQuota = PLAN_QUOTA[plan as KnownPlan] ?? 0;
  const multiplier = Math.floor(nextQuota / currQuota);
  return `${multiplier}× more capacity`;
}

/**
 * Get current usage snapshot for a single org in the current billing period.
 */
export async function getOrgUsageSnapshot(orgId: string): Promise<UsageSnapshot> {
  const supabase = getSupabaseAdmin();
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM

  const [orgResult, usageResult] = await Promise.all([
    supabase.from('organizations').select('plan').eq('id', orgId).maybeSingle(),
    supabase
      .from('usage_counters')
      .select('executions')
      .eq('org_id', orgId)
      .eq('billing_period', period),
  ]);

  const plan  = orgResult.data?.plan ?? 'free';
  const limit = getQuotaForPlan(plan);
  const used  = (usageResult.data ?? []).reduce((sum: number, row: any) => sum + (row.executions ?? 0), 0);
  const pct   = limit > 0 ? used / limit : 1;
  const next  = PLAN_UPGRADE_PATH[plan] ?? null;

  return {
    orgId,
    plan,
    used,
    limit,
    pct: Math.round(pct * 100),
    nudge: nudgeLevel(pct),
    upgradeUrl: buildUpgradeUrl(orgId, plan),
    nextPlan: next,
    nextPlanQuota: next ? (PLAN_QUOTA[next] ?? null) : null,
    savingsVsMonthly: formatSavings(plan),
  };
}

/**
 * Scan all active orgs and return those needing upgrade nudges.
 * Called by the usage-alerts cron job.
 */
export async function scanOrgsForNudge(nudgeFilter: NudgeLevel[] = ['soft', 'hard', 'blocked']): Promise<UsageSnapshot[]> {
  const supabase = getSupabaseAdmin();
  const period   = new Date().toISOString().slice(0, 7);

  // Fetch all orgs with usage in the current period
  const { data: usageRows, error } = await supabase
    .from('usage_counters')
    .select('org_id, executions')
    .eq('billing_period', period);

  if (error || !usageRows) return [];

  // Aggregate by org_id
  const byOrg = new Map<string, number>();
  for (const row of usageRows) {
    byOrg.set(row.org_id, (byOrg.get(row.org_id) ?? 0) + (row.executions ?? 0));
  }

  if (byOrg.size === 0) return [];

  // Fetch plans for these orgs
  const orgIds = [...byOrg.keys()];
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, plan')
    .in('id', orgIds);

  const snapshots: UsageSnapshot[] = [];
  for (const org of orgs ?? []) {
    const plan  = org.plan ?? 'free';
    const limit = getQuotaForPlan(plan);
    const used  = byOrg.get(org.id) ?? 0;
    const pct   = limit > 0 ? used / limit : 1;
    const nudge = nudgeLevel(pct);

    if (!nudgeFilter.includes(nudge)) continue;

    const next = PLAN_UPGRADE_PATH[plan] ?? null;
    snapshots.push({
      orgId: org.id,
      plan,
      used,
      limit,
      pct: Math.round(pct * 100),
      nudge,
      upgradeUrl: buildUpgradeUrl(org.id, plan),
      nextPlan: next,
      nextPlanQuota: next ? (PLAN_QUOTA[next] ?? null) : null,
      savingsVsMonthly: formatSavings(plan),
    });
  }

  return snapshots.sort((a, b) => b.pct - a.pct);
}
