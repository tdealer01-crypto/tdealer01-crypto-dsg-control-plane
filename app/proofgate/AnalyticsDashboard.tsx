'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  total_operations: number;
  total_allowed: number;
  total_blocked: number;
  total_review: number;
  approval_rate: number;
  avg_decision_time_ms: number;
  daily_trend: Array<{
    date: string;
    ALLOW: number;
    BLOCK: number;
    REVIEW: number;
  }>;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch analytics from API (mock data for now)
    const mockData: AnalyticsData = {
      total_operations: 2847,
      total_allowed: 2156,
      total_blocked: 412,
      total_review: 279,
      approval_rate: 75.8,
      avg_decision_time_ms: 187,
      daily_trend: [
        { date: 'Jun 28', ALLOW: 280, BLOCK: 45, REVIEW: 38 },
        { date: 'Jun 29', ALLOW: 295, BLOCK: 52, REVIEW: 41 },
        { date: 'Jun 30', ALLOW: 312, BLOCK: 48, REVIEW: 43 },
        { date: 'Jul 01', ALLOW: 328, BLOCK: 61, REVIEW: 52 },
        { date: 'Jul 02', ALLOW: 341, BLOCK: 56, REVIEW: 44 },
        { date: 'Jul 03', ALLOW: 365, BLOCK: 71, REVIEW: 48 },
        { date: 'Jul 04', ALLOW: 389, BLOCK: 79, REVIEW: 13 },
      ],
    };
    setData(mockData);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-14">
        <p className="text-sm text-slate-500">Loading analytics...</p>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const decisionDistribution = [
    { name: 'Allowed', value: data.total_allowed, color: '#10b981' },
    { name: 'Blocked', value: data.total_blocked, color: '#ef4444' },
    { name: 'Review', value: data.total_review, color: '#f59e0b' },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-14">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <p className="dsg-chip">Real-time Governance Metrics</p>
          <h2 className="mt-4 text-4xl font-black text-white">Analytics Dashboard</h2>
          <p className="mt-2 text-slate-300">Policy decisions, approval rates, and system performance metrics</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <article className="dsg-card rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Total Operations</p>
            <p className="mt-3 text-4xl font-black text-white">{data.total_operations.toLocaleString()}</p>
            <p className="mt-2 text-xs text-slate-400">Policies evaluated</p>
          </article>

          <article className="dsg-card rounded-2xl border-emerald-400/20 bg-emerald-400/5 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Allowed</p>
            <p className="mt-3 text-4xl font-black text-emerald-400">{data.total_allowed}</p>
            <p className="mt-2 text-xs text-emerald-300/70">{((data.total_allowed / data.total_operations) * 100).toFixed(1)}% approval rate</p>
          </article>

          <article className="dsg-card rounded-2xl border-red-400/20 bg-red-400/5 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">Blocked</p>
            <p className="mt-3 text-4xl font-black text-red-400">{data.total_blocked}</p>
            <p className="mt-2 text-xs text-red-300/70">{((data.total_blocked / data.total_operations) * 100).toFixed(1)}% block rate</p>
          </article>

          <article className="dsg-card rounded-2xl border-amber-400/20 bg-amber-400/5 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Review</p>
            <p className="mt-3 text-4xl font-black text-amber-400">{data.total_review}</p>
            <p className="mt-2 text-xs text-amber-300/70">{((data.total_review / data.total_operations) * 100).toFixed(1)}% manual review</p>
          </article>

          <article className="dsg-card rounded-2xl border-blue-400/20 bg-blue-400/5 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Avg Decision Time</p>
            <p className="mt-3 text-4xl font-black text-blue-400">{data.avg_decision_time_ms}ms</p>
            <p className="mt-2 text-xs text-blue-300/70">Policy evaluation latency</p>
          </article>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Decision Trend Chart */}
          <article className="dsg-card rounded-3xl border border-white/10 bg-black/40 p-6">
            <h3 className="text-lg font-bold text-white">7-Day Decision Trend</h3>
            <p className="mt-1 text-sm text-slate-400">Policy decisions over time by outcome</p>
            <div className="mt-6 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="ALLOW" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="BLOCK" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="REVIEW" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          {/* Decision Distribution Pie Chart */}
          <article className="dsg-card rounded-3xl border border-white/10 bg-black/40 p-6">
            <h3 className="text-lg font-bold text-white">Decision Distribution</h3>
            <p className="mt-1 text-sm text-slate-400">Total decisions breakdown</p>
            <div className="mt-6 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={decisionDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {decisionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>

        {/* Performance Insights */}
        <article className="dsg-card-blue rounded-3xl p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-200">Performance Insights</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-blue-300/20 bg-blue-400/5 p-4">
              <p className="text-sm font-semibold text-blue-300">Policy Approval Rate</p>
              <p className="mt-2 text-2xl font-black text-blue-400">{data.approval_rate}%</p>
              <p className="mt-1 text-xs text-blue-300/70">Most operations approved automatically</p>
            </div>
            <div className="rounded-xl border border-blue-300/20 bg-blue-400/5 p-4">
              <p className="text-sm font-semibold text-blue-300">Human Review Queue</p>
              <p className="mt-2 text-2xl font-black text-blue-400">{data.total_review}</p>
              <p className="mt-1 text-xs text-blue-300/70">Decisions pending human approval</p>
            </div>
            <div className="rounded-xl border border-blue-300/20 bg-blue-400/5 p-4">
              <p className="text-sm font-semibold text-blue-300">System Throughput</p>
              <p className="mt-2 text-2xl font-black text-blue-400">~400/day</p>
              <p className="mt-1 text-xs text-blue-300/70">Governance decisions per day</p>
            </div>
          </div>
        </article>

        {/* Action Items */}
        <div className="flex gap-3">
          <button className="dsg-btn-gold">Export Report</button>
          <button className="dsg-btn-blue">View Audit Trail</button>
          <button className="dsg-btn-red">Policy Settings</button>
        </div>
      </div>
    </section>
  );
}
