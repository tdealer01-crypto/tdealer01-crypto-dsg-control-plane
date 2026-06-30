'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import UsageBar from '../../../components/billing/UsageBar';

type PlanKey = 'pro' | 'business' | 'enterprise';
type NudgeLevel = 'none' | 'soft' | 'hard' | 'blocked';
type BillingInterval = 'monthly' | 'yearly';

const PLANS: { key: PlanKey; title: string; monthly: number; yearly: number; yearlyTotal: number; features: string[] }[] = [
  {
    key: 'pro',
    title: 'Pro',
    monthly: 99,
    yearly: 79,
    yearlyTotal: 948,
    features: ['10,000 executions / mo', '60 req/min gate limit', '10 agents', 'PDF export'],
  },
  {
    key: 'business',
    title: 'Business',
    monthly: 299,
    yearly: 239,
    yearlyTotal: 2868,
    features: ['100,000 executions / mo', '300 req/min gate limit', '50 agents', 'Audit ledger'],
  },
  {
    key: 'enterprise',
    title: 'Enterprise',
    monthly: 799,
    yearly: 639,
    yearlyTotal: 7668,
    features: ['1,000,000 executions / mo', 'Unlimited gates', 'Unlimited agents', 'SLA + support'],
  },
];

const SKILL_BUNDLES = [
  { id: 'finance_skills', name: 'Finance Governance', monthly: 199 },
  { id: 'dev_skills', name: 'Dev Automation', monthly: 99 },
  { id: 'compliance_skills', name: 'Compliance & Legal', monthly: 249 },
];

function UpgradeCard({
  plan,
  currentPlan,
  interval,
}: {
  plan: (typeof PLANS)[number];
  currentPlan?: string;
  interval: BillingInterval;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCurrent = typeof currentPlan === 'string' && currentPlan.toLowerCase() === plan.key;
  const price = interval === 'yearly' ? plan.yearly : plan.monthly;

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.key, interval }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || 'Checkout failed — please try again');
        return;
      }
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      setError('Something went wrong');
    } finally {
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
      <p className="mt-2 text-3xl font-bold">${price}/mo</p>
      {interval === 'yearly' && <p className="mt-1 text-xs text-emerald-300">Billed annually · ${plan.yearlyTotal}/yr</p>}
      <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-300">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
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
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="h-3 w-16 rounded bg-slate-800" />
      <div className="mt-3 h-8 w-24 rounded bg-slate-800" />
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

type Analytics = {
  quota: { pct: number; nudge: NudgeLevel; used: number; limit: number };
};

type RevenueKpis = {
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
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try { return new Date(value).toLocaleDateString(); }
  catch { return value; }
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingInner />
    </Suspense>
  );
}

function BillingInner() {
  const [usage, setUsage]         = useState<Usage | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [kpis, setKpis]           = useState<RevenueKpis | null>(null);
  const [interval, setInterval]   = useState<BillingInterval>('monthly');
  const [bundleLoading, setBundleLoading] = useState<string | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Checkout success toast
    if (searchParams.get('checkout') === 'success') {
      setToast('Subscription activated — your new quota is live.');
      setTimeout(() => setToast(null), 6000);
    }

    Promise.all([
      fetch('/api/usage',            { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
      fetch('/api/usage/analytics',  { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
      fetch('/api/usage/kpis',       { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
    ]).then(([u, a, k]) => {
      setUsage(u);
      setAnalytics(a);
      setKpis(k);
    }).finally(() => setLoading(false));
  }, [searchParams]);

  const quota = analytics?.quota;

  async function startBundleCheckout(bundleId: string) {
    setBundleLoading(bundleId);
    setBundleError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: bundleId, interval }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setBundleError(data?.error || 'Bundle checkout failed');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setBundleError('Bundle checkout failed');
    } catch {
      setBundleError('Bundle checkout failed');
    } finally {
      setBundleLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      {/* Checkout success toast */}
      {toast && (
        <div className="fixed right-5 top-20 z-50 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950 px-5 py-4 text-sm text-emerald-200 shadow-xl">
          <span className="text-emerald-400">✓</span>
          {toast}
          <button onClick={() => setToast(null)} className="ml-2 text-emerald-500 hover:text-emerald-300">✕</button>
        </div>
      )}

      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.25em] text-emerald-400">Billing</p>
            <h1 className="text-4xl font-bold">Usage and Billing</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Review current plan, subscription status, included executions, and projected amount.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200 hover:border-slate-600">
              Change Plan
            </Link>
            <Link href="/dashboard" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200 hover:border-slate-600">
              Dashboard
            </Link>
          </div>
        </div>

        {/* Usage bar — real quota data */}
        <div className="mt-8">
          {loading ? (
            <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-5 h-24" />
          ) : quota ? (
            <UsageBar
              used={quota.used}
              limit={quota.limit}
              plan={usage?.plan ?? ''}
              nudge={quota.nudge}
            />
          ) : null}
        </div>
        {!loading && quota && quota.nudge !== 'none' && (
          <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            {quota.nudge === 'blocked'
              ? 'Quota reached — upgrade now to unblock executions immediately.'
              : quota.nudge === 'hard'
                ? 'Quota is near limit — upgrade now to avoid execution blocks.'
                : 'Usage is rising — upgrade early for smoother operations.'}
          </div>
        )}

        {/* KPI cards */}
        <div className="mt-6 grid gap-6 md:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            [
              { label: 'Plan',        value: usage?.plan                          ?? '—' },
              { label: 'Status',      value: usage?.subscription_status           ?? '—' },
              { label: 'Executions',  value: (usage?.executions ?? 0).toLocaleString() },
              { label: 'Projected',   value: usage ? `US$${usage.projected_amount_usd.toFixed(2)}` : '—' },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold">{card.value}</p>
              </div>
            ))
          )}
        </div>

        {/* Revenue KPI */}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Revenue KPI (last {kpis?.window_days ?? 30} days)</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              { label: 'Trial → Paid', value: kpis?.metrics.trial_to_paid_conversion_pct != null ? `${kpis.metrics.trial_to_paid_conversion_pct.toFixed(1)}%` : '—' },
              { label: 'MRR', value: kpis ? `US$${kpis.metrics.mrr_usd.toFixed(2)}` : '—' },
              { label: 'Churn', value: kpis?.metrics.churn_rate_pct != null ? `${kpis.metrics.churn_rate_pct.toFixed(1)}%` : '—' },
              { label: 'ARPA', value: kpis?.metrics.arpa_usd != null ? `US$${kpis.metrics.arpa_usd.toFixed(2)}` : '—' },
              { label: 'Checkout completion', value: kpis?.metrics.checkout_completion_rate_pct != null ? `${kpis.metrics.checkout_completion_rate_pct.toFixed(1)}%` : '—' },
              { label: 'Active subscriptions', value: kpis ? `${kpis.metrics.active_subscriptions}` : '—' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="mt-2 text-xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Billing period */}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Billing period</h2>
          {loading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse h-4 w-64 rounded bg-slate-800" />
              ))}
            </div>
          ) : (
            <>
              <p className="mt-3 text-slate-300">{usage?.billing_period ?? '—'}</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                <p>Period start: {formatDate(usage?.current_period_start)}</p>
                <p>Period end: {formatDate(usage?.current_period_end)}</p>
                <p>Trial end: {formatDate(usage?.trial_end)}</p>
                <p>Overage executions: {(usage?.overage_executions ?? 0).toLocaleString()}</p>
              </div>
            </>
          )}
        </div>

        {/* Upgrade plans */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold">Upgrade Plan</h2>
          <p className="mt-2 text-slate-300">Choose a plan that fits your team&apos;s needs.</p>
          <div className="mt-4 inline-flex rounded-xl border border-slate-700 bg-slate-900 p-1">
            {(['monthly', 'yearly'] as BillingInterval[]).map((iv) => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className={['rounded-lg px-4 py-2 text-sm font-semibold transition', interval === iv ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'].join(' ')}
              >
                {iv === 'monthly' ? 'Monthly' : 'Yearly (-20%)'}
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <UpgradeCard key={plan.key} plan={plan} currentPlan={usage?.plan} interval={interval} />
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Add-on bundles</h2>
          <p className="mt-2 text-sm text-slate-300">Keep base subscription for recurring revenue and attach bundles for expansion revenue.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {SKILL_BUNDLES.map((bundle) => (
              <button
                key={bundle.id}
                onClick={() => void startBundleCheckout(bundle.id)}
                disabled={bundleLoading !== null}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-left transition hover:border-emerald-500/50 disabled:opacity-60"
              >
                <p className="text-sm font-semibold text-white">{bundle.name}</p>
                <p className="mt-1 text-xs text-slate-400">US${bundle.monthly}/mo</p>
                <p className="mt-3 text-xs text-emerald-300">
                  {bundleLoading === bundle.id ? 'Redirecting…' : 'Activate bundle →'}
                </p>
              </button>
            ))}
          </div>
          {bundleError && <p className="mt-3 text-xs text-red-400">{bundleError}</p>}
        </div>
      </div>
    </main>
  );
}
