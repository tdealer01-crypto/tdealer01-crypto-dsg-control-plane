/**
 * Pricing catalog — single source of truth for prices shown by DSG surfaces.
 *
 * Charging rule:
 *   Checkout may use only an explicitly configured STRIPE_PRICE_* environment
 *   value. We intentionally do not fall back to hardcoded Price IDs because
 *   Price IDs are scoped to one Stripe account; a cross-account fallback can
 *   make a correct-looking UI attempt to charge through the wrong account.
 */

export type PlanKey = 'pro' | 'business' | 'enterprise';
export type SkillsBundleKey =
  | 'finance_skills'
  | 'dev_skills'
  | 'compliance_skills'
  | 'ops_skills'
  | 'enterprise_skills';
export type MCPSubscriptionKey = 'mcp_api';
export type BillingInterval = 'monthly' | 'yearly';

export interface GatePlan {
  trialDays: number;
  /** Display price per month in USD (what public pricing endpoints show). */
  displayMonthlyUsd: number;
  priceEnv: Record<BillingInterval, string>;
}

export const GATE_PLANS: Record<PlanKey, GatePlan> = {
  pro: {
    trialDays: 14,
    displayMonthlyUsd: 99,
    priceEnv: {
      monthly: 'STRIPE_PRICE_PRO_MONTHLY',
      yearly: 'STRIPE_PRICE_PRO_YEARLY',
    },
  },
  business: {
    trialDays: 14,
    displayMonthlyUsd: 199,
    priceEnv: {
      monthly: 'STRIPE_PRICE_BUSINESS_MONTHLY',
      yearly: 'STRIPE_PRICE_BUSINESS_YEARLY',
    },
  },
  enterprise: {
    trialDays: 30,
    displayMonthlyUsd: 499,
    priceEnv: {
      monthly: 'STRIPE_PRICE_ENTERPRISE_MONTHLY',
      yearly: 'STRIPE_PRICE_ENTERPRISE_YEARLY',
    },
  },
};

// Skills bundles use inline price_data (no pre-created Stripe price IDs needed).
// Amounts are in USD cents.
export const SKILLS_BUNDLES: Record<
  SkillsBundleKey,
  { name: string; amountMonthly: number; amountYearly: number }
> = {
  finance_skills: {
    name: 'DSG Finance Governance Pack',
    amountMonthly: 19900,
    amountYearly: 179100,
  },
  dev_skills: {
    name: 'DSG Dev Automation Pack',
    amountMonthly: 9900,
    amountYearly: 89100,
  },
  compliance_skills: {
    name: 'DSG Compliance & Legal Pack',
    amountMonthly: 24900,
    amountYearly: 224100,
  },
  ops_skills: {
    name: 'DSG Operations Pack',
    amountMonthly: 14900,
    amountYearly: 134100,
  },
  enterprise_skills: {
    name: 'DSG Enterprise Bundle',
    amountMonthly: 59900,
    amountYearly: 539100,
  },
};

// MCP API subscription — monthly only, env-driven price ID.
// ฿490/month corresponds to ~$14 USD (exchange rate context only; actual
// charged currency is determined by the configured Stripe Price object).
export const MCP_SUBSCRIPTION: Record<
  MCPSubscriptionKey,
  { name: string; callsPerMonth: number; priceEnv: string }
> = {
  mcp_api: {
    name: 'MCP API Subscription',
    callsPerMonth: 10000,
    priceEnv: 'STRIPE_PRICE_MCP_MONTHLY',
  },
};

export function isSkillsBundle(plan: string): plan is SkillsBundleKey {
  return plan in SKILLS_BUNDLES;
}

export function isMCPSubscription(plan: string): plan is MCPSubscriptionKey {
  return plan in MCP_SUBSCRIPTION;
}

/** Delivery-Proof display tiers (entitlement logic lives in lib/delivery-proof/entitlement). */
export const DELIVERY_PROOF_PRICING = {
  free: { displayUsd: 0, label: '$0' },
  pro_scan: { displayUsd: 49, label: '$49', oneTime: true },
  unlimited: { displayUsd: 199, label: '$199', planKey: 'business' as PlanKey },
} as const;

function getLegacyMonthlyPriceId(plan: PlanKey): string {
  if (plan === 'pro') return process.env.STRIPE_PRICE_PRO || '';
  if (plan === 'business') return process.env.STRIPE_PRICE_BUSINESS || '';
  return '';
}

/**
 * Env-first and fail-closed Stripe price resolution.
 *
 * Resolution order:
 * 1. Interval-specific STRIPE_PRICE_* environment variable.
 * 2. Legacy monthly env for Pro/Business only.
 * 3. Empty string, causing checkout to return a configuration error instead
 *    of attempting a Price ID from another Stripe account.
 */
export function getPriceId(plan: PlanKey, interval: BillingInterval): string {
  const envName = GATE_PLANS[plan].priceEnv[interval];
  const configured = process.env[envName] || '';
  if (configured) return configured;

  if (interval === 'monthly') {
    const legacy = getLegacyMonthlyPriceId(plan);
    if (legacy) return legacy;
  }

  return '';
}
