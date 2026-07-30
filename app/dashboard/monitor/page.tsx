'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Link from 'next/link';
import { DashboardWidget, DashboardWidgetSkeleton } from '@/components/Monitor/DashboardWidget';
import { Activity, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';

interface UsageData {
  ok: boolean;
  data: Array<{
    date: string;
    total_calls: number;
    avg_latency_ms: number;
    error_count: number;
    decision_counts: {
      ALLOW: number;
      BLOCK: number;
      REVIEW: number;
      UNSUPPORTED: number;
    };
  }>;
  summary: {
    total_calls: number;
    avg_latency_ms: number;
    error_rate: number;
    decision_breakdown: {
      ALLOW: number;
      BLOCK: number;
      REVIEW: number;
      UNSUPPORTED: number;
    };
  };
}

const DECISION_COLORS = {
  ALLOW: '#10b981',
  BLOCK: '#ef4444',
  REVIEW: '#f59e0b',
  UNSUPPORTED: '#6b7280',
};

/**
 * Monitor Dashboard Page
 *
 * Displays real-time metrics and statistics about:
 * - Total API calls
 * - Error rates
 * - Average latency
 * - Decision breakdown
 */
export default function MonitorDashboard() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch last 30 days of usage data
        const response = await fetch('/api/monitor/usage?limit=100');
        if (!response.ok) {
          throw new Error('Failed to fetch monitor data');
        }

        const data: UsageData = await response.json();
        if (!data.ok) {
          throw new Error(data.summary?.['error'] || 'Unknown error');
        }

        setUsageData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Monitor Dashboard</h1>
          <p className="text-gray-600">Real-time overview of API execution metrics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardWidgetSkeleton count={4} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DashboardWidgetSkeleton count={2} />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !usageData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Monitor Dashboard</h1>
          <p className="text-gray-600">Real-time overview of API execution metrics</p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:bg-red-900 dark:border-red-700">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100">Error loading dashboard</h3>
              <p className="text-sm text-red-800 dark:text-red-200">{error || 'Unable to load monitor data'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { summary, data } = usageData;
  const chartData = data.slice().reverse(); // Reverse for chronological order

  // Decision distribution for pie chart
  const decisionChartData = [
    { name: 'Allow', value: summary.decision_breakdown.ALLOW, color: DECISION_COLORS.ALLOW },
    { name: 'Block', value: summary.decision_breakdown.BLOCK, color: DECISION_COLORS.BLOCK },
    { name: 'Review', value: summary.decision_breakdown.REVIEW, color: DECISION_COLORS.REVIEW },
    { name: 'Unsupported', value: summary.decision_breakdown.UNSUPPORTED, color: DECISION_COLORS.UNSUPPORTED },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Monitor Dashboard</h1>
          <p className="text-gray-600">Real-time overview of API execution metrics</p>
        </div>
        <Link
          href="/dashboard/monitor/usage"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Detailed Analytics
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardWidget
          title="Total API Calls"
          value={summary.total_calls.toLocaleString()}
          valueLabel="executions"
          icon={<Activity className="w-5 h-5 text-blue-600" />}
          trend={{
            direction: 'up',
            percentage: 12.5,
            period: 'vs last month',
          }}
        />

        <DashboardWidget
          title="Error Rate"
          value={summary.error_rate.toFixed(1)}
          valueLabel="%"
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          trend={{
            direction: 'down',
            percentage: 2.3,
            period: 'improvement',
          }}
        />

        <DashboardWidget
          title="Avg Latency"
          value={summary.avg_latency_ms}
          valueLabel="ms"
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          trend={{
            direction: 'neutral',
            percentage: 0,
            period: 'stable',
          }}
        />

        <DashboardWidget
          title="Policy Version"
          value="v2.1.0"
          valueLabel="active"
          icon={<Activity className="w-5 h-5 text-purple-600" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* API Calls Over Time */}
        <div className="lg:col-span-2">
          <DashboardWidget
            title="API Call Volume"
            subtitle="Last 30 days"
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="rgba(0, 0, 0, 0.5)"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="rgba(0, 0, 0, 0.5)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total_calls"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Total Calls"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </DashboardWidget>
        </div>

        {/* Decision Distribution */}
        <DashboardWidget
          title="Decision Distribution"
          subtitle="Decisions over time"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={decisionChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {decisionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DashboardWidget>
      </div>

      {/* Latency Over Time */}
      <div>
        <DashboardWidget
          title="Average Latency Trend"
          subtitle="Response time over the last 30 days"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="rgba(0, 0, 0, 0.5)"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="rgba(0, 0, 0, 0.5)"
                  label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${value}ms`, 'Avg Latency']}
                />
                <Legend />
                <Bar
                  dataKey="avg_latency_ms"
                  fill="#10b981"
                  name="Avg Latency (ms)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardWidget>
      </div>

      {/* Error Count Over Time */}
      <div>
        <DashboardWidget
          title="Non-Allow Decisions"
          subtitle="Blocked, Review, and Unsupported decisions"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="rgba(0, 0, 0, 0.5)"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="rgba(0, 0, 0, 0.5)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="error_count"
                  fill="#ef4444"
                  name="Non-Allow Decisions"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardWidget>
      </div>
    </div>
  );
}
