#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

mkdir -p app/api/billing/checkout
mkdir -p app/api/billing/webhook
mkdir -p app/dashboard/billing
mkdir -p app/pricing
mkdir -p supabase/migrations

cat > app/api/billing/checkout/route.ts <<'FILE'
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

function getPriceId(plan: PlanKey, interval: BillingInterval) {
  const envName = PLAN_CONFIG[plan].priceEnv[interval];
  return process.env[envName] || '';
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
FILE

cat > app/api/billing/webhook/route.ts <<'FILE'
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

type PriceMapping = {
  planKey: string | null;
  billingInterval: string | null;
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

function getPriceMap(): Map<string, PriceMapping> {
  const map = new Map<string, PriceMapping>();

  const entries = [
    ['STRIPE_PRICE_PRO_MONTHLY', 'pro', 'monthly'],
    ['STRIPE_PRICE_PRO_YEARLY', 'pro', 'yearly'],
    ['STRIPE_PRICE_BUSINESS_MONTHLY', 'business', 'monthly'],
    ['STRIPE_PRICE_BUSINESS_YEARLY', 'business', 'yearly'],
    ['STRIPE_PRICE_ENTERPRISE_MONTHLY', 'enterprise', 'monthly'],
    ['STRIPE_PRICE_ENTERPRISE_YEARLY', 'enterprise', 'yearly'],
    ['STRIPE_PRICE_PRO', 'pro', 'monthly'],
    ['STRIPE_PRICE_BUSINESS', 'business', 'monthly'],
  ] as const;

  for (const [envName, planKey, billingInterval] of entries) {
    const value = process.env[envName];
    if (value) {
      map.set(value, { planKey, billingInterval });
    }
  }

  return map;
}

function toIso(value: number | null | undefined) {
  if (typeof value !== 'number') return null;
  return new Date(value * 1000).toISOString();
}

async function resolveOrgIdByEmail(supabase: any, email: string | null) {
  if (!email) return null;

  const { data, error } = await supabase
    .from('users')
    .select('org_id')
    .eq('email', email)
    .limit(1);

  if (error || !Array.isArray(data) || !data[0]?.org_id) {
    return null;
  }

  return String(data[0].org_id);
}

async function getBillingCustomer(supabase: any, stripeCustomerId: string | null) {
  if (!stripeCustomerId) return null;

  const { data, error } = await supabase
    .from('billing_customers')
    .select('stripe_customer_id, org_id, email, name')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

async function recordEvent(supabase: any, event: Stripe.Event) {
  const object = event.data.object as any;

  const stripeCustomerId =
    typeof object?.customer === 'string' ? object.customer : null;

  const stripeSubscriptionId =
    typeof object?.subscription === 'string'
      ? object.subscription
      : object?.object === 'subscription' && typeof object?.id === 'string'
        ? object.id
        : null;

  await supabase.from('billing_events').upsert(
    {
      stripe_event_id: event.id,
      event_type: event.type,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      payload: event as unknown as Record<string, unknown>,
      processed_at: new Date().toISOString(),
    },
    {
      onConflict: 'stripe_event_id',
    }
  );
}

async function upsertBillingCustomer(
  supabase: any,
  payload: {
    stripe_customer_id: string | null;
    org_id: string | null;
    email: string | null;
    name: string | null;
  }
) {
  if (!payload.stripe_customer_id) return;

  await supabase.from('billing_customers').upsert(
    {
      stripe_customer_id: payload.stripe_customer_id,
      org_id: payload.org_id,
      email: payload.email,
      name: payload.name,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'stripe_customer_id',
    }
  );
}

function subscriptionToRecord(
  subscription: Stripe.Subscription,
  extras: {
    orgId: string | null;
    customerEmail: string | null;
  }
) {
  const item = subscription.items.data[0];
  const priceId = item?.price?.id || null;

  const productValue = item?.price?.product;
  const productId =
    typeof productValue === 'string'
      ? productValue
      : typeof productValue?.id === 'string'
        ? productValue.id
        : null;

  const priceMap = getPriceMap();
  const derived = priceId ? priceMap.get(priceId) : undefined;

  return {
    stripe_subscription_id: subscription.id,
    stripe_customer_id:
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id || null,
    org_id: extras.orgId,
    customer_email: extras.customerEmail,
    status: subscription.status,
    plan_key: subscription.metadata?.plan_key || derived?.planKey || null,
    billing_interval:
      subscription.metadata?.billing_interval || derived?.billingInterval || null,
    price_id: priceId,
    product_id: productId,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    current_period_start: toIso(subscription.current_period_start),
    current_period_end: toIso(subscription.current_period_end),
    trial_start: toIso(subscription.trial_start),
    trial_end: toIso(subscription.trial_end),
    metadata: subscription.metadata || {},
    updated_at: new Date().toISOString(),
  };
}

async function upsertBillingSubscription(supabase: any, payload: Record<string, unknown>) {
  await supabase.from('billing_subscriptions').upsert(payload, {
    onConflict: 'stripe_subscription_id',
  });
}

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Missing STRIPE_WEBHOOK_SECRET' },
        { status: 500 }
      );
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const body = await request.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    const supabase = getSupabaseAdmin();

    await recordEvent(supabase, event);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const stripeCustomerId =
          typeof session.customer === 'string' ? session.customer : null;
        const customerEmail =
          session.customer_details?.email || session.customer_email || null;

        const explicitOrgId = session.metadata?.org_id || null;
        const orgId =
          explicitOrgId || (await resolveOrgIdByEmail(supabase, customerEmail));

        await upsertBillingCustomer(supabase, {
          stripe_customer_id: stripeCustomerId,
          org_id: orgId,
          email: customerEmail,
          name: session.customer_details?.name || null,
        });

        if (typeof session.subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription
          );

          await upsertBillingSubscription(
            supabase,
            subscriptionToRecord(subscription, {
              orgId,
              customerEmail,
            })
          );
        }

        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const stripeCustomerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : null;

        const billingCustomer = await getBillingCustomer(
          supabase,
          stripeCustomerId
        );

        await upsertBillingSubscription(
          supabase,
          subscriptionToRecord(subscription, {
            orgId: billingCustomer?.org_id || null,
            customerEmail: billingCustomer?.email || null,
          })
        );

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true, type: event.type });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 400 }
    );
  }
}
FILE

cat > app/api/usage/route.ts <<'FILE'
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const INCLUDED_EXECUTIONS: Record<string, number> = {
  trial: 1000,
  pro: 10000,
  business: 100000,
  enterprise: 1000000,
};

function formatPlanLabel(planKey?: string | null, interval?: string | null) {
  const normalized = String(planKey || 'trial').toLowerCase();
  const pretty =
    normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();

  if (!interval) return pretty;
  return `${pretty} (${interval})`;
}

function formatBillingPeriod(
  start?: string | null,
  end?: string | null,
  fallback?: string
) {
  if (start && end) {
    return `${String(start).slice(0, 10)} → ${String(end).slice(0, 10)}`;
  }

  return fallback || new Date().toISOString().slice(0, 7);
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: subscription, error: subscriptionError } = await supabase
      .from('billing_subscriptions')
      .select(
        'org_id, plan_key, billing_interval, status, current_period_start, current_period_end, trial_end, updated_at'
      )
      .in('status', ['trialing', 'active', 'past_due', 'unpaid', 'canceled'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      subscriptionError &&
      !/relation .* does not exist/i.test(subscriptionError.message)
    ) {
      return NextResponse.json(
        { error: subscriptionError.message },
        { status: 500 }
      );
    }

    const billingPeriodKey = subscription?.current_period_start
      ? String(subscription.current_period_start).slice(0, 7)
      : new Date().toISOString().slice(0, 7);

    let usageQuery = supabase
      .from('usage_counters')
      .select('executions')
      .eq('billing_period', billingPeriodKey);

    if (subscription?.org_id) {
      usageQuery = usageQuery.eq('org_id', subscription.org_id);
    }

    const { data: usageCounters, error: usageError } = await usageQuery;

    if (usageError) {
      return NextResponse.json({ error: usageError.message }, { status: 500 });
    }

    const executions = (usageCounters || []).reduce(
      (sum, row) => sum + Number(row.executions || 0),
      0
    );

    const planKey = String(subscription?.plan_key || 'trial').toLowerCase();
    const includedExecutions =
      INCLUDED_EXECUTIONS[planKey] || INCLUDED_EXECUTIONS.trial;

    const overageExecutions = Math.max(0, executions - includedExecutions);
    const projectedAmountUsd = Number((overageExecutions * 0.001).toFixed(3));

    return NextResponse.json({
      plan: formatPlanLabel(planKey, subscription?.billing_interval || null),
      subscription_status: subscription?.status || 'trialing',
      billing_period: formatBillingPeriod(
        subscription?.current_period_start || null,
        subscription?.current_period_end || null,
        billingPeriodKey
      ),
      current_period_start: subscription?.current_period_start || null,
      current_period_end: subscription?.current_period_end || null,
      trial_end: subscription?.trial_end || null,
      executions,
      included_executions: includedExecutions,
      overage_executions: overageExecutions,
      projected_amount_usd: projectedAmountUsd,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
FILE

cat > app/dashboard/billing/page.tsx <<'FILE'
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Usage = {
  plan: string;
  subscription_status?: string;
  billing_period: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  trial_end?: string | null;
  executions: number;
  included_executions: number;
  overage_executions: number;
  projected_amount_usd: number;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function BillingPage() {
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    fetch('/api/usage', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => setUsage(null));
  }, []);

  const cards = [
    { label: 'Plan', value: usage?.plan || 'loading' },
    { label: 'Status', value: usage?.subscription_status || '...' },
    { label: 'Executions', value: usage?.executions ?? '...' },
    {
      label: 'Projected',
      value: usage ? `US$${usage.projected_amount_usd}` : '...',
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.25em] text-emerald-400">
              Billing
            </p>
            <h1 className="text-4xl font-bold">Usage and Billing</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Review current plan, subscription status, included executions, and projected amount.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200"
            >
              Change Plan
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Billing period</h2>
          <p className="mt-3 text-slate-300">{usage?.billing_period || 'loading'}</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <p>Current period start: {formatDate(usage?.current_period_start)}</p>
            <p>Current period end: {formatDate(usage?.current_period_end)}</p>
            <p>Trial end: {formatDate(usage?.trial_end)}</p>
            <p>Overage executions: {usage?.overage_executions ?? '...'}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
FILE

cat > app/pricing/page.tsx <<'FILE'
'use client';

import Link from 'next/link';
import { useState } from 'react';

type BillingInterval = 'monthly' | 'yearly';
type PaidPlanKey = 'pro' | 'business' | 'enterprise';

type PlanCard = {
  key: 'trial' | PaidPlanKey;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  subtitle: string;
  trial: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

const plans: PlanCard[] = [
  {
    key: 'trial',
    name: 'Trial',
    monthlyPrice: 'Free',
    yearlyPrice: 'Free',
    subtitle: 'สำหรับการทดลอง flow แรก',
    trial: 'Evaluation access only',
    features: [
      '1 agent',
      '1,000 executions / month',
      'DSG dashboard access',
      'Basic workflow testing',
    ],
    cta: 'Start Trial',
  },
  {
    key: 'pro',
    name: 'Pro',
    monthlyPrice: 'US$99/mo',
    yearlyPrice: 'US$990/yr',
    subtitle: 'สำหรับ solo founder และทีมเล็ก',
    trial: '14-day free trial',
    features: [
      '5 agents',
      '10,000 executions included',
      'Hosted subscription checkout',
      'Supabase + webhook billing sync',
    ],
    cta: 'Start Pro',
    highlighted: true,
  },
  {
    key: 'business',
    name: 'Business',
    monthlyPrice: 'US$299/mo',
    yearlyPrice: 'US$2,990/yr',
    subtitle: 'สำหรับทีมที่เริ่มใช้งานจริง',
    trial: '14-day free trial',
    features: [
      '25 agents',
      '100,000 executions included',
      'Production workflow support',
      'Multi-user operations',
    ],
    cta: 'Start Business',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 'US$999/mo',
    yearlyPrice: 'US$9,990/yr',
    subtitle: 'สำหรับองค์กรและงานกำกับดูแลจริง',
    trial: '30-day pilot',
    features: [
      'Custom quotas',
      'Longer pilot window',
      'Governance-heavy deployments',
      'Audit exports + onboarding',
    ],
    cta: 'Start Enterprise Pilot',
  },
];

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<PaidPlanKey | null>(null);
  const [error, setError] = useState('');

  async function startCheckout(plan: PaidPlanKey) {
    try {
      setLoadingPlan(plan);
      setError('');

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          interval,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json?.url) {
        throw new Error(json?.error || 'Failed to start checkout');
      }

      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-emerald-400">
            Pricing
          </p>
          <h1 className="mb-6 text-4xl font-bold md:text-6xl">
            DSG Control Plane Pricing
          </h1>
          <p className="text-lg text-slate-300">
            Choose the plan that matches your team, execution volume, and governance needs.
          </p>

          <div className="mt-8 inline-flex rounded-2xl border border-slate-800 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setInterval('monthly')}
              className={[
                'rounded-xl px-4 py-2 text-sm font-semibold transition',
                interval === 'monthly'
                  ? 'bg-emerald-500 text-black'
                  : 'text-slate-300',
              ].join(' ')}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval('yearly')}
              className={[
                'rounded-xl px-4 py-2 text-sm font-semibold transition',
                interval === 'yearly'
                  ? 'bg-emerald-500 text-black'
                  : 'text-slate-300',
              ].join(' ')}
            >
              Yearly
            </button>
          </div>
        </div>

        {error ? (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-14 grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => {
            const price =
              interval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;

            return (
              <div
                key={plan.name}
                className={[
                  'rounded-2xl border p-6 shadow-lg',
                  plan.highlighted
                    ? 'border-emerald-400 bg-slate-900'
                    : 'border-slate-800 bg-slate-900/70',
                ].join(' ')}
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">{plan.name}</h2>
                  <p className="mt-2 text-3xl font-semibold">{price}</p>
                  <p className="mt-2 text-sm text-emerald-300">{plan.trial}</p>
                  <p className="mt-2 text-sm text-slate-400">{plan.subtitle}</p>
                </div>

                <ul className="space-y-3 text-sm text-slate-300">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>

                {plan.key === 'trial' ? (
                  <Link
                    href="/login"
                    className="mt-8 inline-block w-full rounded-xl border border-slate-700 px-4 py-3 text-center font-semibold text-white"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCheckout(plan.key)}
                    disabled={loadingPlan !== null}
                    className={[
                      'mt-8 inline-block w-full rounded-xl px-4 py-3 text-center font-semibold',
                      plan.highlighted
                        ? 'bg-emerald-500 text-black'
                        : 'border border-slate-700 text-white',
                      loadingPlan !== null ? 'opacity-70' : '',
                    ].join(' ')}
                  >
                    {loadingPlan === plan.key ? 'Redirecting...' : plan.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
          <p className="font-semibold text-white">Billing notes</p>
          <ul className="mt-3 space-y-2">
            <li>• Pro and Business start with a 14-day free trial.</li>
            <li>• Enterprise starts with a 30-day pilot configuration.</li>
            <li>• Checkout uses subscription pricing from live Stripe env values.</li>
            <li>• UI uses US$ labels while Stripe still uses currency code usd.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
FILE

cat > supabase/migrations/20260323110000_billing_checkout_flow.sql <<'FILE'
create extension if not exists pgcrypto;

create table if not exists public.billing_customers (
  stripe_customer_id text primary key,
  org_id text,
  email text,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  stripe_subscription_id text primary key,
  stripe_customer_id text references public.billing_customers(stripe_customer_id) on delete set null,
  org_id text,
  customer_email text,
  status text not null,
  plan_key text,
  billing_interval text,
  price_id text,
  product_id text,
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  stripe_event_id text primary key,
  event_type text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz not null default now()
);

create index if not exists idx_billing_customers_org_id
  on public.billing_customers(org_id);

create index if not exists idx_billing_customers_email
  on public.billing_customers(email);

create index if not exists idx_billing_subscriptions_org_id
  on public.billing_subscriptions(org_id);

create index if not exists idx_billing_subscriptions_customer_id
  on public.billing_subscriptions(stripe_customer_id);

create index if not exists idx_billing_subscriptions_status
  on public.billing_subscriptions(status);

create index if not exists idx_billing_subscriptions_plan_interval
  on public.billing_subscriptions(plan_key, billing_interval);

create index if not exists idx_billing_events_type_created_at
  on public.billing_events(event_type, created_at desc);
FILE

git add \
  app/api/billing/checkout/route.ts \
  app/api/billing/webhook/route.ts \
  app/api/usage/route.ts \
  app/dashboard/billing/page.tsx \
  app/pricing/page.tsx \
  supabase/migrations/20260323110000_billing_checkout_flow.sql

git commit -m "feat: complete billing checkout and webhook flow"
git push -u origin feat/billing-checkout-flow-complete
