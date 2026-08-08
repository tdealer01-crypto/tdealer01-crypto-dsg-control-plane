export type GateTier = 'free' | 'pro' | 'enterprise';

export type GateAccessMode =
  | 'included_quota'
  | 'metered_overage'
  | 'quota_exceeded'
  | 'subscription_inactive'
  | 'billing_unavailable';

export const GATE_INCLUDED_EVALS: Readonly<Record<GateTier, number>> = {
  free: 50,
  pro: 5_000,
  enterprise: 999_999,
} as const;

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

export function normalizeGateTier(planKey: string | null | undefined): GateTier {
  const normalized = String(planKey || 'free').toLowerCase();
  if (normalized === 'enterprise') return 'enterprise';
  if (normalized === 'pro' || normalized === 'business') return 'pro';
  return 'free';
}

export function isPaidSubscriptionActive(status: string | null | undefined): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(String(status || '').toLowerCase());
}

export type GateRevenuePolicyInput = {
  tier: GateTier;
  subscriptionStatus: string | null | undefined;
  includedLimit: number;
  used: number;
  overageEnabled: boolean;
  hasStripeCustomer: boolean;
  hasStripeSubscription: boolean;
  meteringConfigured: boolean;
};

export type GateRevenueDecision = {
  allowed: boolean;
  remaining: number;
  accessMode: GateAccessMode;
  requiresPayment: boolean;
};

function overageBillingReady(input: GateRevenuePolicyInput): boolean {
  return (
    input.tier === 'pro' &&
    isPaidSubscriptionActive(input.subscriptionStatus) &&
    input.overageEnabled &&
    input.hasStripeCustomer &&
    input.hasStripeSubscription &&
    input.meteringConfigured
  );
}

/**
 * Pure, deterministic pre-execution revenue gate.
 *
 * Invariants:
 * - Paid tiers never execute while the subscription is inactive.
 * - Free tier never exceeds its included quota.
 * - Pro overage executes only when the Stripe customer, subscription,
 *   overage flag, and meter configuration are all present.
 * - Enterprise is treated as unlimited only while active/trialing.
 */
export function decideGateRevenueAccess(
  input: GateRevenuePolicyInput,
): GateRevenueDecision {
  const includedLimit = Math.max(0, Math.floor(input.includedLimit));
  const used = Math.max(0, Math.floor(input.used));
  const remaining = Math.max(0, includedLimit - used);
  const paidTier = input.tier !== 'free';
  const paidActive = paidTier && isPaidSubscriptionActive(input.subscriptionStatus);

  if (paidTier && !paidActive) {
    return {
      allowed: false,
      remaining: 0,
      accessMode: 'subscription_inactive',
      requiresPayment: true,
    };
  }

  if (input.tier === 'enterprise' && paidActive) {
    return {
      allowed: true,
      remaining,
      accessMode: 'included_quota',
      requiresPayment: false,
    };
  }

  if (remaining > 0) {
    return {
      allowed: true,
      remaining,
      accessMode: 'included_quota',
      requiresPayment: false,
    };
  }

  if (input.tier === 'pro' && paidActive) {
    if (overageBillingReady(input)) {
      return {
        allowed: true,
        remaining: 0,
        accessMode: 'metered_overage',
        requiresPayment: false,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      accessMode: 'billing_unavailable',
      requiresPayment: false,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    accessMode: 'quota_exceeded',
    requiresPayment: true,
  };
}

/**
 * Post-insert billing decision for the evaluation that was just recorded.
 * `usedAfterInsert === includedLimit` is still included. Only usage strictly
 * above the limit is an overage, preventing the last included call from being
 * charged.
 */
export function shouldMeterRecordedEvaluation(
  input: GateRevenuePolicyInput & { usedAfterInsert: number },
): boolean {
  const includedLimit = Math.max(0, Math.floor(input.includedLimit));
  const usedAfterInsert = Math.max(0, Math.floor(input.usedAfterInsert));

  return usedAfterInsert > includedLimit && overageBillingReady(input);
}
