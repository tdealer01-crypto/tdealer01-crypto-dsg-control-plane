'use client';

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

interface LogViewerProps {
  events: AuditEvent[];
  isLoading?: boolean;
  isEmpty?: boolean;
}

export function LogViewer({ events, isLoading = false, isEmpty = false }: LogViewerProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  if (isEmpty || events.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-gray-500">
        No audit events found
      </div>
    );
  }

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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left font-semibold text-gray-900">Timestamp</th>
            <th className="px-6 py-3 text-left font-semibold text-gray-900">Decision</th>
            <th className="px-6 py-3 text-left font-semibold text-gray-900">Agent</th>
            <th className="px-6 py-3 text-left font-semibold text-gray-900">Reason</th>
            <th className="px-6 py-3 text-left font-semibold text-gray-900">Policy Version</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
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
  );
}
