/**
 * GET /api/dsg/v1/pricing
 *
 * Public endpoint — no authentication required.
 * Returns DSG Gate API pricing tiers for use on /pricing page,
 * upgrade modals, and SDK documentation.
 *
 * Response (200 OK):
 * {
 *   ok: true,
 *   product: "DSG Gate API",
 *   tiers: [{ id, name, description, price, billingPeriod, features, cta, checkoutLink }],
 *   description: string
 * }
 */

import { NextResponse } from 'next/server';
import { DSG_GATE_TIERS } from '../../../../../lib/dsg/gate-entitlement';

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
    price: '$99',
    billingPeriod: 'monthly',
    features: DSG_GATE_TIERS.pro.features,
    cta: 'Upgrade to Pro',
    checkoutLink: '/billing?plan=dsg_gate_pro',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: DSG_GATE_TIERS.enterprise.description,
    price: '$499',
    billingPeriod: 'monthly',
    features: DSG_GATE_TIERS.enterprise.features,
    cta: 'Contact Sales',
    checkoutLink: '/billing?plan=dsg_gate_enterprise',
  },
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    product: 'DSG Gate API',
    tiers: GATE_PRICING_TIERS,
    description:
      'DSG Gate API — Deterministic AI governance with cryptographic proof. Same input → same decision, always.',
  });
}
