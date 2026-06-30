'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface RevenueStat {
  label: string;
  value: string;
  delta?: string;
  icon: string;
  color: string;
}

interface ConversionData {
  period: string;
  completed: number;
  expired: number;
  paid: number;
  churned: number;
}

interface RevenueKpisResponse {
  ok: boolean;
  window_days: number;
  metrics: {
    trial_to_paid_conversion_pct: number | null;
    mrr_usd: number;
    churn_rate_pct: number | null;
    arpa_usd: number | null;
    checkout_completion_rate_pct: number | null;
    active_subscriptions: number;
    canceled_subscriptions_window: number;
  };
  weekly_funnel: Array<{
    week_start: string;
    checkout_completed: number;
    checkout_expired: number;
    paid_activations: number;
    churned: number;
  }>;
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

export default function RevenueDashboard() {
  const [stats, setStats] = useState<RevenueStat[]>([]);
  const [conversions, setConversions] = useState<ConversionData[]>([]);
  const [windowDays, setWindowDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setError(null);
        const res = await fetch('/api/usage/kpis?days=30', { cache: 'no-store' });
        const data = (await res.json().catch(() => null)) as RevenueKpisResponse | { error?: string } | null;

        if (!res.ok || !data || !('ok' in data) || !data.ok) {
          setError((data && 'error' in data && data.error) || 'Unable to load revenue metrics');
          setStats([]);
          setConversions([]);
          return;
        }

        setWindowDays(data.window_days);

        const liveStats: RevenueStat[] = [
          {
            label: 'Monthly Recurring Revenue',
            value: formatCurrency(data.metrics.mrr_usd),
            delta: `${data.metrics.active_subscriptions} active subscription${data.metrics.active_subscriptions === 1 ? '' : 's'}`,
            icon: '💰',
            color: 'emerald',
          },
          {
            label: 'Trial → Paid',
            value: formatPercent(data.metrics.trial_to_paid_conversion_pct),
            delta: `Last ${data.window_days} days`,
            icon: '📊',
            color: 'blue',
          },
          {
            label: 'Checkout Completion',
            value: formatPercent(data.metrics.checkout_completion_rate_pct),
            delta: `Churn ${formatPercent(data.metrics.churn_rate_pct)}`,
            icon: '🔌',
            color: 'cyan',
          },
          {
            label: 'Average Revenue / Account',
            value: formatCurrency(data.metrics.arpa_usd),
            delta: `${data.metrics.canceled_subscriptions_window} canceled in window`,
            icon: '🎨',
            color: 'purple',
          },
        ];

        const liveConversions = data.weekly_funnel.map((row) => ({
          period: row.week_start,
          completed: row.checkout_completed,
          expired: row.checkout_expired,
          paid: row.paid_activations,
          churned: row.churned,
        }));

        setStats(liveStats);
        setConversions(liveConversions);
      } catch (error) {
        console.error('Failed to fetch revenue metrics:', error);
        setError('Unable to load revenue metrics');
        setStats([]);
        setConversions([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchMetrics();
  }, []);

  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    blue: 'border-blue-400/30 bg-blue-400/10 text-blue-200',
    cyan: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
    purple: 'border-purple-400/30 bg-purple-400/10 text-purple-200',
  };

  return (
    <main className="min-h-screen bg-[#07080a] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">DSG Control Plane</p>
          <h1 className="mt-3 text-4xl font-bold">Revenue Dashboard</h1>
          <p className="mt-2 text-slate-400">Track live subscription and checkout performance from billing data</p>
        </div>

        {/* Top metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 animate-pulse">
                <div className="h-3 w-32 rounded bg-white/10" />
                <div className="mt-4 h-10 w-24 rounded bg-white/10" />
                <div className="mt-3 h-3 w-28 rounded bg-white/10" />
              </div>
            ))
          ) : (
            stats.map((stat, idx) => (
              <div key={idx} className={`rounded-2xl border p-6 ${colorMap[stat.color] || colorMap.emerald}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                    <p className="mt-3 text-3xl font-bold text-white">{stat.value}</p>
                    {stat.delta && (
                      <p className="mt-2 text-xs text-slate-400">{stat.delta}</p>
                    )}
                  </div>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Conversion funnel */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 mb-12">
          <h2 className="text-2xl font-semibold">Weekly Revenue Funnel</h2>
          <p className="mt-1 text-slate-400">Live checkout and subscription events for the last {windowDays} days</p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-semibold text-slate-400">Week</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-400">Checkout completed</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-400">Checkout expired</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-400">Paid activations</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-400">Churned</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-white/5">
                      {Array.from({ length: 5 }).map((__, cellIdx) => (
                        <td key={cellIdx} className="px-4 py-4">
                          <div className="h-4 rounded bg-white/10" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : conversions.length > 0 ? (
                  conversions.map((row) => (
                    <tr key={row.period} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="py-4 px-4 font-medium">{row.period}</td>
                      <td className="text-right py-4 px-4 text-slate-400">{row.completed}</td>
                      <td className="text-right py-4 px-4 text-slate-400">{row.expired}</td>
                      <td className="text-right py-4 px-4 text-emerald-300 font-semibold">{row.paid}</td>
                      <td className="text-right py-4 px-4 text-slate-400">{row.churned}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No billing events found for this org in the current window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {error ? (
            <div className="mt-6 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-200">
              {error}
            </div>
          ) : (
            <div className="mt-6 p-4 rounded-lg bg-blue-400/5 border border-blue-400/20">
              <p className="text-xs text-blue-300">
                💡 <strong>Source:</strong> This dashboard now reads live subscription and checkout metrics from `/api/usage/kpis`.
              </p>
            </div>
          )}
        </div>

        {/* Implementation roadmap */}
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-8">
          <h2 className="text-2xl font-semibold">Quick Actions</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Link
              href="/dashboard/billing"
              className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 hover:border-amber-400/60 hover:bg-amber-400/10 transition"
            >
              <p className="font-semibold text-white">View Billing Plans</p>
              <p className="mt-1 text-sm text-slate-400">Check current subscription tiers and pricing</p>
            </Link>

            <Link
              href="/delivery-proof"
              className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 hover:border-emerald-400/60 hover:bg-emerald-400/10 transition"
            >
              <p className="font-semibold text-white">Test Delivery Proof</p>
              <p className="mt-1 text-sm text-slate-400">Generate a free proof scan to test upgrade flow</p>
            </Link>

            <Link
              href="/dashboard/api-keys"
              className="rounded-xl border border-cyan-400/40 bg-cyan-400/5 p-4 hover:border-cyan-400/60 hover:bg-cyan-400/10 transition"
            >
              <p className="font-semibold text-white">Manage API Keys</p>
              <p className="mt-1 text-sm text-slate-400">View and create API keys for customer integrations</p>
            </Link>

            <Link
              href="/dashboard/team"
              className="rounded-xl border border-purple-400/40 bg-purple-400/5 p-4 hover:border-purple-400/60 hover:bg-purple-400/10 transition"
            >
              <p className="font-semibold text-white">Team Management</p>
              <p className="mt-1 text-sm text-slate-400">Invite team members to help with sales</p>
            </Link>
          </div>
        </div>

        {/* Status callout */}
        <div className="mt-8 rounded-2xl border border-slate-700/50 bg-slate-950/30 p-6">
          <p className="text-sm text-slate-300">
            📌 <strong>Status:</strong> Revenue dashboard is backed by live billing tables for subscription, checkout, and churn signals.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </main>
  );
}
