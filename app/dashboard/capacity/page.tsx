'use client';

import { useEffect, useState } from 'react';

type Capacity = {
  plan_key: string;
  billing_interval: string;
  subscription_status: string;
  billing_period: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  executions: number;
  included_executions: number;
  remaining_executions: number;
  utilization: number;
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

export default function CapacityPage() {
  const [data, setData] = useState<Capacity | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/api/capacity', { cache: 'no-store' })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!alive) return;
        if (!ok) throw new Error(json.error || 'Failed to load capacity');
        setData(json);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load capacity');
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold">Capacity</h1>
        <p className="mt-2 text-slate-400">Plan quota, remaining executions, utilization, and projected overage.</p>
        {error ? <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
        {data ? (
          <div className="mt-8 grid gap-6 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-sm text-slate-400">Plan</p><p className="mt-3 text-3xl font-semibold">{data.plan_key}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-sm text-slate-400">Executions</p><p className="mt-3 text-3xl font-semibold">{data.executions}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-sm text-slate-400">Remaining</p><p className="mt-3 text-3xl font-semibold">{data.remaining_executions}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-sm text-slate-400">Projected</p><p className="mt-3 text-3xl font-semibold">US${data.projected_amount_usd}</p></div>
          </div>
        ) : null}
        {data ? (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
            <p>Status: {data.subscription_status}</p>
            <p>Billing interval: {data.billing_interval}</p>
            <p>Billing period: {data.billing_period}</p>
            <p>Utilization: {data.utilization}</p>
            <p>Current period start: {formatDate(data.current_period_start)}</p>
            <p>Current period end: {formatDate(data.current_period_end)}</p>
            <p>Overage executions: {data.overage_executions}</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
