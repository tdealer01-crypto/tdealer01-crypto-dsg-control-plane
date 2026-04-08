/**
 * Stripe product & price catalogue for DSG Control Plane.
 *
 * This module defines the canonical plan/price structure used by the
 * checkout route, pricing page, and the one-time setup script.
 *
 * ## Quick-start (run once per Stripe account)
 *
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-setup.ts
 *
 * The script creates products + prices in Stripe and prints the env
 * vars you need to add to your Vercel / .env.local config.
 */

import Stripe from 'stripe';

export type PlanKey = 'pro' | 'business' | 'enterprise';
export type BillingInterval = 'monthly' | 'yearly';

export interface PlanDefinition {
  name: string;
  description: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  trialDays: number;
  features: string[];
}

export const PLAN_CATALOGUE: Record<PlanKey, PlanDefinition> = {
  pro: {
    name: 'DSG Pro',
    description: 'For solo founders and lean product teams — 5 agents, 10k executions/mo',
    monthlyPriceCents: 9900,
    yearlyPriceCents: 99000,
    trialDays: 14,
    features: ['5 agents', '10,000 executions', 'Hosted checkout', 'Webhook billing sync'],
  },
  business: {
    name: 'DSG Business',
    description: 'For production AI workflows — 25 agents, 100k executions/mo',
    monthlyPriceCents: 29900,
    yearlyPriceCents: 299000,
    trialDays: 14,
    features: ['25 agents', '100,000 executions', 'Production support', 'Multi-user ops'],
  },
  enterprise: {
    name: 'DSG Enterprise',
    description: 'Audit-heavy and governance-first deployments — custom quotas',
    monthlyPriceCents: 99900,
    yearlyPriceCents: 999000,
    trialDays: 30,
    features: ['Custom quotas', '30-day pilot', 'Governance onboarding', 'Audit exports'],
  },
};

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }
  return new Stripe(secretKey);
}

/**
 * Create all DSG products and prices in Stripe.
 * Returns a map of env var names to Stripe price IDs.
 *
 * Safe to call multiple times — it always creates new products/prices
 * (Stripe does not enforce uniqueness on product names).
 */
export async function setupStripeProducts(
  stripe: Stripe,
): Promise<Record<string, string>> {
  const envVars: Record<string, string> = {};

  for (const [planKey, plan] of Object.entries(PLAN_CATALOGUE) as [PlanKey, PlanDefinition][]) {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: {
        plan_key: planKey,
        source: 'dsg-control-plane-setup',
      },
    });

    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: plan.monthlyPriceCents,
      recurring: { interval: 'month' },
      metadata: { plan_key: planKey, billing_interval: 'monthly' },
    });

    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: plan.yearlyPriceCents,
      recurring: { interval: 'year' },
      metadata: { plan_key: planKey, billing_interval: 'yearly' },
    });

    const upperKey = planKey.toUpperCase();
    envVars[`STRIPE_PRICE_${upperKey}_MONTHLY`] = monthlyPrice.id;
    envVars[`STRIPE_PRICE_${upperKey}_YEARLY`] = yearlyPrice.id;
  }

  return envVars;
}
