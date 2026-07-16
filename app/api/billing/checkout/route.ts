import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { ensureUserWorkspace, isWorkspaceFailure } from '../../../../lib/auth/ensure-user-workspace';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';
import { captureEvent } from '../../../../lib/telemetry/capture-event';
// Pricing/plan definitions live in the shared catalog — the single source
// of truth for every price shown or charged (lib/billing/pricing-catalog.ts).
import {
  GATE_PLANS as PLAN_CONFIG,
  SKILLS_BUNDLES as SKILLS_BUNDLE_CONFIG,
  MCP_SUBSCRIPTION as MCP_SUBSCRIPTION_CONFIG,
  isSkillsBundle,
  isMCPSubscription,
  getPriceId,
  type PlanKey,
  type SkillsBundleKey,
  type MCPSubscriptionKey,
  type BillingInterval,
} from '../../../../lib/billing/pricing-catalog';

export const dynamic = 'force-dynamic';

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

type CheckoutProfileResult =
  | {
      ok: true;
      profile: {
        auth_user_id: string;
        email: string | null;
        org_id: string;
        is_active: boolean;
      };
      bootstrapped: boolean;
    }
  | { ok: false; status: number; error: string };

async function resolveCheckoutProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null },
  email?: string | null
): Promise<CheckoutProfileResult> {
  const { data: existingProfile } = await supabase
    .from('users')
    .select('org_id, is_active, email')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (existingProfile?.org_id) {
    return {
      ok: true,
      bootstrapped: existingProfile.is_active !== true,
      profile: {
        auth_user_id: user.id,
        email: existingProfile.email || email || user.email || null,
        org_id: String(existingProfile.org_id),
        is_active: existingProfile.is_active === true,
      },
    };
  }

  return ensureUserWorkspace(getSupabaseAdmin(), {
    authUserId: user.id,
    email: email || user.email || null,
  });
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

    const workspace = await resolveCheckoutProfile(supabase, user, user.email || null);

    if (isWorkspaceFailure(workspace)) {
      return NextResponse.redirect(`${appUrl}/marketplace/skills?checkout=setup_failed`);
    }

    const profile = workspace.profile;
    const bundle = SKILLS_BUNDLE_CONFIG[plan];
    const unitAmount = interval === 'yearly' ? bundle.amountYearly : bundle.amountMonthly;
    const stripe = getStripeClient();
    const metadata: Record<string, string> = {
      plan_key: plan,
      billing_interval: interval,
      source: 'skills-marketplace',
      org_id: profile.org_id,
      auth_user_id: user.id,
    };

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
      client_reference_id: profile.org_id,
      allow_promotion_codes: true,
      metadata,
      subscription_data: { metadata },
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

    const workspace = await resolveCheckoutProfile(supabase, user, customerEmail || user.email || null);

    if (isWorkspaceFailure(workspace)) {
      return NextResponse.json(
        { error: workspace.error },
        { status: workspace.status, headers: buildRateLimitHeaders(rateLimit, 20) }
      );
    }

    const profile = workspace.profile;

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
    const resolvedOrgId = profile.org_id;
    const resolvedEmail = customerEmail || profile.email || user.email || undefined;
    const metadata: Record<string, string> = {
      billing_interval: interval,
      source: 'dsg-control-plane',
      org_id: resolvedOrgId,
      auth_user_id: user.id,
    };
    if (resolvedEmail) metadata.customer_email = resolvedEmail;

    let lineItems: Stripe.Checkout.SessionCreateParams['line_items'];
    let successUrl: string;
    let cancelUrl: string;
    let trialDays: number | undefined;

    if (isMCPSubscription(rawPlan)) {
      const subscription = MCP_SUBSCRIPTION_CONFIG[rawPlan];
      const priceEnv = subscription.priceEnv;
      const priceId = process.env[priceEnv];
      if (!priceId) {
        return NextResponse.json(
          { error: 'MCP subscription not yet available — price configuration pending (founder action required)' },
          { status: 503, headers: buildRateLimitHeaders(rateLimit, 20) }
        );
      }
      metadata.plan_key = rawPlan;
      lineItems = [{ price: priceId, quantity: 1 }];
      successUrl = `${appUrl}/dashboard/billing?checkout=success&plan=${rawPlan}&session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${appUrl}/dashboard/billing?checkout=cancelled&plan=${rawPlan}`;
    } else if (isSkillsBundle(rawPlan)) {
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

    // Get current org plan
    const admin = getSupabaseAdmin();
    const { data: org } = await admin
      .from('organizations')
      .select('plan')
      .eq('id', resolvedOrgId)
      .maybeSingle();

    const currentPlan = org?.plan || 'free';

    // Capture checkout_started event
    await captureEvent('checkout_started', {
      userId: user.id,
      organizationId: resolvedOrgId,
    }, {
      organization_id: resolvedOrgId,
      plan_tier: rawPlan,
      checkout_session_id: session.id,
      current_plan: currentPlan,
    });

    return NextResponse.json({ ok: true, url: session.url, session_id: session.id, plan: rawPlan, interval }, { headers: buildRateLimitHeaders(rateLimit, 20) });
  } catch (error) {
    return handleApiError('api/billing/checkout', error);
  }
}
