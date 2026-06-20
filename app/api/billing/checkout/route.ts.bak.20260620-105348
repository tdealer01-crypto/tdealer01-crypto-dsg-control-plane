import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../../lib/supabase/server';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

type PlanKey = 'pro' | 'business' | 'enterprise';
type SkillsBundleKey = 'finance_skills' | 'dev_skills' | 'compliance_skills' | 'ops_skills' | 'enterprise_skills';
type BillingInterval = 'monthly' | 'yearly';

const PLAN_CONFIG: Record<PlanKey, { trialDays: number; priceEnv: Record<BillingInterval, string> }> = {
  pro:        { trialDays: 14, priceEnv: { monthly: 'STRIPE_PRICE_PRO_MONTHLY',        yearly: 'STRIPE_PRICE_PRO_YEARLY' } },
  business:   { trialDays: 14, priceEnv: { monthly: 'STRIPE_PRICE_BUSINESS_MONTHLY',   yearly: 'STRIPE_PRICE_BUSINESS_YEARLY' } },
  enterprise: { trialDays: 30, priceEnv: { monthly: 'STRIPE_PRICE_ENTERPRISE_MONTHLY', yearly: 'STRIPE_PRICE_ENTERPRISE_YEARLY' } },
};

// Skills bundles use inline price_data (no pre-created Stripe price IDs needed)
const SKILLS_BUNDLE_CONFIG: Record<SkillsBundleKey, { name: string; amountMonthly: number; amountYearly: number }> = {
  finance_skills:    { name: 'DSG Finance Governance Pack',  amountMonthly: 19900, amountYearly: 179100 },
  dev_skills:        { name: 'DSG Dev Automation Pack',      amountMonthly:  9900, amountYearly:  89100 },
  compliance_skills: { name: 'DSG Compliance & Legal Pack',  amountMonthly: 24900, amountYearly: 224100 },
  ops_skills:        { name: 'DSG Operations Pack',          amountMonthly: 14900, amountYearly: 134100 },
  enterprise_skills: { name: 'DSG Enterprise Bundle',        amountMonthly: 59900, amountYearly: 539100 },
};

function isSkillsBundle(plan: string): plan is SkillsBundleKey {
  return plan in SKILLS_BUNDLE_CONFIG;
}

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  return new Stripe(secretKey);
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

// GET handler: used by skills marketplace Link hrefs
// GET /api/billing/checkout?plan=finance_skills&interval=monthly
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const plan = searchParams.get('plan') ?? '';
  const interval = normalizeInterval(searchParams.get('interval'));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (!isSkillsBundle(plan)) {
    return NextResponse.redirect(`${appUrl}/pricing`);
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(`${appUrl}/login?next=/marketplace/skills`);
    }

    const { data: profile } = await supabase
      .from('users')
      .select('org_id, is_active, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile?.is_active || !profile?.org_id) {
      return NextResponse.redirect(`${appUrl}/login?next=/marketplace/skills`);
    }

    const bundle = SKILLS_BUNDLE_CONFIG[plan];
    const unitAmount = interval === 'yearly' ? bundle.amountYearly : bundle.amountMonthly;
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: bundle.name },
          recurring: { interval: interval === 'yearly' ? 'year' : 'month' },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/dashboard/billing?checkout=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/marketplace/skills?checkout=cancelled`,
      customer_email: profile.email ?? undefined,
      client_reference_id: String(profile.org_id),
      allow_promotion_codes: true,
      metadata: { plan_key: plan, billing_interval: interval, source: 'skills-marketplace', org_id: String(profile.org_id) },
      subscription_data: { metadata: { plan_key: plan, billing_interval: interval, org_id: String(profile.org_id) } },
    });

    return NextResponse.redirect(session.url ?? `${appUrl}/marketplace/skills`);
  } catch (error) {
    return handleApiError('api/billing/checkout/get', error);
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
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

    const rawPlan = String(body?.plan || 'pro').toLowerCase();
    const interval = normalizeInterval(body?.interval);
    const customerEmail = body?.email ? String(body.email) : undefined;
    const orgId = body?.org_id ? String(body.org_id) : undefined;

    const { data: profile } = await supabase
      .from('users')
      .select('org_id, is_active, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile?.is_active || !profile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: buildRateLimitHeaders(rateLimit, 20) });
    }

    if (orgId && orgId !== profile.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: buildRateLimitHeaders(rateLimit, 20) });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return handleApiError('api/billing/checkout', new Error('Missing NEXT_PUBLIC_APP_URL'), {
        details: { stage: 'app-url-config' },
        headers: buildRateLimitHeaders(rateLimit, 20),
      });
    }

    const stripe = getStripeClient();
    const resolvedOrgId = orgId || String(profile.org_id);
    const resolvedEmail = customerEmail || profile.email || undefined;
    const metadata: Record<string, string> = { billing_interval: interval, source: 'dsg-control-plane', org_id: resolvedOrgId };
    if (resolvedEmail) metadata.customer_email = resolvedEmail;

    let lineItems: Stripe.Checkout.SessionCreateParams['line_items'];
    let successUrl: string;
    let cancelUrl: string;
    let trialDays: number | undefined;

    if (isSkillsBundle(rawPlan)) {
      const bundle = SKILLS_BUNDLE_CONFIG[rawPlan];
      const unitAmount = interval === 'yearly' ? bundle.amountYearly : bundle.amountMonthly;
      metadata.plan_key = rawPlan;
      lineItems = [{ price_data: { currency: 'usd', product_data: { name: bundle.name }, recurring: { interval: interval === 'yearly' ? 'year' : 'month' }, unit_amount: unitAmount }, quantity: 1 }];
      successUrl = `${appUrl}/dashboard/billing?checkout=success&plan=${rawPlan}&session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${appUrl}/marketplace/skills?checkout=cancelled`;
    } else {
      const plan = normalizePlan(rawPlan);
      const priceId = getPriceId(plan, interval);
      if (!priceId) {
        return handleApiError('api/billing/checkout', new Error('Missing Stripe price configuration'), { details: { plan, interval, stage: 'price-config' } });
      }
      metadata.plan_key = plan;
      lineItems = [{ price: priceId, quantity: 1 }];
      trialDays = PLAN_CONFIG[plan].trialDays;
      successUrl = `${appUrl}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${appUrl}/pricing?checkout=cancelled&plan=${plan}&interval=${interval}`;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: resolvedEmail,
      client_reference_id: resolvedOrgId,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata,
      subscription_data: { ...(trialDays ? { trial_period_days: trialDays } : {}), metadata },
    });

    return NextResponse.json({ ok: true, url: session.url, session_id: session.id, plan: rawPlan, interval }, { headers: buildRateLimitHeaders(rateLimit, 20) });
  } catch (error) {
    return handleApiError('api/billing/checkout', error);
  }
}
