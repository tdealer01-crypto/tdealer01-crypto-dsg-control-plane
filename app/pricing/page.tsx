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
    subtitle: 'Best for first evaluation and stakeholder review',
    trial: 'No card required',
    features: [
      '1 agent sandbox',
      '1,000 executions / month',
      'Dashboard visibility',
      'Basic workflow testing',
    ],
    cta: 'Start Trial',
  },
  {
    key: 'pro',
    name: 'Pro',
    monthlyPrice: 'US$99/mo',
    yearlyPrice: 'US$990/yr',
    subtitle: 'Best for solo founders and lean product teams',
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
    subtitle: 'Best for production AI workflows',
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
    subtitle: 'Best for audit-heavy and governance-first deployments',
    trial: '30-day pilot',
    features: [
      'Custom quotas',
      'Longer pilot window',
      'Governance onboarding',
      'Audit exports + rollout support',
    ],
    cta: 'Start Enterprise Pilot',
  },
];

function isPaidPlanKey(planKey: PlanCard['key']): planKey is PaidPlanKey {
  return planKey === 'pro' || planKey === 'business' || planKey === 'enterprise';
}

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
    <main className="min-h-screen px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
            Pricing that maps directly to execution volume
          </div>
          <h1 className="mt-8 text-4xl font-bold md:text-6xl">Choose the plan that matches your AI control surface.</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            DSG is already wired for subscription checkout. These plans turn governance, audit, and usage visibility into a clean commercial offer.
          </p>

          <div className="mt-8 inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setInterval('monthly')}
              className={[
                'rounded-xl px-5 py-3 text-sm font-semibold transition',
                interval === 'monthly' ? 'bg-emerald-400 text-slate-950' : 'text-slate-300',
              ].join(' ')}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval('yearly')}
              className={[
                'rounded-xl px-5 py-3 text-sm font-semibold transition',
                interval === 'yearly' ? 'bg-emerald-400 text-slate-950' : 'text-slate-300',
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
            const price = interval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;

            return (
              <div
                key={plan.name}
                className={[
                  'rounded-[1.75rem] border p-6 backdrop-blur-sm',
                  plan.highlighted
                    ? 'border-emerald-400/50 bg-emerald-400/10 shadow-glow'
                    : 'border-white/10 bg-white/5',
                ].join(' ')}
              >
                <div className="mb-6">
                  {plan.highlighted ? (
                    <div className="mb-4 inline-flex rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-950">
                      Most popular
                    </div>
                  ) : null}
                  <h2 className="text-2xl font-bold">{plan.name}</h2>
                  <p className="mt-3 text-4xl font-semibold">{price}</p>
                  <p className="mt-3 text-sm text-emerald-200">{plan.trial}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{plan.subtitle}</p>
                </div>

                <ul className="space-y-3 text-sm text-slate-200">
                  {plan.features.map((feature) => (
                    <li key={feature} className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.key === 'trial' ? (
                  <Link
                    href="/login"
                    aria-label="Start trial from login"
                    className="mt-8 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center font-semibold text-white"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (isPaidPlanKey(plan.key)) {
                        void startCheckout(plan.key);
                      }
                    }}
                    disabled={loadingPlan !== null}
                    className={[
                      'mt-8 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-center font-semibold transition',
                      plan.highlighted
                        ? 'bg-emerald-400 text-slate-950'
                        : 'border border-white/10 bg-white/5 text-white',
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

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
            <p className="text-lg font-semibold text-white">Why this pricing works</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>• Trial lowers friction for technical evaluation.</li>
              <li>• Pro creates a clean self-serve entry point.</li>
              <li>• Business matches real production traffic and team workflows.</li>
              <li>• Enterprise gives you room for pilots, governance support, and audit exports.</li>
            </ul>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
            <p className="text-lg font-semibold text-white">Billing notes</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>• Pro and Business start with a 14-day free trial.</li>
              <li>• Enterprise starts with a 30-day pilot configuration.</li>
              <li>• Checkout uses subscription pricing from live Stripe env values.</li>
              <li>• UI uses US$ labels while Stripe still uses currency code usd.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
