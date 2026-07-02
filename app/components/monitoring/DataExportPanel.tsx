'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { DataExporter } from '@/lib/monitoring/data-export';

interface DataExportPanelProps {
  alerts?: Array<any>;
  executions?: Array<any>;
  metrics?: Array<any>;
}

export function DataExportPanel({
  alerts = [],
  executions = [],
  metrics = [],
}: DataExportPanelProps) {
  const [exportingType, setExportingType] = useState<string | null>(null);

  const handleExport = async (
    type: 'alerts' | 'executions' | 'metrics',
    format: 'csv' | 'json'
  ) => {
    setExportingType(`${type}-${format}`);

    try {
      switch (type) {
        case 'alerts':
          DataExporter.downloadAlerts(alerts, format);
          break;
        case 'executions':
          DataExporter.downloadExecutions(executions, format);
          break;
        case 'metrics':
          DataExporter.downloadMetrics(metrics, format);
          break;
      }
    } catch (error) {
      console.error(`Failed to export ${type}:`, error);
    } finally {
      setExportingType(null);
    }
  };

  const isExporting = exportingType !== null;

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="font-semibold text-sm mb-4">Export Data</h3>

      <div className="space-y-3">
        {alerts.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded">
            <div>
              <p className="text-sm font-medium">Alerts</p>
              <p className="text-xs text-gray-500">{alerts.length} items</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('alerts', 'csv')}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exportingType === 'alerts-csv' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                CSV
              </button>
              <button
                onClick={() => handleExport('alerts', 'json')}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exportingType === 'alerts-json' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                JSON
              </button>
            </div>
          </div>
        )}

        {executions.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded">
            <div>
              <p className="text-sm font-medium">Executions</p>
              <p className="text-xs text-gray-500">{executions.length} items</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('executions', 'csv')}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exportingType === 'executions-csv' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                CSV
              </button>
              <button
                onClick={() => handleExport('executions', 'json')}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exportingType === 'executions-json' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                JSON
              </button>
            </div>
          </div>
        )}

        {metrics.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded">
            <div>
              <p className="text-sm font-medium">Metrics</p>
              <p className="text-xs text-gray-500">{metrics.length} items</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('metrics', 'csv')}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exportingType === 'metrics-csv' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                CSV
              </button>
              <button
                onClick={() => handleExport('metrics', 'json')}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exportingType === 'metrics-json' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                JSON
              </button>
            </div>
          </div>
        )}

        {alerts.length === 0 && executions.length === 0 && metrics.length === 0 && (
          <p className="text-xs text-gray-500 py-3">No data available for export</p>
        )}
      </div>
    </div>
  );
}
