'use client';

import { useEffect, useState } from 'react';
import { Card, Button } from '@/components/ui';

interface AuditRecord {
  timestamp: string;
  action: string;
  severity: string;
  actor: string;
  resource_type: string;
  result: string;
  correlation_id: string;
  message: string;
}

export default function AuditTrailDashboard() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState('30d');
  const [severity, setSeverity] = useState('');
  const [action, setAction] = useState('');
  const [format, setFormat] = useState<'json' | 'csv'>('json');

  const fetchAuditTrail = async (params: Record<string, string>) => {
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams(params);
      const response = await fetch(`/api/admin/audit-trail?${query.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit trail');
      }
      const data = await response.json();
      if (data.ok) {
        setRecords(data.records || []);
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params: Record<string, string> = { range };
    if (severity) params.filter = (params.filter || '') + `severity:${severity}`;
    if (action) params.filter = (params.filter || '') + `action:${action}`;
    fetchAuditTrail(params);
  }, [range, severity, action]);

  const handleExport = async () => {
    try {
      const params: Record<string, string> = { range, format };
      if (severity) params.filter = (params.filter || '') + `severity:${severity}`;
      if (action) params.filter = (params.filter || '') + `action:${action}`;
      const query = new URLSearchParams(params);
      const response = await fetch(`/api/admin/audit-trail?${query.toString()}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'ERROR':
        return 'bg-orange-100 text-orange-800';
      case 'WARN':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Audit Trail</h1>
        <p className="text-gray-600">
          Monitor all organizational activities, security events, and compliance-relevant actions.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div>
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="INFO">Info</option>
                <option value="WARN">Warning</option>
                <option value="ERROR">Error</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <input
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="e.g., gate_evaluate"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => fetchAuditTrail({ range, ...(severity && { filter: `severity:${severity}` }), ...(action && { filter: `action:${action}` }) })}
            >
              Apply Filters
            </Button>
            <Button
              onClick={() => setFormat('json')}
              className={format === 'json' ? 'bg-blue-100' : 'bg-gray-100'}
            >
              JSON Export
            </Button>
            <Button
              onClick={() => setFormat('csv')}
              className={format === 'csv' ? 'bg-blue-100' : 'bg-gray-100'}
            >
              CSV Export
            </Button>
            <Button onClick={handleExport}>Download</Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading audit records...</p>
          </div>
        </div>
      ) : error ? (
        <Card variant="error">
          <div>
            <h2 className="text-red-600 font-semibold mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div>
            <h2 className="text-lg font-semibold mb-1">Audit Records</h2>
            <p className="text-sm text-gray-600 mb-4">{records.length} records found</p>

            {records.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No audit records found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold">Timestamp</th>
                      <th className="text-left py-2 px-3 font-semibold">Severity</th>
                      <th className="text-left py-2 px-3 font-semibold">Action</th>
                      <th className="text-left py-2 px-3 font-semibold">Actor</th>
                      <th className="text-left py-2 px-3 font-semibold">Result</th>
                      <th className="text-left py-2 px-3 font-semibold">Correlation ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-xs text-gray-500">
                          {new Date(record.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(record.severity)}`}>
                            {record.severity}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-xs">{record.action}</td>
                        <td className="py-2 px-3 text-xs">{record.actor}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded text-xs ${record.result === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {record.result}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-xs text-gray-500 truncate" title={record.correlation_id}>
                          {record.correlation_id?.substring(0, 8)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Correlation ID Info */}
      <Card>
        <div>
          <h2 className="text-sm font-semibold mb-2">Correlation ID</h2>
          <p className="text-xs text-gray-600">Trace related events across the system</p>
          <p className="text-sm text-gray-600 mt-2">
            Each audit record includes a correlation_id that traces requests through the system. Use this ID to
            correlate audit events across distributed services and troubleshoot issues.
          </p>
        </div>
      </Card>
    </div>
  );
}
