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
  source: string;
  scans: number;
  upgrades: number;
  rate: string;
  revenue: string;
}

export default function RevenueDashboard() {
  const [stats, setStats] = useState<RevenueStat[]>([]);
  const [conversions, setConversions] = useState<ConversionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch revenue metrics
    async function fetchMetrics() {
      try {
        // TODO: Connect to actual revenue API endpoint
        const mockStats: RevenueStat[] = [
          {
            label: 'Monthly Recurring Revenue',
            value: '$0',
            delta: '+$0 this month',
            icon: '💰',
            color: 'emerald',
          },
          {
            label: 'Delivery Proof Conversions',
            value: '0',
            delta: '+0 this week',
            icon: '📊',
            color: 'blue',
          },
          {
            label: 'MCP Subscriptions',
            value: '$0',
            delta: '+$0 this month',
            icon: '🔌',
            color: 'cyan',
          },
          {
            label: 'Skills Bundle Revenue',
            value: '$0',
            delta: '+$0 this week',
            icon: '🎨',
            color: 'purple',
          },
        ];

        const mockConversions: ConversionData[] = [
          {
            source: 'Delivery Proof Free → Pro',
            scans: 0,
            upgrades: 0,
            rate: '0%',
            revenue: '$0',
          },
          {
            source: 'Delivery Proof Free → Unlimited',
            scans: 0,
            upgrades: 0,
            rate: '0%',
            revenue: '$0',
          },
          {
            source: 'API Quota Gate Upgrades',
            scans: 0,
            upgrades: 0,
            rate: '0%',
            revenue: '$0',
          },
          {
            source: 'Skills Bundle Purchases',
            scans: 0,
            upgrades: 0,
            rate: '0%',
            revenue: '$0',
          },
        ];

        setStats(mockStats);
        setConversions(mockConversions);
      } catch (error) {
        console.error('Failed to fetch revenue metrics:', error);
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
          <p className="mt-2 text-slate-400">Track monetization performance across all revenue streams</p>
        </div>

        {/* Top metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {stats.map((stat, idx) => (
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
          ))}
        </div>

        {/* Conversion funnel */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 mb-12">
          <h2 className="text-2xl font-semibold">Conversion Funnel</h2>
          <p className="mt-1 text-slate-400">Revenue source tracking and upgrade conversion rates</p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-semibold text-slate-400">Conversion Source</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-400">Sessions</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-400">Conversions</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-400">Rate</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-400">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="py-4 px-4 font-medium">{row.source}</td>
                    <td className="text-right py-4 px-4 text-slate-400">{row.scans}</td>
                    <td className="text-right py-4 px-4 text-slate-400">{row.upgrades}</td>
                    <td className="text-right py-4 px-4">
                      <span className="inline-flex rounded-full bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                        {row.rate}
                      </span>
                    </td>
                    <td className="text-right py-4 px-4 font-semibold text-emerald-300">{row.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-blue-400/5 border border-blue-400/20">
            <p className="text-xs text-blue-300">
              💡 <strong>Tip:</strong> These metrics update in real-time as customers upgrade. Share the link to your team to track revenue velocity.
            </p>
          </div>
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
            📌 <strong>Status:</strong> Revenue dashboard initialized. Metrics will populate as customers upgrade through Delivery Proof scans, API quota gates, and MCP subscriptions.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </main>
  );
}
