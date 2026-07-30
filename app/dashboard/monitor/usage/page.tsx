'use client';

import { useEffect, useState } from 'react';
import { Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardWidget } from '@/components/Monitor/DashboardWidget';

interface UsageRecord {
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
}

interface UsageResponse {
  ok: boolean;
  data: UsageRecord[];
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
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
  date_range: {
    start_date: string;
    end_date: string;
  };
}

/**
 * Usage Analytics Page
 *
 * Shows detailed historical API usage data with:
 * - Pagination
 * - Date range filtering
 * - CSV/JSON export
 * - Detailed decision breakdowns
 */
export default function UsageAnalytics() {
  const [usageData, setUsageData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Initialize date range (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  // Fetch data when parameters change
  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          limit: pageSize.toString(),
          offset: (currentPage * pageSize).toString(),
          start_date: startDate,
          end_date: endDate,
        });

        const response = await fetch(`/api/monitor/usage?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch usage data');
        }

        const data: UsageResponse = await response.json();
        if (!data.ok) {
          throw new Error('Invalid response');
        }

        setUsageData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, pageSize, startDate, endDate]);

  // Export data as CSV
  const exportAsCSV = () => {
    if (!usageData?.data) return;

    const headers = ['Date', 'Total Calls', 'Avg Latency (ms)', 'Error Count', 'Allow', 'Block', 'Review', 'Unsupported'];
    const rows = usageData.data.map((record) => [
      record.date,
      record.total_calls,
      record.avg_latency_ms,
      record.error_count,
      record.decision_counts.ALLOW,
      record.decision_counts.BLOCK,
      record.decision_counts.REVIEW,
      record.decision_counts.UNSUPPORTED,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Export data as JSON
  const exportAsJSON = () => {
    if (!usageData) return;

    const json = JSON.stringify(usageData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const totalPages = usageData ? Math.ceil(usageData.pagination.total / pageSize) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Usage Analytics</h1>
        <p className="text-gray-600">Detailed historical API usage metrics with filtering and export options</p>
      </div>

      {/* Summary Stats */}
      {usageData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardWidget
            title="Total Calls (Period)"
            value={usageData.summary.total_calls.toLocaleString()}
            valueLabel="executions"
          />
          <DashboardWidget
            title="Error Rate"
            value={usageData.summary.error_rate.toFixed(1)}
            valueLabel="%"
          />
          <DashboardWidget
            title="Avg Latency"
            value={usageData.summary.avg_latency_ms}
            valueLabel="ms"
          />
          <DashboardWidget
            title="Allowed Decisions"
            value={usageData.summary.decision_breakdown.ALLOW.toLocaleString()}
            valueLabel="approved"
          />
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-800">
        <div className="space-y-4">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(0); // Reset to first page
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(0); // Reset to first page
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={exportAsCSV}
              disabled={loading || !usageData}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={exportAsJSON}
              disabled={loading || !usageData}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:bg-red-900 dark:border-red-700">
          <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      ) : usageData?.data && usageData.data.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Total Calls</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Avg Latency</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Errors</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Allow</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Block</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Review</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Unsupported</th>
                </tr>
              </thead>
              <tbody>
                {usageData.data.map((record, idx) => (
                  <tr
                    key={record.date}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{record.date}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {record.total_calls.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {record.avg_latency_ms}ms
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-red-600 dark:text-red-400">
                      {record.error_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-green-600 dark:text-green-400">
                      {record.decision_counts.ALLOW.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-red-600 dark:text-red-400">
                      {record.decision_counts.BLOCK.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-yellow-600 dark:text-yellow-400">
                      {record.decision_counts.REVIEW.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {record.decision_counts.UNSUPPORTED.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage + 1} of {totalPages} ({usageData.pagination.total} total records)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={!usageData.pagination.has_more}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center dark:bg-gray-900 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400">No usage data available for the selected date range</p>
        </div>
      )}
    </div>
  );
}
