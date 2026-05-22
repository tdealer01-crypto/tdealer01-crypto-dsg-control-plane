/**
 * Idempotent entitlement fulfillment.
 *
 * Invariants (Z3-style):
 *   I1: fulfillSubscription called N times = same DB state as called once
 *       (achieved via UPDATE … WHERE id = orgId — idempotent write)
 *   I2: revokeSubscription always sets plan = 'free', never null
 *   I3: Neither function throws on Supabase error — returns Result<void>
 */

import { getSupabaseAdmin } from '../supabase-server';
import { effectivePlan } from './entitlements';

export type FulfillResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Update organizations.plan to reflect an active/trialing subscription.
 * Called on checkout.session.completed, customer.subscription.created,
 * and customer.subscription.updated.
 */
export async function fulfillSubscription(
  orgId: string,
  planKey: string,
  status: string
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
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Downgrade organizations.plan to 'free' when a subscription is canceled,
 * unpaid, or permanently failed.
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
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
