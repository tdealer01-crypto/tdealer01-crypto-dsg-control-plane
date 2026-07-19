'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, Button } from '@/components/ui';

interface UsageMetrics {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  summary: {
    totalApiCalls: number;
    totalWebhookDeliveries: number;
    totalGateEvaluations: number;
    maxActiveSeats: number;
    maxStorageGb: number;
    totalCostUsd: number;
    projectedMonthlyCostUsd: number;
  };
  daily_average: {
    apiCalls: number;
    gateEvaluations: number;
  };
  daily_breakdown: Array<{
    date: string;
    apiCalls: number;
    webhookDeliveries: number;
    gateEvaluations: number;
    storageGb: number;
    activeSeats: number;
    costUsd: number;
  }>;
}

export default function UsageDashboard() {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/dashboard/usage?range=${range}`);
        if (!response.ok) {
          throw new Error('Failed to fetch usage metrics');
        }
        const data = await response.json();
        if (data.ok) {
          setMetrics(data);
        } else {
          setError(data.error || 'Unknown error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading usage metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-600 mb-2">Error loading metrics</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Usage Metrics</h1>
        <p className="text-gray-600">
          Monitor your organization&apos;s API usage, gates evaluated, and projected costs.
        </p>
      </div>

      {/* Range Selector */}
      <div className="flex gap-2">
        {['7d', '30d', '90d'].map((r) => (
          <Button
            key={r}
            onClick={() => setRange(r)}
            className={range === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}
          >
            {r === '7d' ? 'Last 7 days' : r === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total API Calls</h3>
            <div className="text-2xl font-bold">{metrics.summary.totalApiCalls.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              Avg {metrics.daily_average.apiCalls.toLocaleString()}/day
            </p>
          </div>
        </Card>

        <Card>
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Gate Evaluations</h3>
            <div className="text-2xl font-bold">{metrics.summary.totalGateEvaluations.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              Avg {metrics.daily_average.gateEvaluations.toLocaleString()}/day
            </p>
          </div>
        </Card>

        <Card>
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Max Active Seats</h3>
            <div className="text-2xl font-bold">{metrics.summary.maxActiveSeats}</div>
            <p className="text-xs text-gray-500 mt-1">Concurrent users</p>
          </div>
        </Card>

        <Card>
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Projected Monthly Cost</h3>
            <div className="text-2xl font-bold">${metrics.summary.projectedMonthlyCostUsd.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">
              ${metrics.summary.totalCostUsd.toFixed(2)} in period
            </p>
          </div>
        </Card>
      </div>

      {/* API Calls Trend */}
      <Card>
        <div>
          <h2 className="text-lg font-semibold mb-1">API Calls Trend</h2>
          <p className="text-sm text-gray-600 mb-4">Daily API calls over the selected period</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics.daily_breakdown}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="apiCalls" stroke="#3b82f6" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Gate Evaluations vs Webhooks */}
      <Card>
        <div>
          <h2 className="text-lg font-semibold mb-1">Activity Breakdown</h2>
          <p className="text-sm text-gray-600 mb-4">Gate evaluations and webhook deliveries per day</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics.daily_breakdown}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="gateEvaluations" fill="#10b981" />
            <Bar dataKey="webhookDeliveries" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Storage Trend */}
      <Card>
        <div>
          <h2 className="text-lg font-semibold mb-1">Storage Usage</h2>
          <p className="text-sm text-gray-600 mb-4">Total storage used over time</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics.daily_breakdown}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `${value} GB`} />
            <Legend />
            <Line type="monotone" dataKey="storageGb" stroke="#8b5cf6" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Daily Cost */}
      <Card>
        <div>
          <h2 className="text-lg font-semibold mb-1">Daily Cost</h2>
          <p className="text-sm text-gray-600 mb-4">Cost breakdown by day</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics.daily_breakdown}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `$${parseFloat(value).toFixed(2)}`} />
            <Legend />
            <Bar dataKey="costUsd" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Period Info */}
      <Card>
        <div>
          <h2 className="text-lg font-semibold mb-4">Summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Period:</dt>
              <dd className="font-mono">
                {metrics.period.startDate} to {metrics.period.endDate}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Days:</dt>
              <dd>{metrics.period.days}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Webhook Deliveries:</dt>
              <dd>{metrics.summary.totalWebhookDeliveries.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Max Storage:</dt>
              <dd>{metrics.summary.maxStorageGb} GB</dd>
            </div>
          </dl>
        </div>
      </Card>
    </div>
  );
}
