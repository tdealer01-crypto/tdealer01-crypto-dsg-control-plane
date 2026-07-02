/**
 * Comprehensive Monitoring Dashboard
 * Displays real-time metrics, alerts, executions, and trends
 */

'use client';

import { useState, useEffect } from 'react';
import { AlertHistory } from '@/app/components/monitoring/AlertHistory';
import { DataExportPanel } from '@/app/components/monitoring/DataExportPanel';
import { AdvancedFilters, FilterConfig } from '@/app/components/monitoring/AdvancedFilters';
import { MetricsTrendSummary } from '@/app/components/monitoring/MetricsTrendSummary';
import { useAlerts } from '@/hooks/useAlerts';
import { useMetricsStream } from '@/hooks/useMetricsStream';
import { AlertCircle, TrendingUp, Clock } from 'lucide-react';

export default function MonitoringDashboard() {
  const [agentId, setAgentId] = useState<string>('');
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [filters, setFilters] = useState<FilterConfig>({});
  const [filteredAlerts, setFilteredAlerts] = useState<any[]>([]);

  // Fetch alerts
  const { alerts, isLoading: alertsLoading, error: alertsError, refetch: refetchAlerts } = useAlerts(
    agentId || undefined,
    filters.status as any
  );

  // Fetch metrics
  const { metrics, isConnected, error: metricsError } = useMetricsStream(period, agentId || undefined);

  // Apply client-side filters to alerts
  useEffect(() => {
    let filtered = alerts;

    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        (alert) =>
          alert.title.toLowerCase().includes(searchLower) ||
          alert.message.toLowerCase().includes(searchLower)
      );
    }

    if (filters.severity) {
      filtered = filtered.filter((alert) => alert.severity === filters.severity);
    }

    if (filters.alertType) {
      filtered = filtered.filter((alert) => alert.alert_type === filters.alertType);
    }

    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.startDate).getTime();
      const endDate = new Date(filters.dateRange.endDate).getTime();
      filtered = filtered.filter((alert) => {
        const alertTime = new Date(alert.created_at).getTime();
        return alertTime >= startDate && alertTime <= endDate;
      });
    }

    setFilteredAlerts(filtered);
  }, [alerts, filters]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/monitoring/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'acknowledged' }),
      });

      if (response.ok) {
        refetchAlerts();
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/monitoring/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      });

      if (response.ok) {
        refetchAlerts();
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const newAlertsCount = filteredAlerts.filter((a) => a.status === 'new').length;
  const highSeverityCount = filteredAlerts.filter((a) => a.severity === 'high').length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Monitoring Dashboard</h1>
          <p className="text-gray-600">
            Real-time monitoring of agent execution metrics, alerts, and performance trends
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">New Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{newAlertsCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">High Severity</p>
                <p className="text-2xl font-bold text-gray-900">{highSeverityCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Clock className={`w-5 h-5 ${isConnected ? 'text-green-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Stream Status</p>
                <p className="text-lg font-bold text-gray-900">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="bg-white p-6 border border-gray-200 rounded-lg mb-8">
          <h2 className="text-lg font-semibold mb-4">Filters & Controls</h2>

          <div className="space-y-4">
            {/* Agent ID & Period Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent ID (optional)
                </label>
                <input
                  type="text"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="Leave blank for all agents"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Period
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="day">Last 24 Hours</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="flex items-end gap-2">
              <AdvancedFilters onFiltersChange={setFilters} />
            </div>

            {/* Error Messages */}
            {alertsError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {alertsError}
              </div>
            )}
            {metricsError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                Metrics Error: {metricsError}
              </div>
            )}
          </div>
        </div>

        {/* Trends Section */}
        {metrics && (
          <div className="mb-8">
            <MetricsTrendSummary
              metrics={[metrics]}
              period={period}
              isLoading={false}
            />
          </div>
        )}

        {/* Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Alerts</h2>
                <span className="text-sm text-gray-500">
                  {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
                </span>
              </div>

              <AlertHistory
                alerts={filteredAlerts}
                isLoading={alertsLoading}
                onAcknowledge={handleAcknowledgeAlert}
                onResolve={handleResolveAlert}
              />
            </div>
          </div>

          {/* Export Panel */}
          <div>
            <DataExportPanel
              alerts={filteredAlerts}
              executions={[]}
              metrics={metrics ? [metrics] : []}
            />
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-500">
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
          <p>Monitoring data updates every 5-10 seconds</p>
        </div>
      </div>
    </div>
  );
}
