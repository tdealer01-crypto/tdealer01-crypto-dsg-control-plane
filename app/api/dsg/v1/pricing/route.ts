/**
 * GET /api/dsg/v1/pricing
 *
 * Public, single-purpose pricing contract for web and client applications.
 * Paid calls enter the authenticated direct-checkout handoff, which delegates
 * price resolution and Stripe session creation to /api/billing/checkout.
 */

import { NextResponse } from 'next/server';
import { DSG_GATE_TIERS } from '../../../../../lib/dsg/gate-entitlement';
import { GATE_PLANS } from '../../../../../lib/billing/pricing-catalog';

export const dynamic = 'force-dynamic';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: string;
  billingPeriod: 'monthly' | 'none';
  features: string[];
  cta: string;
  checkoutLink: string;
  highlight?: boolean;
}

const GATE_PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: DSG_GATE_TIERS.free.description,
    price: '$0',
    billingPeriod: 'none',
    features: DSG_GATE_TIERS.free.features,
    cta: 'Start Free',
    checkoutLink: '/dashboard/api-keys',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: DSG_GATE_TIERS.pro.description,
    price: `$${GATE_PLANS.pro.displayMonthlyUsd}`,
    billingPeriod: 'monthly',
    features: DSG_GATE_TIERS.pro.features,
    cta: 'Start Pro Checkout',
    checkoutLink: '/checkout/pro',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: DSG_GATE_TIERS.enterprise.description,
    price: `$${GATE_PLANS.enterprise.displayMonthlyUsd}`,
    billingPeriod: 'monthly',
    features: DSG_GATE_TIERS.enterprise.features,
    cta: 'Start Enterprise Checkout',
    checkoutLink: '/checkout/enterprise',
  },
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    product: 'DSG Compliance Verification & Gate API',
    tiers: GATE_PRICING_TIERS,
    description:
      'Automated compliance and AI-governance verification with persisted entitlement, idempotent usage evidence, and Stripe-backed billing.',
  });
}
