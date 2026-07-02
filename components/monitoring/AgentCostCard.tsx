/**
 * AgentCostCard - Display agent cost metrics
 * Used in: /dashboard/agents (enhanced agent list item)
 * Phase 2: Non-breaking integration
 */

'use client';

import React from 'react';
import { useMetrics } from '@/hooks/useMonitoring';

interface AgentCostCardProps {
  agentId: string;
  dailyLimit?: number;
  monthlyLimit?: number;
  isRunning?: boolean;
  lastUpdate?: string;
}

export function AgentCostCard({
  agentId,
  dailyLimit = 500,
  monthlyLimit = 10000,
  isRunning = false,
}: AgentCostCardProps) {
  const { data: monthlyData, loading: loadingMonthly } = useMetrics({
    agentId,
    period: 'month',
    pollInterval: 30000, // Refresh every 30 seconds
  });

  const { data: dailyData, loading: loadingDaily } = useMetrics({
    agentId,
    period: 'day',
    pollInterval: 30000,
  });

  if (loadingMonthly || loadingDaily) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 w-32 rounded bg-gray-200"></div>
        <div className="h-2 w-full rounded-full bg-gray-200"></div>
      </div>
    );
  }

  const monthlyUsed = monthlyData?.totalCost || 0;
  const monthlyPercent = ((monthlyUsed / monthlyLimit) * 100).toFixed(0);
  const monthlyStatus = monthlyUsed >= monthlyLimit ? 'danger' : monthlyUsed >= monthlyLimit * 0.7 ? 'warning' : 'normal';

  const dailyUsed = dailyData?.totalCost || 0;
  const dailyPercent = ((dailyUsed / dailyLimit) * 100).toFixed(0);
  const dailyStatus = dailyUsed >= dailyLimit ? 'danger' : dailyUsed >= dailyLimit * 0.7 ? 'warning' : 'normal';

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'danger':
        return 'bg-red-500';
      case 'warning':
        return 'bg-amber-500';
      default:
        return 'bg-green-500';
    }
  };

  const getProgressBgColor = (status: string) => {
    switch (status) {
      case 'danger':
        return 'bg-red-100';
      case 'warning':
        return 'bg-amber-100';
      default:
        return 'bg-green-100';
    }
  };

  const getAlertIcon = (status: string) => {
    switch (status) {
      case 'danger':
        return '🔴';
      case 'warning':
        return '⚠️';
      default:
        return '✅';
    }
  };

  return (
    <div className="space-y-4 rounded-lg bg-white p-4">
      {/* Daily Limit */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Daily Cost</label>
          <span className="text-sm font-mono text-gray-600">
            ${dailyUsed.toFixed(2)} / ${dailyLimit} {getAlertIcon(dailyStatus)}
          </span>
        </div>
        <div className={`h-2 w-full overflow-hidden rounded-full ${getProgressBgColor(dailyStatus)}`}>
          <div
            className={`h-full transition-all ${getProgressColor(dailyStatus)}`}
            style={{ width: `${Math.min(100, parseInt(dailyPercent))}%` }}
          ></div>
        </div>
        <p className="mt-1 text-xs text-gray-500">{dailyPercent}% used</p>
      </div>

      {/* Monthly Limit */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Monthly Cost</label>
          <span className="text-sm font-mono text-gray-600">
            ${monthlyUsed.toFixed(2)} / ${monthlyLimit} {getAlertIcon(monthlyStatus)}
          </span>
        </div>
        <div className={`h-2 w-full overflow-hidden rounded-full ${getProgressBgColor(monthlyStatus)}`}>
          <div
            className={`h-full transition-all ${getProgressColor(monthlyStatus)}`}
            style={{ width: `${Math.min(100, parseInt(monthlyPercent))}%` }}
          ></div>
        </div>
        <p className="mt-1 text-xs text-gray-500">{monthlyPercent}% used</p>
      </div>

      {/* Status */}
      {isRunning && (
        <div className="rounded bg-blue-50 p-2 text-sm text-blue-700">
          🔵 Currently running - updating live
        </div>
      )}

      {monthlyStatus === 'danger' && (
        <div className="rounded bg-red-50 p-2 text-sm text-red-700">
          🔴 Monthly budget limit reached
        </div>
      )}

      {monthlyStatus === 'warning' && (
        <div className="rounded bg-amber-50 p-2 text-sm text-amber-700">
          ⚠️ Monthly budget at {monthlyPercent}% - approaching limit
        </div>
      )}
    </div>
  );
}
