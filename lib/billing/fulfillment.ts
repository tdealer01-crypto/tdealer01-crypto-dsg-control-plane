/**
 * Idempotent, atomic entitlement fulfillment.
 *
 * The database RPC updates organizations.plan and dsg_gate_entitlements in
 * one transaction. A webhook retry therefore produces the same final state.
 * Persistence failures throw so the canonical Stripe webhook can release its
 * event claim and return a non-2xx response, allowing Stripe to retry instead
 * of acknowledging a paid event whose entitlement was not persisted.
 */

import { getSupabaseAdmin } from '../supabase-server';

export type FulfillResult = {
  ok: boolean;
  error?: string;
};

async function syncPaidEntitlement(
  orgId: string,
  planKey: string,
  status: string,
): Promise<FulfillResult> {
  const supabase = getSupabaseAdmin() as any;
  const { error } = await supabase.rpc('sync_dsg_paid_entitlement', {
    p_org_id: orgId,
    p_plan_key: planKey,
    p_status: status,
  });

  if (error) {
    throw new Error(`paid_entitlement_sync_failed:${error.message}`);
  }

  return { ok: true };
}

/**
 * Grant or update an active/trialing subscription.
 * Non-active statuses are normalized to free by the database function.
 */
export async function fulfillSubscription(
  orgId: string,
  planKey: string,
  status: string,
): Promise<FulfillResult> {
  if (!orgId || !planKey || !status) {
    return { ok: false, error: 'orgId, planKey, and status are required' };
  }

  return syncPaidEntitlement(orgId, planKey, status);
}

/**
 * Revoke paid access atomically when Stripe cancels or stops collection.
 */
export async function revokeSubscription(orgId: string): Promise<FulfillResult> {
  if (!orgId) {
    return { ok: false, error: 'orgId is required' };
  }

  return syncPaidEntitlement(orgId, 'free', 'canceled');
}
