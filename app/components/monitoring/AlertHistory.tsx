'use client';

import { AlertBadge } from './AlertBadge';
import { AlertCircle, Loader2 } from 'lucide-react';

interface Alert {
  alert_id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high';
  status: 'new' | 'acknowledged' | 'resolved';
  title: string;
  message: string;
  created_at: string;
  metadata: Record<string, any> | null;
}

interface AlertHistoryProps {
  alerts: Alert[];
  isLoading?: boolean;
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function AlertHistory({
  alerts,
  isLoading = false,
  onAcknowledge,
  onResolve,
}: AlertHistoryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <AlertCircle className="w-8 h-8 mb-2 text-gray-300" />
        <p>No alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.alert_id}
          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2">
                <AlertBadge
                  severity={alert.severity}
                  status={alert.status}
                  title={alert.title}
                />
              </div>
              <p className="text-sm text-gray-700">{alert.message}</p>
              <p className="text-xs text-gray-500 mt-2">
                {formatTime(alert.created_at)}
              </p>
            </div>

            {alert.status === 'new' && (
              <div className="flex gap-2">
                {onAcknowledge && (
                  <button
                    onClick={() => onAcknowledge(alert.alert_id)}
                    className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
                {onResolve && (
                  <button
                    onClick={() => onResolve(alert.alert_id)}
                    className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                  >
                    Resolve
                  </button>
                )}
              </div>
            )}
          </div>

          {alert.metadata && Object.keys(alert.metadata).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(alert.metadata).slice(0, 4).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-500 font-medium">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-gray-700 ml-1">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
