'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Skeleton } from '@/components/Skeleton';

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

interface RevenueEventRecord {
  id: string;
  createdAt: string;
  eventType: string;
  planId: string | null;
  amount: number | null;
  currency: string;
  source: string;
  metadata: Record<string, unknown> | null;
}

const KPI_WINDOW_DAYS = 30;
const WEBHOOK_HEALTH_THRESHOLD_MS = 24 * 60 * 60 * 1000;

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
  const [recentEvents, setRecentEvents] = useState<RevenueEventRecord[]>([]);
  const [windowDays, setWindowDays] = useState(KPI_WINDOW_DAYS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setError(null);
        const [metricsRes, eventsRes] = await Promise.all([
          fetch(`/api/usage/kpis?days=${KPI_WINDOW_DAYS}`, { cache: 'no-store' }),
          fetch('/api/revenue/events?limit=12', { cache: 'no-store' }),
        ]);

        const data = (await metricsRes.json().catch((parseError) => {
          console.error('Failed to parse revenue KPI response:', parseError);
          return null;
        })) as RevenueKpisResponse | { error?: string } | null;
        const eventsData = (await eventsRes.json().catch((parseError) => {
          console.error('Failed to parse revenue events response:', parseError);
          return null;
        })) as { ok?: boolean; events?: RevenueEventRecord[] } | null;

        if (!metricsRes.ok || !data || !('ok' in data) || !data.ok) {
          setError((data && 'error' in data && data.error) || 'Unable to load revenue metrics');
          setStats([]);
          setConversions([]);
          setRecentEvents([]);
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
        setRecentEvents(eventsData?.ok ? eventsData.events ?? [] : []);
      } catch (error) {
        console.error('Failed to fetch revenue metrics:', error);
        setError('Unable to load revenue metrics');
        setStats([]);
        setConversions([]);
        setRecentEvents([]);
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
  const lastWebhookEvent = recentEvents.find((event) => event.source.startsWith('stripe.'));
  const webhookHealthy = lastWebhookEvent
    ? Date.now() - new Date(lastWebhookEvent.createdAt).getTime() < WEBHOOK_HEALTH_THRESHOLD_MS
    : false;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Revenue Dashboard"
          description="Track live subscription and checkout performance from billing data"
        />

        {loading && (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}

        {!loading && stats.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {stats.map((stat, idx) => {
              const variantMap: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
                emerald: 'success',
                blue: 'info',
                cyan: 'info',
                purple: 'default',
              };
              return (
                <StatCard
                  key={idx}
                  label={stat.label}
                  value={stat.value}
                  variant={variantMap[stat.color] || 'default'}
                />
              );
            })}
          </div>
        )}

        <Card className="mt-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Weekly Revenue Funnel</h2>
            <p className="mt-1 text-sm text-slate-400">Live checkout and subscription events for the last {windowDays} days</p>

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
              <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200">
                {error}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-blue-400/20 bg-blue-400/5 p-3">
                <p className="text-xs text-blue-300">
                  💡 <strong>Source:</strong> This dashboard now reads live subscription and checkout metrics from `/api/usage/kpis`.
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <h2 className="text-lg font-semibold text-slate-100">Stripe Webhook Status</h2>
            <div className="mt-6 flex items-center gap-3">
              <span className={`inline-flex h-3 w-3 rounded-full ${webhookHealthy ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <p className="text-sm text-slate-300">
                {webhookHealthy ? 'Webhook activity seen in the last 24 hours' : 'No recent Stripe webhook event recorded'}
              </p>
            </div>
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-400">
              <p>Latest event: <span className="text-slate-100">{lastWebhookEvent?.eventType ?? '—'}</span></p>
              <p className="mt-2">Received: <span className="text-slate-100">{lastWebhookEvent ? new Date(lastWebhookEvent.createdAt).toLocaleString() : '—'}</span></p>
              <p className="mt-2">Source: <span className="text-slate-100">{lastWebhookEvent?.source ?? '—'}</span></p>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-slate-100">Recent Revenue Events</h2>
            <p className="mt-1 text-slate-400">Persisted Supabase events from upgrades, scans, keys, and Stripe webhooks</p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="px-4 py-3 text-left font-semibold">Event</th>
                    <th className="px-4 py-3 text-left font-semibold">Source</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 text-right font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.length > 0 ? (
                    recentEvents.map((event) => (
                      <tr key={event.id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-4 py-4">
                          <p className="font-medium text-white">{event.eventType}</p>
                          <p className="text-xs text-slate-500">{event.planId || '—'}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-400">{event.source}</td>
                        <td className="px-4 py-4 text-right text-slate-300">
                          {typeof event.amount === 'number' ? `${event.currency} ${event.amount.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-400">
                          {new Date(event.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No recent revenue events stored for this org.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-slate-100">Quick Actions</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Link
              href="/dashboard/billing"
              className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 hover:bg-amber-400/10 transition text-sm"
            >
              <p className="font-semibold text-slate-100">View Billing Plans</p>
              <p className="mt-1 text-xs text-slate-400">Check current subscription tiers and pricing</p>
            </Link>

            <Link
              href="/delivery-proof"
              className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-3 hover:bg-emerald-400/10 transition text-sm"
            >
              <p className="font-semibold text-slate-100">Test Delivery Proof</p>
              <p className="mt-1 text-xs text-slate-400">Generate a free proof scan to test upgrade flow</p>
            </Link>

            <Link
              href="/dashboard/api-keys"
              className="rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-3 hover:bg-cyan-400/10 transition text-sm"
            >
              <p className="font-semibold text-slate-100">Manage API Keys</p>
              <p className="mt-1 text-xs text-slate-400">View and create API keys for customer integrations</p>
            </Link>

            <Link
              href="/dashboard/team"
              className="rounded-lg border border-purple-400/30 bg-purple-400/5 p-3 hover:bg-purple-400/10 transition text-sm"
            >
              <p className="font-semibold text-slate-100">Team Management</p>
              <p className="mt-1 text-xs text-slate-400">Invite team members to help with sales</p>
            </Link>
          </div>
        </Card>

        <Card className="mt-6">
          <p className="text-sm text-slate-300">
            📌 <strong>Status:</strong> Revenue dashboard is backed by live billing tables for subscription, checkout, and churn signals.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Last updated: {new Date().toLocaleString()}
          </p>
        </Card>
      </div>
    </main>
  );
}
