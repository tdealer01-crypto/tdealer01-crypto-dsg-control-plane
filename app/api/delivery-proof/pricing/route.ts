/**
 * GET /api/delivery-proof/pricing
 * 
 * Returns tiered pricing options for delivery proof scans
 * Public endpoint — no authentication required
 * 
 * Response (200 OK):
 * {
 *   ok: true,
 *   tiers: [
 *     {
 *       id: "free" | "pro_scan" | "unlimited",
 *       name: string,
 *       description: string,
 *       price: "$0" | "$49" | "$199",
 *       billingPeriod: "monthly" | "one-time",
 *       features: string[],
 *       cta: string (call-to-action text),
 *       checkoutLink: string (URL to /billing or /delivery-proof)
 *     }
 *   ],
 *   description: "Delivery Proof Scan Pricing — Self-serve lead magnet to enterprise scaling"
 * }
 * 
 * Use cases:
 * - Populate pricing page at /pricing
 * - Show upgrade modals in scan result UI
 * - Display plan features in account settings
 */

import { NextResponse } from 'next/server';
import { DELIVERY_PROOF_TIERS } from '../../../../lib/delivery-proof/entitlement';
import { DELIVERY_PROOF_PRICING } from '../../../../lib/billing/pricing-catalog';

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
    price: DELIVERY_PROOF_PRICING.free.label,
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
    price: DELIVERY_PROOF_PRICING.pro_scan.label,
    billingPeriod: 'one-time',
    features: [
      '1 additional scan (one-time)',
      'All Free features',
      'Priority support',
      'Webhook integration',
      'Advanced remediation tips',
    ],
    cta: 'Buy Single Scan',
    checkoutLink: '/dashboard/billing?item=delivery_proof_scan_49',
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    description: 'Unlimited delivery proof scans',
    price: DELIVERY_PROOF_PRICING.unlimited.label,
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
    checkoutLink: '/dashboard/billing?plan=business',
  },
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    tiers: PRICING_PAGES,
    description: 'Delivery Proof Scan Pricing — Self-serve lead magnet to enterprise scaling',
  });
}
