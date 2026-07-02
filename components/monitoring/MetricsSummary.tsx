/**
 * MetricsSummary - Display monitoring metrics cards
 * Used in: /dashboard (quick stats section)
 * Phase 2: Non-breaking integration
 */

'use client';

import React from 'react';
import { useMetrics } from '@/hooks/useMonitoring';

interface MetricsSummaryProps {
  agentId?: string;
  period?: 'day' | 'week' | 'month';
  autoRefresh?: boolean;
}

export function MetricsSummary({
  agentId,
  period = 'month',
  autoRefresh = true,
}: MetricsSummaryProps) {
  const { data, loading, error } = useMetrics({
    agentId,
    period,
    pollInterval: autoRefresh ? 10000 : undefined, // Refresh every 10 seconds
  });

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Failed to load metrics
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4 animate-pulse"
          >
            <div className="h-4 w-24 rounded bg-gray-200"></div>
            <div className="mt-2 h-8 w-32 rounded bg-gray-200"></div>
          </div>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total Executions',
      value: data?.totalExecutions || 0,
      icon: '⚙️',
      color: 'blue',
    },
    {
      label: 'Success Rate',
      value: `${data?.successRate?.toFixed(1) || 0}%`,
      icon: '✅',
      color: 'green',
    },
    {
      label: 'Total Cost',
      value: `$${data?.totalCost?.toFixed(2) || '0.00'}`,
      icon: '💰',
      color: 'amber',
    },
    {
      label: 'Avg Duration',
      value: `${data?.avgDuration?.toFixed(2) || '0'}s`,
      icon: '⏱️',
      color: 'purple',
    },
  ];

  const colorMap = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    amber: 'bg-amber-50 border-amber-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`rounded-lg border ${colorMap[metric.color as keyof typeof colorMap]} p-4`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">{metric.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{metric.value}</p>
            </div>
            <span className="text-3xl">{metric.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
