import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { ConversionFunnelChart } from './components/conversion-funnel-chart';
import { TrialMetricsCards } from './components/trial-metrics-cards';
import { ICPScoreDistribution } from './components/icp-score-distribution';
import { PlatformDiscoveryChart } from './components/platform-discovery-chart';
import { HighPriorityLeads } from './components/high-priority-leads';

export const dynamic = 'force-dynamic';

type Metrics = {
  total_trials: number;
  conversions: number;
  conversion_rate: number;
  churn_rate: number;
  avg_trial_days: number;
  revenue_attributed: number;
};

type Funnel = {
  stage_discovered: { count: number; percentage: number };
  stage_contacted: { count: number; percentage: number };
  stage_trial: { count: number; percentage: number };
  stage_converted: { count: number; percentage: number };
  conversion_rate_trial_to_paid: number;
};

async function fetchAnalytics(): Promise<{ metrics: Metrics; funnel: Funnel | null }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/leads/metrics`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch metrics');
    }

    const data = await response.json();
    return {
      metrics: data.metrics || {},
      funnel: data.funnel || null,
    };
  } catch (err) {
    console.error('[Analytics] Error fetching metrics:', err);
    return {
      metrics: {
        total_trials: 0,
        conversions: 0,
        conversion_rate: 0,
        churn_rate: 0,
        avg_trial_days: 0,
        revenue_attributed: 0,
      },
      funnel: null,
    };
  }
}

export default async function LeadsAnalyticsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth?.user) redirect('/login');

  const founderEmail = process.env.FOUNDER_EMAIL;
  if (founderEmail && auth.user.email !== founderEmail) redirect('/dashboard');

  const { metrics, funnel } = await fetchAnalytics();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 text-white">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Pipeline Analytics</h1>
          <p className="text-sm text-slate-400">Real-time conversion metrics and lead intelligence</p>
        </div>
        <Link href="/admin/leads" className="text-sm text-slate-400 hover:text-white">
          Lead List →
        </Link>
      </div>

      {/* Key Metrics */}
      <TrialMetricsCards metrics={metrics} />

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Conversion Funnel */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-6 text-lg font-semibold">Conversion Funnel (30d)</h2>
          {funnel ? (
            <ConversionFunnelChart funnel={funnel} />
          ) : (
            <div className="flex h-64 items-center justify-center text-slate-500">
              No funnel data available
            </div>
          )}
        </div>

        {/* ICP Score Distribution */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-6 text-lg font-semibold">ICP Score Distribution</h2>
          <ICPScoreDistribution />
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 mb-8">
        <h2 className="mb-6 text-lg font-semibold">Lead Discovery by Platform</h2>
        <PlatformDiscoveryChart />
      </div>

      {/* High Priority Leads */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
        <h2 className="mb-6 text-lg font-semibold">High-Priority Leads</h2>
        <HighPriorityLeads />
      </div>
    </main>
  );
}
