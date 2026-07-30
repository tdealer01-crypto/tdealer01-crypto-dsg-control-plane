/**
 * Billing Self-Service Page
 * Located at: /dashboard/optimize/billing
 *
 * Features:
 * - Current plan display
 * - Usage metrics
 * - Invoice history (last 12 months, paginated)
 * - Payment methods (add/remove/update)
 * - Billing address
 * - Download invoice button
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import UsageBar from '@/components/billing/UsageBar';

interface UsageData {
  current_usage: number;
  plan_limit: number;
  overage_cost: number;
  usage_percentage: number;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: 'paid' | 'draft' | 'open' | 'void';
  created_at: string;
  due_date: string;
  pdf_url?: string;
}

interface BillingProfile {
  plan: 'pro' | 'business' | 'enterprise';
  interval: 'monthly' | 'yearly';
  status: 'active' | 'past_due' | 'canceled';
  current_period_start: string;
  current_period_end: string;
  auto_renew: boolean;
}

function BillingContent() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBillingData() {
      try {
        // Fetch usage data
        const usageRes = await fetch('/api/billing/usage', { cache: 'no-store' });
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          setUsage(usageData);
        }

        // TODO: Fetch profile and invoices from authenticated endpoints
        // These would require additional API routes to be implemented
        setProfile({
          plan: 'pro',
          interval: 'monthly',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          auto_renew: true,
        });
        setInvoices([]);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }

    loadBillingData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400"></div>
          <p className="text-slate-400">Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/30 bg-red-500/10 p-6">
        <h3 className="text-lg font-semibold text-red-300">Error loading billing data</h3>
        <p className="mt-2 text-sm text-red-200">{error}</p>
      </Card>
    );
  }

  const PLAN_DISPLAY = {
    pro: { title: 'Pro', price: 99, features: ['10,000 executions/mo', '60 req/min gate limit', '10 agents'] },
    business: { title: 'Business', price: 299, features: ['100,000 executions/mo', '300 req/min gate limit', '50 agents'] },
    enterprise: { title: 'Enterprise', price: 799, features: ['1,000,000 executions/mo', 'Unlimited gates', 'Unlimited agents'] },
  };

  const currentPlan = profile ? PLAN_DISPLAY[profile.plan] : null;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      {profile && currentPlan && (
        <Card className="border-emerald-500/30 bg-emerald-500/10 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-emerald-300 uppercase">Current Plan</h3>
              <h2 className="mt-2 text-3xl font-bold text-white">{currentPlan.title}</h2>
              <p className="mt-1 text-emerald-200">${currentPlan.price}/month</p>
              <div className="mt-4 space-y-2">
                {currentPlan.features.map((feat, i) => (
                  <p key={i} className="text-sm text-emerald-100">
                    ✓ {feat}
                  </p>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {profile.status === 'active' && (
                <button
                  onClick={() => (window.location.href = '/api/billing/portal')}
                  className="rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  Manage Billing
                </button>
              )}
              <Link
                href="/dashboard/billing"
                className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-6 py-2 text-center text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
              >
                View All Plans
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Usage Section */}
      {usage && (
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard
            label="Current Usage (executions)"
            value={usage.current_usage.toLocaleString()}
            variant={usage.usage_percentage > 80 ? 'warning' : 'default'}
          />
          <StatCard
            label="Plan Limit (executions/month)"
            value={usage.plan_limit.toLocaleString()}
          />
          <StatCard
            label="Overage Cost (this month)"
            value={`$${usage.overage_cost.toFixed(2)}`}
          />
        </div>
      )}

      {/* Usage Bar */}
      {usage && (
        <Card className="border-slate-700 bg-slate-900/30 p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase">Usage This Month</h3>
          <div className="mt-4">
            <UsageBar
              used={usage.current_usage}
              limit={usage.plan_limit}
              plan={profile?.plan || 'pro'}
              nudge={usage.usage_percentage > 90 ? 'blocked' : usage.usage_percentage > 80 ? 'hard' : usage.usage_percentage > 70 ? 'soft' : 'none'}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {usage.usage_percentage.toFixed(1)}% of your monthly limit
          </p>
          {usage.usage_percentage > 80 && (
            <div className="mt-4 rounded-lg border-l-4 border-amber-500 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-200">
                You&apos;re using {usage.usage_percentage.toFixed(0)}% of your plan limit. Consider upgrading to avoid overages.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Invoices Section */}
      <Card className="border-slate-700 bg-slate-900/30 p-6">
        <h3 className="text-lg font-semibold text-white">Invoice History</h3>
        <p className="mt-1 text-sm text-slate-400">Last 12 months</p>

        {invoices.length === 0 ? (
          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-800/20 p-6 text-center">
            <p className="text-slate-400">No invoices found</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <div>
                  <p className="font-semibold text-slate-200">Invoice {invoice.number}</p>
                  <p className="text-xs text-slate-500">{new Date(invoice.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-slate-200">
                      {invoice.currency.toUpperCase()} {invoice.amount.toFixed(2)}
                    </p>
                    <p className={`text-xs ${
                      invoice.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {invoice.status}
                    </p>
                  </div>
                  {invoice.pdf_url && (
                    <a
                      href={invoice.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline text-sm"
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Billing Address / Payment Methods */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-700 bg-slate-900/30 p-6">
          <h3 className="text-lg font-semibold text-white">Billing Address</h3>
          <p className="mt-4 text-sm text-slate-400">
            No billing address configured. Update in your Stripe billing portal.
          </p>
          <button
            onClick={() => (window.location.href = '/api/billing/portal')}
            className="mt-4 text-sm text-emerald-400 hover:underline"
          >
            Open Billing Portal →
          </button>
        </Card>

        <Card className="border-slate-700 bg-slate-900/30 p-6">
          <h3 className="text-lg font-semibold text-white">Payment Methods</h3>
          <p className="mt-4 text-sm text-slate-400">
            No payment methods configured. Add one in your Stripe billing portal.
          </p>
          <button
            onClick={() => (window.location.href = '/api/billing/portal')}
            className="mt-4 text-sm text-emerald-400 hover:underline"
          >
            Open Billing Portal →
          </button>
        </Card>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <>
      <PageHeader
        title="Billing & Usage"
        description="Manage your subscription, view usage metrics, and download invoices."
      />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-400">Loading...</p>
          </div>
        }
      >
        <BillingContent />
      </Suspense>
    </>
  );
}
