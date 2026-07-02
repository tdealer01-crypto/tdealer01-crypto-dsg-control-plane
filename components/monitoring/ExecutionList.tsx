/**
 * ExecutionList - Display list of executions
 * Used in: /dashboard/executions (enhanced with monitoring)
 * Phase 2: Non-breaking integration
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useExecutions } from '@/hooks/useMonitoring';

interface ExecutionListProps {
  agentId?: string;
  limit?: number;
  autoRefresh?: boolean;
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const secondsAgo = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (secondsAgo < 60) return `${secondsAgo}s ago`;
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const daysAgo = Math.floor(hoursAgo / 24);
  return `${daysAgo}d ago`;
}

export function ExecutionList({
  agentId,
  limit = 20,
  autoRefresh = true,
}: ExecutionListProps) {
  const [offset, setOffset] = useState(0);

  const { data, total, loading, error, refetch } = useExecutions({
    agentId,
    limit,
    offset,
    pollInterval: autoRefresh ? 5000 : undefined, // Refresh every 5 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failure':
        return 'bg-red-100 text-red-800';
      case 'blocked':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'failure':
        return '❌';
      case 'blocked':
        return '🔴';
      default:
        return '⏳';
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">Failed to load executions: {error}</p>
        <button
          onClick={refetch}
          className="mt-2 text-sm text-red-600 underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading && data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading executions...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Started</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Tokens</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Cost</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Duration</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No executions found
                </td>
              </tr>
            ) : (
              data.map((execution: any) => {
                const duration = execution.end_time
                  ? (new Date(execution.end_time).getTime() -
                      new Date(execution.start_time).getTime()) /
                    1000
                  : null;

                return (
                  <tr key={execution.execution_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(execution.status)}`}>
                        <span className="mr-1">{getStatusIcon(execution.status)}</span>
                        {execution.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatTimeAgo(execution.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600">
                      {execution.total_tokens?.toLocaleString() || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600">
                      ${execution.total_cost_usd?.toFixed(4) || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {duration ? `${duration.toFixed(2)}s` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/dashboard/executions/${execution.execution_id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <div className="text-sm text-gray-600">
            Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
