'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Interval = 'monthly' | 'yearly';

const plans = [
  {
    key: 'trial',
    name: 'Trial',
    monthly: 0,
    yearly: 0,
    executions: '1,000 / mo',
    trialDays: null,
    featured: false,
    cta: 'Start free',
    ctaHref: '/request-access',
    features: [
      '1,000 executions / month',
      'Agent chat (DSG Agent v2)',
      'Policy gate (PASS / BLOCK)',
      'Audit trail & ledger',
      'Finance governance dashboard',
      '14-day full access',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: 99,
    yearly: 79,
    executions: '10,000 / mo',
    trialDays: 14,
    featured: false,
    cta: 'Start Pro trial',
    features: [
      '10,000 executions / month',
      'Everything in Trial',
      'Approval workflow (multi-step)',
      'Email notifications (Resend)',
      'Evidence pack export',
      'Priority support',
    ],
  },
  {
    key: 'business',
    name: 'Business',
    monthly: 299,
    yearly: 249,
    executions: '100,000 / mo',
    trialDays: 14,
    featured: true,
    cta: 'Start Business trial',
    features: [
      '100,000 executions / month',
      'Everything in Pro',
      'Finance Governance Pack included',
      'Advanced policy rules',
      'Audit export (PDF + JSON)',
      'SSO / SAML ready',
      'Dedicated onboarding',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthly: 999,
    yearly: 849,
    executions: 'Custom',
    trialDays: 30,
    featured: false,
    cta: 'Start Enterprise pilot',
    features: [
      'Custom execution quota',
      'Everything in Business',
      'All skill packs included',
      'Custom skill builder',
      'SLA: 4h response',
      'Dedicated CSM',
      'On-prem / private cloud option',
    ],
  },
];

const addons = [
  { name: 'Finance Governance Pack', price: '$199/mo', href: '/api/billing/checkout?plan=finance_skills&interval=monthly' },
  { name: 'Dev Automation Pack',     price: '$99/mo',  href: '/api/billing/checkout?plan=dev_skills&interval=monthly' },
  { name: 'Compliance & Legal Pack', price: '$249/mo', href: '/api/billing/checkout?plan=compliance_skills&interval=monthly' },
  { name: 'Operations Pack',         price: '$149/mo', href: '/api/billing/checkout?plan=ops_skills&interval=monthly' },
];

export default function PricingPage() {
  const [interval, setInterval] = useState<Interval>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function handleCheckout(planKey: string) {
    setLoading(planKey);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: planKey, interval }),
      });
      if (res.status === 401) { router.push('/login?next=/pricing'); return; }
      const data = await res.json().catch(() => ({}));
      if (data?.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#07080a] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.15),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.12),transparent_35%)]" />
        <div className="relative mx-auto max-w-5xl px-6 py-16 text-center">
          <p className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-300">
            DSG ONE Pricing
          </p>
          <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">
            Governed AI — priced by usage
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Every plan includes policy gates, audit ledger, and approval workflow. Pay for executions, not seats.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/login" className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-black hover:bg-emerald-400">
              Start Trial
            </Link>
            <Link href="/demo" className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 hover:border-emerald-400">
              See demo
            </Link>
          </div>

          {/* Interval toggle */}
          <div className="mt-8 inline-flex rounded-xl border border-slate-700 bg-slate-900 p-1">
            {(['monthly', 'yearly'] as Interval[]).map((iv) => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className={[
                  'rounded-lg px-5 py-2 text-sm font-semibold transition',
                  interval === iv ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white',
                ].join(' ')}
              >
                {iv === 'monthly' ? 'Monthly' : 'Yearly'}
                {iv === 'yearly' && <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">–20%</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const price = interval === 'yearly' ? plan.yearly : plan.monthly;

            return (
              <article
                key={plan.key}
                className={[
                  'relative flex flex-col rounded-2xl border p-6',
                  plan.featured
                    ? 'border-emerald-500/40 bg-emerald-500/10 shadow-2xl shadow-emerald-950/30'
                    : 'border-white/10 bg-white/[0.03]',
                ].join(' ')}
              >
                {plan.featured && (
                  <span className="absolute right-4 top-4 rounded-full border border-emerald-400/30 bg-emerald-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                    Most popular
                  </span>
                )}

                <p className="text-[10px] uppercase tracking-widest text-slate-500">Plan</p>
                <h2 className="mt-3 text-2xl font-black">{plan.name}</h2>

                <div className="mt-4 flex items-end gap-1">
                  {price === 0 ? (
                    <span className="text-4xl font-black text-white">Free</span>
                  ) : (
                    <>
                      <span className="text-4xl font-black text-white">${price}</span>
                      <span className="pb-1 text-sm text-slate-400">/mo</span>
                    </>
                  )}
                </div>
                {interval === 'yearly' && price > 0 && (
                  <p className="text-xs text-emerald-400">billed ${price * 12}/yr</p>
                )}

                <p className="mt-2 text-xs text-slate-500">{plan.executions} executions</p>
                {plan.trialDays && (
                  <p className="text-xs text-emerald-400">{plan.trialDays}-day free trial</p>
                )}

                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-slate-300">
                      <span className="mt-0.5 text-emerald-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.key === 'trial' ? (
                  <Link
                    href={plan.ctaHref!}
                    className="mt-6 rounded-xl border border-emerald-400/40 py-3 text-center text-sm font-bold text-emerald-300 transition hover:bg-emerald-400/10"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.key)}
                    disabled={loading === plan.key}
                    className={[
                      'mt-6 rounded-xl py-3 text-center text-sm font-bold transition disabled:opacity-60',
                      plan.featured
                        ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                        : 'border border-white/15 text-slate-100 hover:border-emerald-400/40',
                    ].join(' ')}
                  >
                    {loading === plan.key ? 'Loading…' : plan.cta}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Add-ons */}
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <h2 className="text-xl font-bold">Skill Pack Add-ons</h2>
        <p className="mt-1 text-sm text-slate-400">Layer governed AI capabilities on any plan. <Link href="/marketplace/skills" className="text-emerald-400 hover:underline">Browse all skill packs →</Link></p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {addons.map((a) => (
            <div key={a.name} className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div>
                <p className="font-semibold text-slate-100">{a.name}</p>
                <p className="mt-1 text-lg font-black text-emerald-400">{a.price}</p>
              </div>
              <Link href={a.href} className="mt-4 rounded-xl border border-slate-700 py-2 text-center text-xs font-bold text-slate-300 hover:border-emerald-400 hover:text-emerald-300">
                Add to plan →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Demo CTA */}
      <section className="border-t border-white/10 py-14 text-center">
        <p className="text-2xl font-black">Not sure yet?</p>
        <p className="mt-2 text-slate-400">Try the interactive demo — no signup required.</p>
        <div className="mt-6 flex justify-center gap-4 flex-wrap">
          <Link href="/demo" className="rounded-2xl bg-emerald-500 px-8 py-4 font-bold text-black hover:bg-emerald-400">
            Try interactive demo →
          </Link>
          <Link href="/request-access" className="rounded-2xl border border-slate-700 px-8 py-4 font-bold text-slate-300 hover:border-emerald-400">
            Request access
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-600">No credit card required · Cancel anytime · Overage $0.001/execution</p>
      </section>
    </main>
  );
}
