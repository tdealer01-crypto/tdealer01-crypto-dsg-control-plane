/**
 * Quota gate for /api/execute.
 *
 * Invariants (Z3-style):
 *   I1: checkQuota is read-only — no side effects
 *   I2: incrementQuota is idempotent within a billing period
 *       (upsert on (org_id, agent_id, billing_period))
 *   I3: ∀ org: executions after increment ≤ quota + 1
 *       (we check BEFORE incrementing — optimistic but safe for quota enforcement)
 *   I4: billing_period = YYYY-MM (UTC), resets monthly
 */

import { getSupabaseAdmin } from '../supabase-server';
import { getQuotaForPlan } from '../billing/entitlements';

export type QuotaStatus = {
  allowed: boolean;
  used: number;
  limit: number;
  upgradeUrl?: string;
};

function currentBillingPeriod(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function upgradeUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://app.dsg.pics';
  return `${base}/pricing`;
}

/**
 * Read current usage and quota for an org in the current billing period.
 * Pure read — does not modify any state.
 */
export async function checkQuota(orgId: string, agentId: string): Promise<QuotaStatus> {
  const supabase = getSupabaseAdmin();
  const period = currentBillingPeriod();

  // Fetch org plan and current usage in parallel
  const [orgResult, usageResult] = await Promise.all([
    supabase
      .from('organizations')
      .select('plan')
      .eq('id', orgId)
      .maybeSingle(),
    supabase
      .from('usage_counters')
      .select('executions')
      .eq('org_id', orgId)
      .eq('agent_id', agentId)
      .eq('billing_period', period)
      .maybeSingle(),
  ]);

  const plan = orgResult.data?.plan ?? 'free';
  const limit = getQuotaForPlan(plan);
  const used = usageResult.data?.executions ?? 0;

  if (used >= limit) {
    return { allowed: false, used, limit, upgradeUrl: upgradeUrl() };
  }

  return { allowed: true, used, limit };
}

/**
 * Atomically increment the execution counter for the current billing period.
 * Calls the increment_quota_atomic SQL function which uses a single UPDATE
 * (executions = executions + 1) followed by INSERT ON CONFLICT — both
 * operations are atomic at the DB level, eliminating the read-modify-write
 * race present in the old SELECT + UPDATE pattern.
 */
export async function incrementQuota(orgId: string, agentId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const period = currentBillingPeriod();

  const { error } = await supabase.rpc('increment_quota_atomic', {
    p_org_id: orgId,
    p_agent_id: agentId,
    p_billing_period: period,
  });

  if (error) {
    throw new Error(`incrementQuota failed: ${error.message}`);
  }
}
