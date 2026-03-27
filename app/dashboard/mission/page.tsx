'use client';

import { useEffect, useState } from 'react';

type Health = {
  core_ok?: boolean;
  service?: string;
  timestamp?: string;
};

type Capacity = {
  executions: number;
  remaining_executions: number;
  utilization: number;
  projected_amount_usd: number;
};

export default function MissionPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch('/api/health', { cache: 'no-store' }).then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
      fetch('/api/capacity', { cache: 'no-store' }).then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
    ])
      .then(([healthRes, capacityRes]) => {
        if (!alive) return;
        if (!healthRes.ok) throw new Error(healthRes.json.error || 'Failed to load health');
        if (!capacityRes.ok) throw new Error(capacityRes.json.error || 'Failed to load capacity');
        setHealth(healthRes.json);
        setCapacity(capacityRes.json);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load mission');
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold">Mission</h1>
        <p className="mt-2 text-slate-400">Live summary for core health and capacity.</p>
        {error ? <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-sm text-slate-400">Service</p><p className="mt-3 text-3xl font-semibold">{health?.service || '-'}</p></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-sm text-slate-400">Core</p><p className="mt-3 text-3xl font-semibold">{health?.core_ok ? 'Online' : 'Offline'}</p></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-sm text-slate-400">Executions</p><p className="mt-3 text-3xl font-semibold">{capacity?.executions ?? 0}</p></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-sm text-slate-400">Remaining</p><p className="mt-3 text-3xl font-semibold">{capacity?.remaining_executions ?? 0}</p></div>
        </div>
      </div>
    </main>
  );
}
