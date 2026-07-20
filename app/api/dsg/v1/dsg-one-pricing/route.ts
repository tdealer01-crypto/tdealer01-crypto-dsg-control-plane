/**
 * GET /api/dsg/v1/dsg-one-pricing
 *
 * Public endpoint — no authentication required.
 * Returns DSG ONE Marketplace pricing tiers.
 *
 * Response (200 OK):
 * {
 *   ok: true,
 *   product: "DSG ONE",
 *   tiers: [{ id, name, description, price, billingPeriod, features, cta, checkoutLink }],
 *   description: string
 * }
 */

import { NextResponse } from 'next/server';

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

const DSG_ONE_PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'DSG ONE Free',
    description: 'Get started with AI governance',
    price: '$0',
    billingPeriod: 'none',
    features: [
      '5 audit logs per month',
      'Limited replay capability',
      'Basic policy templates',
      'Email support',
      'Single workspace',
    ],
    cta: 'Start Free',
    checkoutLink: '/signup?plan=free',
  },
  {
    id: 'pro',
    name: 'DSG ONE',
    description: 'Complete AI operations control plane',
    price: '$99',
    billingPeriod: 'monthly',
    features: [
      'Unlimited policies',
      'Unlimited audit logs (queryable, exportable)',
      'Unlimited replay (rerun any decision)',
      'Unlimited integrations (Stripe, OpenAI, GitHub, etc.)',
      'Unlimited approvals (human sign-off workflows)',
      'Unlimited dashboards & alerts',
      'Unlimited evidence export (JSON, CSV)',
      'Priority support',
      'Multiple workspaces',
      'Custom integrations',
    ],
    cta: 'Start 14-Day Trial',
    checkoutLink: '/signup?plan=pro&trial=true',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom deployment & support',
    price: 'Custom',
    billingPeriod: 'monthly',
    features: [
      'Everything in DSG ONE',
      'Self-hosted deployment',
      'Custom SLA & support',
      'Dedicated account manager',
      'Advanced compliance features',
      'Custom billing cycles',
    ],
    cta: 'Contact Sales',
    checkoutLink: 'mailto:sales@dsg.pics',
  },
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    product: 'DSG ONE',
    tiers: DSG_ONE_PRICING_TIERS,
    description:
      'DSG ONE — The control plane for AI operations. Monitor every decision. Verify before execution. Audit and replay proof. Optimize costs.',
  });
}
