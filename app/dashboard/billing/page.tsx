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
