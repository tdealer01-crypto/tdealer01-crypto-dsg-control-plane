/**
 * GET /api/delivery-proof/pricing
 * Returns tiered pricing options for delivery proof scans
 */

import { NextResponse } from 'next/server';
import { DELIVERY_PROOF_TIERS } from '../../../../lib/delivery-proof/entitlement';

export const dynamic = 'force-dynamic';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: string;
  billingPeriod: 'one-time' | 'monthly';
  features: string[];
  cta: string;
  checkoutLink: string;
}

const PRICING_PAGES: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Start proving your AI governance',
    price: '$0',
    billingPeriod: 'monthly',
    features: [
      '1 scan per month',
      'Basic proof check (5 requirements)',
      'Shareable report link',
      'CCVS v1.2 evidence chain',
      'Public API access',
    ],
    cta: 'Start Free',
    checkoutLink: '/delivery-proof',
  },
  {
    id: 'pro_scan',
    name: 'Pro Scan',
    description: 'For agencies & SaaS teams',
    price: '$49',
    billingPeriod: 'one-time',
    features: [
      '1 additional scan (one-time)',
      'All Free features',
      'Priority support',
      'Webhook integration',
      'Advanced remediation tips',
    ],
    cta: 'Buy Single Scan',
    checkoutLink: '/billing?item=delivery_proof_scan_49',
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    description: 'Unlimited delivery proof scans',
    price: '$199',
    billingPeriod: 'monthly',
    features: [
      'Unlimited scans per month',
      'White-label report branding',
      'Team access (up to 5 users)',
      'Multi-project dashboard',
      'Audit export (JSON/CSV)',
      'Email + Slack notifications',
      'Priority support',
      'API key management',
    ],
    cta: 'Start 14-day Trial',
    checkoutLink: '/billing?plan=business',
  },
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    tiers: PRICING_PAGES,
    description: 'Delivery Proof Scan Pricing — Self-serve lead magnet to enterprise scaling',
  });
}
