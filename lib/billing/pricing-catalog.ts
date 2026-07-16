/**
 * Pricing catalog — single source of truth for every price shown or charged.
 *
 * Consumers:
 *   app/api/billing/checkout/route.ts        (charges — env-first price IDs)
 *   app/api/dsg/v1/pricing/route.ts          (public gate pricing display)
 *   app/api/delivery-proof/pricing/route.ts  (public delivery-proof display)
 *
 * Rule: display prices here MUST match the Stripe prices behind
 * DEFAULT_PRICE_IDS / STRIPE_PRICE_* envs. Change prices here first,
 * then reconcile Stripe, never the other way around.
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
  /** Display price per month in USD (what the public pricing endpoints show). */
  displayMonthlyUsd: number;
  priceEnv: Record<BillingInterval, string>;
}

export const GATE_PLANS: Record<PlanKey, GatePlan> = {
  pro: {
    trialDays: 14,
    displayMonthlyUsd: 99,
    priceEnv: { monthly: 'STRIPE_PRICE_PRO_MONTHLY', yearly: 'STRIPE_PRICE_PRO_YEARLY' },
  },
  business: {
    trialDays: 14,
    displayMonthlyUsd: 199,
    priceEnv: { monthly: 'STRIPE_PRICE_BUSINESS_MONTHLY', yearly: 'STRIPE_PRICE_BUSINESS_YEARLY' },
  },
  enterprise: {
    trialDays: 30,
    displayMonthlyUsd: 499,
    priceEnv: { monthly: 'STRIPE_PRICE_ENTERPRISE_MONTHLY', yearly: 'STRIPE_PRICE_ENTERPRISE_YEARLY' },
  },
};

// Skills bundles use inline price_data (no pre-created Stripe price IDs needed).
// Amounts are in USD cents.
export const SKILLS_BUNDLES: Record<SkillsBundleKey, { name: string; amountMonthly: number; amountYearly: number }> = {
  finance_skills:    { name: 'DSG Finance Governance Pack',  amountMonthly: 19900, amountYearly: 179100 },
  dev_skills:        { name: 'DSG Dev Automation Pack',      amountMonthly:  9900, amountYearly:  89100 },
  compliance_skills: { name: 'DSG Compliance & Legal Pack',  amountMonthly: 24900, amountYearly: 224100 },
  ops_skills:        { name: 'DSG Operations Pack',          amountMonthly: 14900, amountYearly: 134100 },
  enterprise_skills: { name: 'DSG Enterprise Bundle',        amountMonthly: 59900, amountYearly: 539100 },
};

// MCP API subscription — monthly only, env-driven price ID.
// ฿490/month corresponds to ~$14 USD (exchange rate context only; actual charged in USD via Stripe).
export const MCP_SUBSCRIPTION: Record<MCPSubscriptionKey, { name: string; callsPerMonth: number; priceEnv: string }> = {
  mcp_api: { name: 'MCP API Subscription', callsPerMonth: 10000, priceEnv: 'STRIPE_PRICE_MCP_MONTHLY' },
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

// Live price IDs in Stripe account acct_1Tnbl5CVpjxFKlKT (dsg-one, Inc.), created 2026-07-02.
// Price IDs are public identifiers (visible in Checkout URLs), not secrets.
// STRIPE_PRICE_* env vars always take precedence when set.
export const DEFAULT_PRICE_IDS: Record<PlanKey, Record<BillingInterval, string>> = {
  pro:        { monthly: 'price_1TopmZCVpjxFKlKT18ljNI84', yearly: 'price_1TopmiCVpjxFKlKT0EVZwCps' },
  business:   { monthly: 'price_1TopmsCVpjxFKlKTdpm128OG', yearly: 'price_1Topn0CVpjxFKlKTvxKJUsff' },
  enterprise: { monthly: 'price_1TopnACVpjxFKlKT36Pe7Zmu', yearly: 'price_1TopnICVpjxFKlKTqHhjKzhR' },
};

function getLegacyMonthlyPriceId(plan: PlanKey): string {
  if (plan === 'pro') return process.env.STRIPE_PRICE_PRO || '';
  if (plan === 'business') return process.env.STRIPE_PRICE_BUSINESS || '';
  return '';
}

/** Env-first Stripe price resolution: STRIPE_PRICE_* → legacy monthly envs → hardcoded fallback. */
export function getPriceId(plan: PlanKey, interval: BillingInterval): string {
  const envName = GATE_PLANS[plan].priceEnv[interval];
  const configured = process.env[envName] || '';
  if (configured) return configured;

  if (interval === 'monthly') {
    const legacy = getLegacyMonthlyPriceId(plan);
    if (legacy) return legacy;
  }

  return DEFAULT_PRICE_IDS[plan][interval];
}
