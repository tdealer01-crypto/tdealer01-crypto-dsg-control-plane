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
