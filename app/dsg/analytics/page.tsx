'use client';

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Cpu, Activity, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';

type DateRange = '7d' | '30d' | '90d';

type Build = {
  id: string;
  appName: string;
  status: 'COMPLETE' | 'IN_PROGRESS' | 'FAILED' | 'QUEUED';
  duration: string;
  tokens: number;
  date: string;
};

const STATUS_STYLES: Record<Build['status'], string> = {
  COMPLETE: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  IN_PROGRESS: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  FAILED: 'border-red-500/40 bg-red-500/10 text-red-300',
  QUEUED: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
};

const STATUS_ICONS: Record<Build['status'], React.ReactNode> = {
  COMPLETE: <CheckCircle2 className="h-3.5 w-3.5" />,
  IN_PROGRESS: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  FAILED: <AlertCircle className="h-3.5 w-3.5" />,
  QUEUED: <Clock className="h-3.5 w-3.5" />,
};

const CHART_DATA_7D = [
  { day: 'Mon', builds: 18 },
  { day: 'Tue', builds: 27 },
  { day: 'Wed', builds: 34 },
  { day: 'Thu', builds: 22 },
  { day: 'Fri', builds: 41 },
  { day: 'Sat', builds: 15 },
  { day: 'Sun', builds: 9 },
];

const CHART_DATA_30D = [
  { day: 'W1', builds: 112 },
  { day: 'W2', builds: 148 },
  { day: 'W3', builds: 97 },
  { day: 'W4', builds: 175 },
];

const CHART_DATA_90D = [
  { day: 'M1', builds: 480 },
  { day: 'M2', builds: 620 },
  { day: 'M3', builds: 530 },
];

const CHART_DATA: Record<DateRange, { day: string; builds: number }[]> = {
  '7d': CHART_DATA_7D,
  '30d': CHART_DATA_30D,
  '90d': CHART_DATA_90D,
};

const STATS: Record<DateRange, { totalApps: number; appsTrend: number; tokensUsed: number; costEstimate: string; activeBuilds: number; successRate: number; successTrend: number }> = {
  '7d':  { totalApps: 166, appsTrend: 12.4,  tokensUsed: 4_820_000, costEstimate: '$9.64',  activeBuilds: 7,  successRate: 94.2, successTrend: 1.8 },
  '30d': { totalApps: 532, appsTrend: 8.1,   tokensUsed: 15_300_000, costEstimate: '$30.60', activeBuilds: 12, successRate: 92.7, successTrend: -0.4 },
  '90d': { totalApps: 1630, appsTrend: 21.3, tokensUsed: 48_900_000, costEstimate: '$97.80', activeBuilds: 12, successRate: 91.5, successTrend: 2.1 },
};

const RECENT_BUILDS: Build[] = [
  { id: 'bld_001', appName: 'Inventory Tracker',    status: 'COMPLETE',    duration: '1m 42s', tokens: 38_400,  date: '2026-05-15 14:32' },
  { id: 'bld_002', appName: 'Customer Portal',      status: 'IN_PROGRESS', duration: '—',      tokens: 12_100,  date: '2026-05-15 14:29' },
  { id: 'bld_003', appName: 'Expense Reporter',     status: 'COMPLETE',    duration: '2m 08s', tokens: 51_700,  date: '2026-05-15 14:11' },
  { id: 'bld_004', appName: 'HR Onboarding App',    status: 'FAILED',      duration: '0m 54s', tokens: 9_300,   date: '2026-05-15 13:55' },
  { id: 'bld_005', appName: 'Pricing Calculator',   status: 'COMPLETE',    duration: '0m 38s', tokens: 22_500,  date: '2026-05-15 13:40' },
  { id: 'bld_006', appName: 'Booking System',       status: 'QUEUED',      duration: '—',      tokens: 0,       date: '2026-05-15 13:38' },
  { id: 'bld_007', appName: 'Feedback Dashboard',   status: 'COMPLETE',    duration: '1m 17s', tokens: 33_200,  date: '2026-05-15 13:20' },
  { id: 'bld_008', appName: 'Audit Log Viewer',     status: 'COMPLETE',    duration: '0m 55s', tokens: 18_800,  date: '2026-05-15 12:58' },
  { id: 'bld_009', appName: 'Team Task Manager',    status: 'COMPLETE',    duration: '2m 34s', tokens: 67_100,  date: '2026-05-15 12:30' },
  { id: 'bld_010', appName: 'API Key Manager',      status: 'FAILED',      duration: '1m 02s', tokens: 14_900,  date: '2026-05-15 12:14' },
];

const PROVIDERS = [
  { name: 'Gemini',    pct: 48, color: 'bg-indigo-500' },
  { name: 'OpenAI',   pct: 34, color: 'bg-emerald-500' },
  { name: 'Anthropic', pct: 18, color: 'bg-violet-500' },
];

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function Trend({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${ up ? 'text-emerald-400' : 'text-red-400' }`}>
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {up ? '+' : ''}{value}%
    </span>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>('7d');
  const stats = STATS[range];
  const chartData = CHART_DATA[range];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <section className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-6 shadow-2xl shadow-indigo-950/30 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">
                <Activity className="h-3.5 w-3.5" /> Analytics
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">Analytics &amp; Usage</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                Monitor build activity, token consumption, and model performance across your workspace.
              </p>
            </div>
            {/* Date range selector */}
            <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 p-1">
              {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                    range === r ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Stat cards */}
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Apps Built"
            value={stats.totalApps.toLocaleString()}
            sub={<Trend value={stats.appsTrend} />}
            icon={<Cpu className="h-5 w-5 text-indigo-400" />}
          />
          <StatCard
            label="AI Tokens Used"
            value={formatTokens(stats.tokensUsed)}
            sub={<span className="text-xs text-slate-400">est. {stats.costEstimate}</span>}
            icon={<Activity className="h-5 w-5 text-violet-400" />}
          />
          <StatCard
            label="Active Builds"
            value={String(stats.activeBuilds)}
            sub={<span className="text-xs text-slate-400">right now</span>}
            icon={<Loader2 className="h-5 w-5 animate-spin text-amber-400" />}
          />
          <StatCard
            label="Success Rate"
            value={`${stats.successRate}%`}
            sub={<Trend value={stats.successTrend} />}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          />
        </section>

        {/* Chart + Provider usage */}
        <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Bar chart */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-6 text-xl font-bold">Build Activity</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f1f5f9' }}
                  cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                />
                <Bar dataKey="builds" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Provider usage */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-6 text-xl font-bold">Provider Usage</h2>
            <div className="space-y-5">
              {PROVIDERS.map((p) => (
                <div key={p.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-200">{p.name}</span>
                    <span className="text-slate-400">{p.pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${p.color} transition-all duration-500`}
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-400">
              Distribution across the last {range} of token usage by provider.
            </p>
          </div>
        </section>

        {/* Recent builds table */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-5 text-xl font-bold">Recent Builds</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-4">App Name</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Duration</th>
                  <th className="pb-3 pr-4">Tokens</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {RECENT_BUILDS.map((build) => (
                  <tr key={build.id} className="text-slate-300 hover:bg-slate-800/40">
                    <td className="py-3 pr-4 font-bold text-slate-100">{build.appName}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${ STATUS_STYLES[build.status] }`}>
                        {STATUS_ICONS[build.status]}
                        {build.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{build.duration}</td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {build.tokens > 0 ? formatTokens(build.tokens) : '—'}
                    </td>
                    <td className="py-3 text-xs text-slate-500">{build.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer note */}
        <p className="pb-4 text-center text-xs text-slate-600">
          Analytics data updates every 5 minutes. Costs are estimates based on public provider pricing.
        </p>
      </div>
    </main>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800">
          {icon}
        </div>
      </div>
      <p className="text-3xl font-black tracking-tight text-slate-100">{value}</p>
      <div className="mt-1">{sub}</div>
    </div>
  );
}
