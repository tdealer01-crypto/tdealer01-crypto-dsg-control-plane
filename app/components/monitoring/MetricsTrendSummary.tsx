'use client';

import { TrendChart } from './TrendChart';
import { AlertCircle } from 'lucide-react';

interface MetricsSnapshot {
  timestamp: string;
  totalExecutions: number;
  successRate: number;
  totalCost: number;
  totalTokens: number;
  avgDuration: number;
}

interface MetricsTrendSummaryProps {
  metrics: MetricsSnapshot[];
  period?: 'day' | 'week' | 'month';
  isLoading?: boolean;
}

export function MetricsTrendSummary({
  metrics,
  period = 'month',
  isLoading = false,
}: MetricsTrendSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border border-gray-200 rounded-lg bg-gray-50 h-64" />
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="p-8 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center text-gray-500">
          <AlertCircle className="w-8 h-8 mb-2 text-gray-300" />
          <p className="text-sm">No metrics data available</p>
        </div>
      </div>
    );
  }

  // Prepare trend data
  const executionTrend = metrics.map((m) => ({
    label: new Date(m.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    value: m.totalExecutions,
  }));

  const successRateTrend = metrics.map((m) => ({
    label: new Date(m.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    value: m.successRate,
  }));

  const costTrend = metrics.map((m) => ({
    label: new Date(m.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    value: m.totalCost,
  }));

  const tokensTrend = metrics.map((m) => ({
    label: new Date(m.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    value: m.totalTokens,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trends & Analytics</h2>
        <span className="text-xs text-gray-500">
          Last {period === 'day' ? '24 hours' : period === 'week' ? '7 days' : '30 days'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TrendChart
          title="Total Executions"
          data={executionTrend}
          unit="executions"
          showPercentChange={true}
        />

        <TrendChart
          title="Success Rate"
          data={successRateTrend}
          unit="%"
          showPercentChange={false}
        />

        <TrendChart
          title="Total Cost"
          data={costTrend}
          unit="USD"
          showPercentChange={true}
        />

        <TrendChart
          title="Token Usage"
          data={tokensTrend}
          unit="tokens"
          showPercentChange={true}
        />
      </div>

      {metrics.length > 0 && (
        <div className="p-4 border border-gray-200 rounded-lg bg-blue-50">
          <p className="text-sm font-medium text-blue-900 mb-2">📊 Data Summary</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-blue-800">
            <div>
              <p className="text-blue-600 font-medium">Total Executions</p>
              <p className="text-lg font-bold">
                {metrics.reduce((sum, m) => sum + m.totalExecutions, 0)}
              </p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">Avg Success Rate</p>
              <p className="text-lg font-bold">
                {(
                  metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length
                ).toFixed(1)}
                %
              </p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">Total Cost</p>
              <p className="text-lg font-bold">
                ${metrics.reduce((sum, m) => sum + m.totalCost, 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">Total Tokens</p>
              <p className="text-lg font-bold">
                {metrics.reduce((sum, m) => sum + m.totalTokens, 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
