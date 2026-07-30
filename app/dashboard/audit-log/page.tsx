'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, Download, Search } from 'lucide-react';

interface AuditEvent {
  id: string;
  org_id: string;
  agent_id: string;
  execution_id: string | null;
  decision: string;
  reason: string;
  policy_version: string;
  actor_uuid: string | null;
  metadata: Record<string, unknown>;
  evidence: Record<string, unknown>;
  created_at: string;
}

interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
  has_more: boolean;
}

interface AuditLogsResponse {
  ok: boolean;
  events: AuditEvent[];
  pagination: PaginationInfo;
}

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [dateRange, setDateRange] = useState('7d');
  const [search, setSearch] = useState('');
  const [decision, setDecision] = useState('');
  const [agentId, setAgentId] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const limit = 25;

  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'agent' | 'decision'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Fetch audit logs
  const fetchLogs = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('limit', String(limit));
      params.append('offset', String((pageNum - 1) * limit));

      // Add date range filter
      const now = new Date();
      const daysBack = parseInt(dateRange);
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - daysBack);
      params.append('start_date', startDate.toISOString());
      params.append('end_date', now.toISOString());

      if (decision) params.append('decision', decision);
      if (agentId) params.append('agent_id', agentId);
      if (search) params.append('search', search);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data: AuditLogsResponse = await response.json();
      if (!data.ok) {
        throw new Error(data as unknown as string);
      }

      setEvents(data.events || []);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [limit, dateRange, decision, agentId, search]);

  // Fetch on filter changes
  useEffect(() => {
    setPage(1);
    void fetchLogs(1);
  }, [dateRange, search, decision, agentId, fetchLogs]);

  // Fetch on page change
  useEffect(() => {
    void fetchLogs(page);
  }, [page, fetchLogs]);

  // Sort events
  const sortedEvents = useMemo(() => {
    const sorted = [...events];
    sorted.sort((a, b) => {
      let compareValue = 0;
      switch (sortBy) {
        case 'date':
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'agent':
          compareValue = a.agent_id.localeCompare(b.agent_id);
          break;
        case 'decision':
          compareValue = a.decision.localeCompare(b.decision);
          break;
      }
      return sortAsc ? compareValue : -compareValue;
    });
    return sorted;
  }, [events, sortBy, sortAsc]);

  const getDecisionColor = (decision: string) => {
    switch (decision?.toUpperCase()) {
      case 'PASS':
      case 'ALLOW':
        return 'bg-green-100 text-green-800';
      case 'BLOCK':
        return 'bg-red-100 text-red-800';
      case 'REVIEW':
      case 'STABILIZE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    const params = new URLSearchParams();
    const now = new Date();
    const daysBack = parseInt(dateRange);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);
    params.append('start_date', startDate.toISOString());
    params.append('end_date', now.toISOString());
    params.append('limit', String(pagination?.total || 1000));
    if (decision) params.append('decision', decision);
    if (agentId) params.append('agent_id', agentId);
    if (search) params.append('search', search);

    const response = await fetch(`/api/audit-logs?${params.toString()}`);
    const data = await response.json();

    if (format === 'json') {
      const jsonStr = JSON.stringify(data.events, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${Date.now()}.json`;
      a.click();
    } else {
      // CSV export
      const csv = eventsToCSV(data.events || []);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${Date.now()}.csv`;
      a.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Audit Log</h1>
        <p className="text-gray-600">
          Search and filter audit logs. Phase 1 limited to 7 days of recent data.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Filters</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
            </select>
          </div>

          {/* Decision Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decision
            </label>
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Decisions</option>
              <option value="PASS">PASS</option>
              <option value="BLOCK">BLOCK</option>
              <option value="REVIEW">REVIEW</option>
              <option value="ALLOW">ALLOW</option>
            </select>
          </div>

          {/* Agent Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent ID
            </label>
            <input
              type="text"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="Filter by agent..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Reason
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={() => handleExport('json')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading audit logs...</p>
          </div>
        </div>
      )}

      {/* Results Table */}
      {!loading && !error && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {sortedEvents.length} of {pagination?.total || 0} events
              </p>
            </div>

            {sortedEvents.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No audit events found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">
                        <button
                          onClick={() => {
                            if (sortBy === 'date') setSortAsc(!sortAsc);
                            setSortBy('date');
                          }}
                          className="flex items-center gap-2 hover:text-blue-600"
                        >
                          Timestamp
                          {sortBy === 'date' && (sortAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">
                        <button
                          onClick={() => {
                            if (sortBy === 'decision') setSortAsc(!sortAsc);
                            setSortBy('decision');
                          }}
                          className="flex items-center gap-2 hover:text-blue-600"
                        >
                          Decision
                          {sortBy === 'decision' && (sortAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">
                        <button
                          onClick={() => {
                            if (sortBy === 'agent') setSortAsc(!sortAsc);
                            setSortBy('agent');
                          }}
                          className="flex items-center gap-2 hover:text-blue-600"
                        >
                          Agent
                          {sortBy === 'agent' && (sortAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Reason</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Policy Version</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEvents.map((event) => (
                      <tr key={event.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-xs text-gray-600 whitespace-nowrap">
                          {new Date(event.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getDecisionColor(event.decision)}`}>
                            {event.decision}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-gray-700">
                          {event.agent_id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">
                          {event.reason || '-'}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {event.policy_version || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.total > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {page} of {Math.ceil((pagination.total || 1) / limit)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!pagination.has_more}
                    className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function eventsToCSV(events: AuditEvent[]): string {
  const headers = ['Timestamp', 'Decision', 'Agent ID', 'Reason', 'Policy Version', 'Actor UUID'];
  const rows = events.map((event) => [
    new Date(event.created_at).toISOString(),
    event.decision,
    event.agent_id,
    event.reason || '',
    event.policy_version,
    event.actor_uuid || '',
  ]);

  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}
