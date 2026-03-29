'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type MonitorResponse = {
  ok: boolean;
  timestamp?: string;
  error?: string;
  core?: {
    health?: {
      ok?: boolean;
      status?: string;
      version?: string;
      error?: string;
    };
    metrics?: {
      ok?: boolean;
      data?: {
        requests_today?: number;
        allow_rate?: number;
        block_rate?: number;
        stabilize_rate?: number;
        active_agents?: number;
        avg_latency_ms?: number;
      };
      error?: string;
    };
    latest_sequence?: number | null;
    determinism?: {
      ok?: boolean;
      data?: {
        deterministic?: boolean;
        gate_action?: string;
      };
      error?: string;
    };
  };
  audit?: {
    count?: number;
    latest?: {
      gate_result?: string;
      entropy?: number | null;
      created_at?: string | null;
    } | null;
    error?: string | null;
  };
};

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/command-center', label: 'Command Center' },
  { href: '/dashboard/mission', label: 'Mission' },
  { href: '/dashboard/operations', label: 'Operations' },
  { href: '/dashboard/executions', label: 'Executions' },
  { href: '/dashboard/proofs', label: 'Proofs' },
  { href: '/dashboard/ledger', label: 'Ledger' },
  { href: '/dashboard/capacity', label: 'Capacity' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/audit', label: 'Audit' },
];

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AppShellPage() {
  const [monitor, setMonitor] = useState<MonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadMonitor() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/core/monitor', { cache: 'no-store' });
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error || 'Failed to load /api/core/monitor');
        }

        if (!active) return;
        setMonitor(json);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load live monitor');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMonitor();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const metrics = monitor?.core?.metrics?.data;
    return [
      { label: 'Core Health', value: monitor?.core?.health?.ok ? 'Online' : 'Offline' },
      { label: 'Requests Today', value: String(metrics?.requests_today ?? '-') },
      {
        label: 'Avg Latency',
        value: metrics?.avg_latency_ms != null ? `${metrics.avg_latency_ms} ms` : '-',
      },
      {
        label: 'Determinism',
        value: monitor?.core?.determinism?.ok
          ? monitor?.core?.determinism?.data?.deterministic
            ? 'PASS'
            : 'FAIL'
          : 'Unknown',
      },
    ];
  }, [monitor]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold">DSG ONE App Shell</h1>
        <p className="mt-2 text-slate-400">Unified entry page for the live command center routes.</p>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live monitor</p>
              <h2 className="mt-2 text-xl font-semibold">/api/core/monitor</h2>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
              {loading ? 'loading' : 'ready'}
            </span>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold">{loading ? '...' : item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300 md:grid-cols-2">
            <p>Latest sequence: {loading ? '...' : String(monitor?.core?.latest_sequence ?? '-')}</p>
            <p>Latest gate result: {loading ? '...' : monitor?.audit?.latest?.gate_result || '-'}</p>
            <p>Latest entropy: {loading ? '...' : String(monitor?.audit?.latest?.entropy ?? '-')}</p>
            <p>Last update: {loading ? '...' : formatDate(monitor?.timestamp)}</p>
          </div>
        </section>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 font-semibold text-slate-100 hover:border-emerald-400">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
