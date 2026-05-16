'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type PlanKey = 'pro' | 'business' | 'enterprise';

const PLANS: { key: PlanKey; title: string; price: string; features: string[] }[] = [
  {
    key: 'pro',
    title: 'Pro',
    price: '$99/mo',
    features: ['60 req/min gate limit', '10 agents', 'PDF export'],
  },
  {
    key: 'business',
    title: 'Business',
    price: '$299/mo',
    features: ['300 req/min gate limit', '50 agents', 'Audit ledger'],
  },
  {
    key: 'enterprise',
    title: 'Enterprise',
    price: '$799/mo',
    features: ['Unlimited gates', 'Unlimited agents', 'SLA + support'],
  },
];

function UpgradeCard({
  plan,
  currentPlan,
}: {
  plan: (typeof PLANS)[number];
  currentPlan?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrent =
    typeof currentPlan === 'string' &&
    currentPlan.toLowerCase() === plan.key.toLowerCase();

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.key, interval: 'monthly' }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Checkout failed');
      }
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{plan.title}</h3>
        {isCurrent && (
          <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-400">
            Current
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold">{plan.price}</p>
      <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-300">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <span className="text-emerald-400">&#10003;</span>
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <button
          onClick={handleUpgrade}
          disabled={loading || isCurrent}
          className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Redirecting…' : isCurrent ? 'Current Plan' : 'Upgrade'}
        </button>
        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}

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
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to load usage');
        return r.json();
      })
      .then((data) => setUsage(data))
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

        <div className="mt-12">
          <h2 className="text-2xl font-semibold">Upgrade Plan</h2>
          <p className="mt-2 text-slate-300">
            Choose a plan that fits your team&apos;s needs.
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <UpgradeCard key={plan.key} plan={plan} currentPlan={usage?.plan} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
