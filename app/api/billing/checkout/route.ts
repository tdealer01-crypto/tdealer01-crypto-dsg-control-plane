import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../../lib/supabase/server';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';

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
    const rateLimit = applyRateLimit({
      key: getRateLimitKey(request, 'billing-checkout'),
      limit: 20,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit, 20) }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: buildRateLimitHeaders(rateLimit, 20) }
      );
    }

    const body = await request.json().catch(() => null);

    const plan = normalizePlan(body?.plan);
    const interval = normalizeInterval(body?.interval);
    const customerEmail = body?.email ? String(body.email) : undefined;
    const orgId = body?.org_id ? String(body.org_id) : undefined;

    const { data: profile } = await supabase
      .from('users')
      .select('org_id, is_active, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile?.is_active || !profile?.org_id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: buildRateLimitHeaders(rateLimit, 20) }
      );
    }

    if (orgId && orgId !== profile.org_id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: buildRateLimitHeaders(rateLimit, 20) }
      );
    }

    const priceId = getPriceId(plan, interval);
    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price configuration for ${plan}/${interval}` },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_APP_URL' },
        { status: 500, headers: buildRateLimitHeaders(rateLimit, 20) }
      );
    }
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
      customer_email: customerEmail || profile.email || undefined,
      client_reference_id: orgId || String(profile.org_id),
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
    }, { headers: buildRateLimitHeaders(rateLimit, 20) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
