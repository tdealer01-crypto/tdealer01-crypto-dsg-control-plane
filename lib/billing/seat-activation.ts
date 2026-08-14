import { getSupabaseAdmin } from '../supabase-server';
import { v4 as uuidv4 } from 'uuid';

export async function getOrgBillingPolicy(orgId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('org_billing_policies')
    .select('org_id, seat_activation_policy, trial_requires_card, managed_user_billing_mode, purchased_seats')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) throw error;
  return data ?? {
    org_id: orgId,
    seat_activation_policy: 'on_first_login',
    trial_requires_card: false,
    managed_user_billing_mode: 'bill_on_activation',
    purchased_seats: 0,
  };
}

export function isBillableRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin' || role === 'operator' || role === 'viewer';
}

/**
 * Activate a billable seat for a user in an organization.
 *
 * Uses atomic database RPC to enforce:
 * - Unique (org_id, email) constraint
 * - Purchased seat limit enforcement
 * - Idempotent activation (same email → same result)
 * - Immutable audit trail
 *
 * Market-standard pattern: fail closed on limit exceeded, race loss, or subscription missing.
 */
export async function activateBillableSeat(input: {
  orgId: string;
  email: string;
  userId?: string | null;
  role?: string | null;
  source?: string;
}): Promise<{
  activated: boolean;
  reason:
    | 'ACTIVATED'
    | 'ALREADY_ACTIVATED'
    | 'SEAT_LIMIT_EXCEEDED'
    | 'NON_BILLABLE_ROLE'
    | 'NO_SUBSCRIPTION'
    | 'ORG_NOT_FOUND'
    | 'RACE_LOST_CONCURRENT_ACTIVATION';
  activeSeats: number;
  purchasedSeats: number;
  proofHash: string | null;
}> {
  if (!isBillableRole(input.role)) {
    return {
      activated: false,
      reason: 'NON_BILLABLE_ROLE',
      activeSeats: 0,
      purchasedSeats: 0,
      proofHash: null,
    };
  }

  const admin = getSupabaseAdmin();
  const idempotencyKey = uuidv4();

  // Call atomic RPC function (handles all constraints, audit, and proof in one transaction)
  const { data, error } = await admin.rpc('activate_billable_seat_strict', {
    p_org_id: input.orgId,
    p_email: input.email,
    p_user_id: input.userId ?? null,
    p_role: input.role ?? null,
    p_source: input.source ?? 'auth_confirm',
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    console.error('[billing:seat-activation] RPC error:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('activate_billable_seat_strict returned empty result');
  }

  const result = data[0];
  return {
    activated: result.activated === true,
    reason: result.reason || 'UNKNOWN',
    activeSeats: result.active_seats || 0,
    purchasedSeats: result.purchased_seats || 0,
    proofHash: result.proof_hash || null,
  };
}

/**
 * @deprecated Use activateBillableSeat instead
 * Old race-condition-prone function; kept for backwards compatibility only
 */
export async function ensureSeatActivatedForUser(input: {
  orgId: string;
  email: string;
  userId?: string | null;
  role?: string | null;
  source?: string;
}): Promise<{ created: boolean; reason: string }> {
  const result = await activateBillableSeat(input);
  return {
    created: result.activated,
    reason: result.reason.toLowerCase().replace(/_/g, '-'),
  };
}
