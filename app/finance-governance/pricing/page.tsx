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
    name: 'Starter',
    monthlyPrice: 'Free',
    yearlyPrice: 'Free',
    subtitle: 'Best for first finance workflow evaluation and stakeholder review',
    trial: 'No card required',
    features: [
      '1 finance workflow workspace',
      'Baseline approval queue',
      'Policy setup for one workflow',
      'Audit timeline visibility',
    ],
    cta: 'Start Starter Trial',
  },
  {
    key: 'pro',
    name: 'Growth',
    monthlyPrice: 'US$99/mo',
    yearlyPrice: 'US$990/yr',
    subtitle: 'Best for finance teams moving from spreadsheets and email into governed approvals',
    trial: '14-day free trial',
    features: [
      'Multi-step approval routing',
      'Maker-checker enforcement',
      'Exception handling',
      'Approval dashboards',
    ],
    cta: 'Start Growth',
    highlighted: true,
  },
  {
    key: 'business',
    name: 'Enterprise',
    monthlyPrice: 'US$299/mo',
    yearlyPrice: 'US$2,990/yr',
    subtitle: 'Best for audit-heavy deployments, identity integration, and governance-first rollout support',
    trial: '30-day pilot',
    features: [
      'SSO and SCIM readiness',
      'Advanced segregation-of-duties support',
      'Evidence bundle export',
      'Governance onboarding support',
    ],
    cta: 'Start Enterprise Pilot',
  },
  {
    key: 'enterprise',
    name: 'Custom',
    monthlyPrice: 'Contact us',
    yearlyPrice: 'Contact us',
    subtitle: 'Best for complex entities, dedicated rollout planning, and custom retention requirements',
    trial: 'Custom commercial plan',
    features: [
      'Custom workflow volume',
      'Private rollout support',
      'Trust and security review path',
      'Deployment planning with support',
    ],
    cta: 'Talk to Sales',
  },
];

function isPaidPlanKey(planKey: PlanCard['key']): planKey is PaidPlanKey {
  return planKey === 'pro' || planKey === 'business' || planKey === 'enterprise';
}

export default function FinanceGovernancePricingPage() {
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
            Pricing built for policy-enforced finance workflows
          </div>
          <h1 className="mt-8 text-4xl font-bold md:text-6xl">Choose the plan that matches your finance governance workflow.</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            DSG pricing is built for finance, compliance, and audit teams that need maker-checker controls, policy-enforced approvals, and exportable evidence for every decision.
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
                    aria-label="Start starter trial"
                    className="mt-8 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center font-semibold text-white"
                  >
                    {plan.cta}
                  </Link>
                ) : plan.key === 'enterprise' ? (
                  <Link
                    href="/finance-governance"
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
            <p className="text-lg font-semibold text-white">Why these plans map to real finance teams</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>• Starter lowers friction for teams validating one approval workflow with real stakeholders.</li>
              <li>• Growth supports production finance operations that need multi-step approvals and exception handling.</li>
              <li>• Enterprise gives room for audit-heavy rollouts, governance onboarding, and identity integration.</li>
              <li>• Packaging is tied to governance maturity, not vague AI usage language.</li>
            </ul>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
            <p className="text-lg font-semibold text-white">Billing notes</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>• Starter can be used to validate one governed workflow before broader rollout.</li>
              <li>• Growth starts with a 14-day self-serve trial for teams ready to operationalize approvals.</li>
              <li>• Enterprise starts with a 30-day pilot for buyer validation, security review, and rollout planning.</li>
              <li>• Checkout and subscription management are backed by Stripe Billing and Stripe Customer Portal.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
