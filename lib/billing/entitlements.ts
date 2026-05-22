// Z3-invariant: getQuotaForPlan is total, deterministic, and side-effect-free.
// ∀ plan ∈ KNOWN_PLANS: getQuotaForPlan(plan) > 0
// ∀ plan ∉ KNOWN_PLANS: getQuotaForPlan(plan) = FREE_QUOTA (safe floor)

export const FREE_QUOTA = 60 as const;

export const PLAN_QUOTA: Readonly<Record<string, number>> = {
  free: FREE_QUOTA,
  trial: 1000,
  pro: 10_000,
  business: 100_000,
  enterprise: 1_000_000,
} as const;

export type KnownPlan = keyof typeof PLAN_QUOTA;

/**
 * Pure mapping: plan key → monthly execution quota.
 * Unknown plans fall back to FREE_QUOTA (safe floor, never 0).
 */
export function getQuotaForPlan(plan: string | null | undefined): number {
  if (!plan) return FREE_QUOTA;
  const quota = PLAN_QUOTA[plan];
  // Invariant: result is a positive integer
  return typeof quota === 'number' && quota > 0 ? quota : FREE_QUOTA;
}

/** Active subscription statuses that entitle the org to its plan quota. */
export const ACTIVE_STATUSES = new Set(['active', 'trialing']);

/** Statuses that revoke entitlement — org falls back to free. */
export const REVOKED_STATUSES = new Set(['canceled', 'unpaid', 'past_due', 'incomplete_expired']);

/**
 * Pure function: given a subscription status and plan key, return the
 * effective plan to store on organizations.plan.
 * Z3 proof sketch: ACTIVE_STATUSES ∩ REVOKED_STATUSES = ∅
 */
export function effectivePlan(status: string | null, planKey: string | null): string {
  if (!status || !planKey) return 'free';
  if (ACTIVE_STATUSES.has(status)) return planKey;
  if (REVOKED_STATUSES.has(status)) return 'free';
  // incomplete / paused: keep existing plan (caller decides); we return planKey
  return planKey;
}
