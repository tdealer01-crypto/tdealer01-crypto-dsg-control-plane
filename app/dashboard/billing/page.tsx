'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import UsageBar from '../../../components/billing/UsageBar';
import { GATE_PLANS, SKILLS_BUNDLES, type PlanKey } from '@/lib/billing/pricing-catalog';

type NudgeLevel = 'none' | 'soft' | 'hard' | 'blocked';
type BillingInterval = 'monthly' | 'yearly';

// Monthly prices come from the pricing catalog (single source of truth — the
// same numbers /api/billing/checkout charges). Yearly display keeps this
// page's ~20% discount convention; the Stripe yearly prices must be
// reconciled against these per the catalog's pricing rule.
function yearlyPerMonth(monthly: number): number {
  return Math.round(monthly * 0.8);
}

const PLANS: { key: PlanKey; title: string; monthly: number; yearly: number; yearlyTotal: number; features: string[] }[] = [
  {
    key: 'pro',
    title: 'Pro',
    monthly: GATE_PLANS.pro.displayMonthlyUsd,
    yearly: yearlyPerMonth(GATE_PLANS.pro.displayMonthlyUsd),
    yearlyTotal: yearlyPerMonth(GATE_PLANS.pro.displayMonthlyUsd) * 12,
    features: ['10,000 executions / mo', '60 req/min gate limit', '10 agents', 'PDF export'],
  },
  {
    key: 'business',
    title: 'Business',
    monthly: GATE_PLANS.business.displayMonthlyUsd,
    yearly: yearlyPerMonth(GATE_PLANS.business.displayMonthlyUsd),
    yearlyTotal: yearlyPerMonth(GATE_PLANS.business.displayMonthlyUsd) * 12,
    features: ['100,000 executions / mo', '300 req/min gate limit', '50 agents', 'Audit ledger'],
  },
  {
    key: 'enterprise',
    title: 'Enterprise',
    monthly: GATE_PLANS.enterprise.displayMonthlyUsd,
    yearly: yearlyPerMonth(GATE_PLANS.enterprise.displayMonthlyUsd),
    yearlyTotal: yearlyPerMonth(GATE_PLANS.enterprise.displayMonthlyUsd) * 12,
    features: ['1,000,000 executions / mo', 'Unlimited gates', 'Unlimited agents', 'SLA + support'],
  },
];

const SKILL_BUNDLES = [
  { id: 'finance_skills', name: 'Finance Governance', monthly: SKILLS_BUNDLES.finance_skills.amountMonthly / 100 },
  { id: 'dev_skills', name: 'Dev Automation', monthly: SKILLS_BUNDLES.dev_skills.amountMonthly / 100 },
  { id: 'compliance_skills', name: 'Compliance & Legal', monthly: SKILLS_BUNDLES.compliance_skills.amountMonthly / 100 },
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
    <div
      id={`plan-${plan.key}`}
      className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 scroll-mt-24"
    >
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

type QuotaUsageResponse = {
  ok: boolean;
  tier: {
    key: string;
    billingInterval: string | null;
    limit: number;
    status: string;
  };
  usage: {
    period: string;
    used: number;
    remaining: number;
    limit: number;
    resetDate: string;
    exhausted: boolean;
    breakdown: {
      deliveryProofScans: number;
      apiExecutions: number;
      mcpRequests: number;
    };
  };
  activeKeys: Array<{
    id: string;
    name: string;
    prefix: string;
    createdAt: string;
    currentMonthlyUsage: number;
    nextBillingDate: string | null;
    status: string;
  }>;
};

function categoryWidth(value: number, limit: number) {
  if (limit <= 0 || value <= 0) return 0;
  return Math.max(4, Math.min(100, Math.round((value / limit) * 100)));
}

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
  const [quotaUsage, setQuotaUsage] = useState<QuotaUsageResponse | null>(null);
  const [interval, setInterval]   = useState<BillingInterval>('monthly');
  const [bundleLoading, setBundleLoading] = useState<string | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpError, setMcpError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Checkout success toast
    if (searchParams.get('checkout') === 'success') {
      setToast('Subscription activated — your new quota is live.');
      setTimeout(() => setToast(null), 6000);
    }

    // Deep-link from /pricing: ?plan=pro|business|enterprise scrolls to that card.
    const requestedPlan = searchParams.get('plan');
    if (requestedPlan) {
      requestAnimationFrame(() => {
        document
          .getElementById(`plan-${requestedPlan}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    Promise.all([
      fetch('/api/usage',            { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
      fetch('/api/usage/analytics',  { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
      fetch('/api/usage/kpis',       { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
      fetch('/api/quotas/usage',     { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
    ]).then(([u, a, k, q]) => {
      setUsage(u);
      setAnalytics(a);
      setKpis(k);
      setQuotaUsage(q);
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

  async function startMCPCheckout() {
    setMcpLoading(true);
    setMcpError(null);
    try {
      const res = await fetch('/api/mcp/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMcpError(data?.error || 'MCP checkout failed — please try again');
        return;
      }
      const data = await res.json();
      if (data?.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      } else {
        setMcpError('Invalid checkout response');
      }
    } catch {
      setMcpError('Something went wrong');
    } finally {
      setMcpLoading(false);
    }
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        setPortalError(data?.error || 'Billing portal unavailable');
        return;
      }
      window.location.href = data.url;
    } catch {
      setPortalError('Billing portal unavailable');
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Checkout success toast */}
      {toast && (
        <div className="fixed right-5 top-20 z-50 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950 px-5 py-4 text-sm text-emerald-200 shadow-xl">
          <span className="text-emerald-400">✓</span>
          {toast}
          <button onClick={() => setToast(null)} className="ml-2 text-emerald-500 hover:text-emerald-300">✕</button>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
          <PageHeader
            title="Usage and Billing"
            description="Review current plan, subscription status, included executions, and projected amount."
          />
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link href="/pricing" className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-600">
              Change Plan
            </Link>
            <button
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {portalLoading ? 'Opening Portal…' : 'Manage Billing'}
            </button>
            <Link href="/dashboard" className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-600">
              Dashboard
            </Link>
          </div>
        </div>
        {portalError && (
          <p className="mt-3 text-sm text-amber-300">{portalError}</p>
        )}

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

        {!loading && quotaUsage && (
          <Card className="mt-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Quota Usage Breakdown</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Period {quotaUsage.usage.period} · resets {formatDate(quotaUsage.usage.resetDate)}
                </p>
              </div>
              <p className="text-sm text-slate-300">
                {quotaUsage.usage.used.toLocaleString()} used · {quotaUsage.usage.remaining.toLocaleString()} remaining
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {[
                ['API executions', quotaUsage.usage.breakdown.apiExecutions, 'bg-emerald-500'],
                ['Delivery Proof scans', quotaUsage.usage.breakdown.deliveryProofScans, 'bg-cyan-500'],
                ['MCP requests', quotaUsage.usage.breakdown.mcpRequests, 'bg-amber-400'],
              ].map(([label, value, color]) => (
                <div key={String(label)}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{label}</span>
                    <span className="text-slate-400">{Number(value).toLocaleString()}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${categoryWidth(Number(value), quotaUsage.usage.limit)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {loading && (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              { label: 'Plan',        value: usage?.plan                          ?? '—' },
              { label: 'Status',      value: usage?.subscription_status           ?? '—' },
              { label: 'Executions',  value: (usage?.executions ?? 0).toLocaleString() },
              { label: 'Projected',   value: usage ? `US$${usage.projected_amount_usd.toFixed(2)}` : '—' },
            ].map((card) => (
              <StatCard key={card.label} label={card.label} value={card.value} />
            ))}
          </div>
        )}

        <Card className="mt-8">
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
        </Card>

        <Card className="mt-8">
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
        </Card>

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

        <Card className="mt-8">
          <h2 className="text-lg font-semibold text-slate-100">Add-on bundles</h2>
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
        </Card>

        <Card className="mt-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">MCP API Subscription</h2>
              <p className="mt-2 text-sm text-slate-300">
                Connect DSG governance to Claude Desktop, Cursor, or any MCP-compatible client
              </p>
            </div>
            <span className="inline-flex rounded-full bg-cyan-600/20 px-3 py-1 text-xs font-semibold text-cyan-300">
              Developer
            </span>
          </div>

          {/* Pricing card */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
              <p className="text-sm font-semibold text-white">Per-Developer Subscription</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-cyan-300">฿490</span>
                <span className="text-sm text-slate-400">/month per dev</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="text-cyan-400">✓</span>
                  <span>Unlimited MCP calls</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="text-cyan-400">✓</span>
                  <span>RPC-validated API keys</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="text-cyan-400">✓</span>
                  <span>Atomic quota enforcement</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="text-cyan-400">✓</span>
                  <span>Usage logs + audit trail</span>
                </div>
              </div>
              <button
                onClick={startMCPCheckout}
                disabled={mcpLoading}
                className="mt-4 w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mcpLoading ? 'Redirecting…' : 'Create MCP Key →'}
              </button>
              {mcpError && <p className="mt-2 text-xs text-red-400">{mcpError}</p>}
            </div>

            {/* Integration guide */}
            <div className="rounded-xl border border-slate-700/50 bg-slate-950/30 p-4">
              <p className="text-sm font-semibold text-white">Quick Setup</p>
              <div className="mt-3 space-y-2 text-xs text-slate-400">
                <div className="font-mono">
                  <p className="text-cyan-400">1. Create MCP API key (see left)</p>
                  <p className="mt-2 text-cyan-400">2. Configure in claude_desktop_config.json</p>
                  <p className="mt-2 font-mono text-[0.7rem] text-slate-500">
                    {`{`}<br/>
                    {`  "mcpServers": {`}<br/>
                    {`    "dsg": {`}<br/>
                    {`      "command": "...",`}<br/>
                    {`      "env": {`}<br/>
                    {`        "DSG_API_KEY": "YOUR_MCP_KEY"`}<br/>
                    {`      }`}<br/>
                    {`    }`}<br/>
                    {`  }`}<br/>
                    {`}`}
                  </p>
                </div>
                <p className="mt-3 text-slate-500">
                  <a href="https://docs.anthropic.com/en/docs/build-with-claude/mcp" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                    Learn about MCP →
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Active keys list */}
          <div className="mt-6 rounded-lg border border-slate-700/50 bg-slate-950/30 p-4">
            <p className="text-sm font-semibold text-slate-200">Active MCP Keys</p>
            <p className="mt-1 text-xs text-slate-500">Current org keys with usage synced into the quota dashboard</p>
            {loading ? (
              <div className="mt-3 py-8 text-center text-slate-500">Loading keys…</div>
            ) : quotaUsage?.activeKeys?.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="px-2 py-2 font-medium">Key</th>
                      <th className="px-2 py-2 font-medium">Created</th>
                      <th className="px-2 py-2 font-medium">Monthly usage</th>
                      <th className="px-2 py-2 font-medium">Next billing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotaUsage.activeKeys.map((key) => (
                      <tr key={key.id} className="border-b border-slate-900/80 text-slate-300">
                        <td className="px-2 py-3">
                          <p className="font-medium text-white">{key.name}</p>
                          <p className="text-xs text-slate-500">{key.prefix}</p>
                        </td>
                        <td className="px-2 py-3">{formatDate(key.createdAt)}</td>
                        <td className="px-2 py-3">{key.currentMonthlyUsage.toLocaleString()}</td>
                        <td className="px-2 py-3">{formatDate(key.nextBillingDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-3 text-center py-8 text-slate-500">
                <p className="text-sm">No active MCP keys yet</p>
                <p className="text-xs mt-1">Create one above to get started</p>
              </div>
            )}
          </div>

          {/* Billing note */}
          <div className="mt-4 p-3 rounded-lg bg-cyan-600/5 border border-cyan-600/10">
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-cyan-300">Monthly billing:</span> Your team can have multiple MCP keys, each billed separately. Keys expire after 30 days and auto-renew.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
