/**
 * Idempotent subscription fulfillment.
 *
 * Invariants:
 *   I1: repeated fulfillment converges on the same org + gate entitlement state
 *   I2: revoked subscriptions always converge to the free plan/tier
 *   I3: a paid DSG plan never leaves the deterministic gate quota at free
 *   I4: persistence failures throw so the canonical Stripe webhook releases
 *       its event claim and Stripe can retry instead of acknowledging partial
 *       entitlement state
 */

import { getSupabaseAdmin } from '../supabase-server';
import { effectivePlan } from './entitlements';
import { DSG_GATE_TIERS } from '../dsg/gate-entitlement';

export type FulfillResult = {
  ok: boolean;
  error?: string;
};

type GateTier = 'free' | 'pro' | 'enterprise';

/**
 * Billing has a Business plan while the deterministic Gate currently exposes
 * Free / Pro / Enterprise tiers. Business receives the verified Pro gate tier;
 * Enterprise receives Enterprise. Unknown/non-gate products remain Free.
 */
export function gateTierForBillingPlan(plan: string): GateTier {
  if (plan === 'enterprise') return 'enterprise';
  if (plan === 'pro' || plan === 'business') return 'pro';
  return 'free';
}

async function syncGateEntitlement(
  orgId: string,
  effectiveBillingPlan: string,
): Promise<void> {
  const tier = gateTierForBillingPlan(effectiveBillingPlan);
  const tierSpec = DSG_GATE_TIERS[tier];
  const supabase = getSupabaseAdmin();
  const { error } = await (supabase as any)
    .from('dsg_gate_entitlements')
    .upsert(
      {
        org_id: orgId,
        tier,
        evals_per_month: tierSpec.evalsPerMonth,
      },
      { onConflict: 'org_id' },
    );

  if (error) {
    throw new Error(`gate_entitlement_sync_failed:${error.message}`);
  }
}

/**
 * Update organizations.plan and the deterministic gate entitlement for an
 * active/trialing subscription. Called by the canonical Stripe webhook.
 */
export async function fulfillSubscription(
  orgId: string,
  planKey: string,
  status: string,
): Promise<FulfillResult> {
  if (!orgId || !planKey) {
    return { ok: false, error: 'orgId and planKey are required' };
  }

  const plan = effectivePlan(status, planKey);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('organizations')
    .update({ plan, updated_at: new Date().toISOString() })
    .eq('id', orgId);

  if (error) {
    throw new Error(`organization_entitlement_sync_failed:${error.message}`);
  }

  await syncGateEntitlement(orgId, plan);
  return { ok: true };
}

/**
 * Downgrade both organizations.plan and the deterministic gate entitlement
 * when a subscription is canceled, unpaid, or permanently failed.
 */
export async function revokeSubscription(orgId: string): Promise<FulfillResult> {
  if (!orgId) {
    return { ok: false, error: 'orgId is required' };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('organizations')
    .update({ plan: 'free', updated_at: new Date().toISOString() })
    .eq('id', orgId);

  if (error) {
    throw new Error(`organization_entitlement_revoke_failed:${error.message}`);
  }

  await syncGateEntitlement(orgId, 'free');
  return { ok: true };
}
