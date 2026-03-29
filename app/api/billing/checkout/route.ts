import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

type PlanKey = 'pro' | 'business' | 'enterprise';
type BillingInterval = 'monthly' | 'yearly';

const PLAN_CONFIG: Record<
  PlanKey,
  {
    trialDays: number;
    priceEnv: Record<BillingInterval, string>;
  }
> = {
  pro: {
    trialDays: 14,
    priceEnv: {
      monthly: 'STRIPE_PRICE_PRO_MONTHLY',
      yearly: 'STRIPE_PRICE_PRO_YEARLY',
    },
  },
  business: {
    trialDays: 14,
    priceEnv: {
      monthly: 'STRIPE_PRICE_BUSINESS_MONTHLY',
      yearly: 'STRIPE_PRICE_BUSINESS_YEARLY',
    },
  },
  enterprise: {
    trialDays: 30,
    priceEnv: {
      monthly: 'STRIPE_PRICE_ENTERPRISE_MONTHLY',
      yearly: 'STRIPE_PRICE_ENTERPRISE_YEARLY',
    },
  },
};

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
}

function normalizePlan(value: unknown): PlanKey {
  const plan = String(value || 'pro').toLowerCase();
  if (plan === 'business') return 'business';
  if (plan === 'enterprise') return 'enterprise';
  return 'pro';
}

function normalizeInterval(value: unknown): BillingInterval {
  const interval = String(value || 'monthly').toLowerCase();
  if (interval === 'year' || interval === 'yearly') return 'yearly';
  return 'monthly';
}

function getLegacyMonthlyPriceId(plan: PlanKey) {
  if (plan === 'pro') return process.env.STRIPE_PRICE_PRO || '';
  if (plan === 'business') return process.env.STRIPE_PRICE_BUSINESS || '';
  return '';
}

function getPriceId(plan: PlanKey, interval: BillingInterval) {
  const envName = PLAN_CONFIG[plan].priceEnv[interval];
  const configured = process.env[envName] || '';

  if (configured) return configured;
  if (interval === 'monthly') return getLegacyMonthlyPriceId(plan);
  return '';
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const plan = normalizePlan(body?.plan);
    const interval = normalizeInterval(body?.interval);
    const customerEmail = body?.email ? String(body.email) : undefined;
    const orgId = body?.org_id ? String(body.org_id) : undefined;

    const priceId = getPriceId(plan, interval);
    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price configuration for ${plan}/${interval}` },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const stripe = getStripeClient();

    const metadata: Record<string, string> = {
      plan_key: plan,
      billing_interval: interval,
      source: 'dsg-control-plane',
    };

    if (orgId) metadata.org_id = orgId;
    if (customerEmail) metadata.customer_email = customerEmail;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled&plan=${plan}&interval=${interval}`,
      customer_email: customerEmail,
      client_reference_id: orgId,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata,
      subscription_data: {
        trial_period_days: PLAN_CONFIG[plan].trialDays,
        metadata,
      },
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
      session_id: session.id,
      plan,
      interval,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
