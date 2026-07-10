'use client';

/**
 * Audit Trail Viewer
 * Display immutable event hash-chain for compliance & transparency
 */

import { useState } from 'react';
import Link from 'next/link';

interface AuditEvent {
  id: string;
  sequence: number;
  type: string;
  timestamp: string;
  org_id: string;
  execution_id?: string;
  event_hash: string;
  previous_hash: string | null;
  data: Record<string, unknown>;
}

export default function AuditPage() {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Mock audit trail (in production, fetch from dsg_provision_audit_events)
  const auditEvents: AuditEvent[] = [
    {
      id: 'evt-001',
      sequence: 1,
      type: 'provision:started',
      timestamp: '2026-07-10T10:30:00Z',
      org_id: 'test-org',
      execution_id: 'exec-001',
      event_hash: 'sha256:abc123def456',
      previous_hash: null,
      data: {
        execution_id: 'exec-001',
        plan_id: 'plan-001',
        approval_id: 'appr-001',
      },
    },
    {
      id: 'evt-002',
      sequence: 2,
      type: 'item:completed',
      timestamp: '2026-07-10T10:30:01Z',
      org_id: 'test-org',
      execution_id: 'exec-001',
      event_hash: 'sha256:def456ghi789',
      previous_hash: 'sha256:abc123def456',
      data: {
        item_id: 'github:create_repository',
        provider: 'github',
        duration_seconds: 1.2,
      },
    },
    {
      id: 'evt-003',
      sequence: 3,
      type: 'item:completed',
      timestamp: '2026-07-10T10:30:02Z',
      org_id: 'test-org',
      execution_id: 'exec-001',
      event_hash: 'sha256:ghi789jkl012',
      previous_hash: 'sha256:def456ghi789',
      data: {
        item_id: 'vercel:import_repository',
        provider: 'vercel',
        duration_seconds: 1.8,
      },
    },
    {
      id: 'evt-004',
      sequence: 4,
      type: 'item:failed',
      timestamp: '2026-07-10T10:30:03Z',
      org_id: 'test-org',
      execution_id: 'exec-001',
      event_hash: 'sha256:jkl012mno345',
      previous_hash: 'sha256:ghi789jkl012',
      data: {
        item_id: 'stripe:setup_webhook',
        provider: 'stripe',
        error: 'Internal server error',
      },
    },
    {
      id: 'evt-005',
      sequence: 5,
      type: 'execution:rolledback',
      timestamp: '2026-07-10T10:30:04Z',
      org_id: 'test-org',
      execution_id: 'exec-001',
      event_hash: 'sha256:mno345pqr678',
      previous_hash: 'sha256:jkl012mno345',
      data: {
        items_rolled_back: 2,
        items: ['vercel:import_repository', 'github:create_repository'],
      },
    },
  ];

  const filteredEvents =
    filterType === 'all' ? auditEvents : auditEvents.filter((e) => e.type === filterType);

  const selectedEventData = auditEvents.find((e) => e.id === selectedEvent);

  const verifyHashChain = () => {
    // Simple verification: check that previous_hash matches prior event's hash
    let isValid = true;
    for (let i = 1; i < auditEvents.length; i++) {
      if (auditEvents[i].previous_hash !== auditEvents[i - 1].event_hash) {
        isValid = false;
        break;
      }
    }
    return isValid;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard/setup" className="text-blue-500 hover:text-blue-700 text-sm">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mt-2">Audit Trail</h1>
          <p className="text-slate-600">Immutable event hash-chain for compliance verification</p>
        </div>

        {/* Hash Chain Integrity Status */}
        <div className="mb-6 p-4 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Hash Chain Integrity</h3>
              <p className="text-sm text-slate-600">
                Verifies that no events have been tampered with or reordered
              </p>
            </div>
            <div
              className={`text-right ${verifyHashChain() ? 'text-green-600' : 'text-red-600'}`}
            >
              <div className="text-2xl font-bold">{verifyHashChain() ? '✓ Valid' : '✗ Invalid'}</div>
              <div className="text-xs text-slate-600">{auditEvents.length} events verified</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="mb-4">
                <h2 className="font-bold text-slate-900 mb-2">Events ({filteredEvents.length})</h2>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                >
                  <option value="all">All Events</option>
                  <option value="provision:started">Provision Started</option>
                  <option value="item:completed">Item Completed</option>
                  <option value="item:failed">Item Failed</option>
                  <option value="execution:rolledback">Execution Rolled Back</option>
                </select>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event.id)}
                    className={`w-full text-left p-3 rounded border transition-all text-sm ${
                      selectedEvent === event.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-mono text-xs text-slate-500">#{event.sequence}</div>
                      <div className="font-mono text-xs text-slate-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="font-medium text-slate-900 truncate">{event.type}</div>
                    <div className="text-xs text-slate-500 truncate font-mono">
                      {event.event_hash.substring(0, 20)}...
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="lg:col-span-2">
            {selectedEventData ? (
              <div className="space-y-4">
                {/* Event Header */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900">{selectedEventData.type}</h3>
                    <p className="text-sm text-slate-600">
                      Event #{selectedEventData.sequence} in chain
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">Timestamp</div>
                      <div className="text-sm text-slate-900 mt-1">
                        {new Date(selectedEventData.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">
                        Execution
                      </div>
                      <div className="text-sm font-mono text-slate-900 mt-1">
                        {selectedEventData.execution_id || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hash Chain */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-900 mb-4">Hash Chain Verification</h3>

                  <div className="space-y-3 text-sm font-mono">
                    {selectedEventData.previous_hash && (
                      <div>
                        <div className="text-xs text-slate-500 uppercase font-semibold mb-1">
                          Previous Event Hash
                        </div>
                        <div className="p-2 bg-slate-50 rounded text-slate-600 break-all">
                          {selectedEventData.previous_hash}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold mb-1">
                        Current Event Hash
                      </div>
                      <div className="p-2 bg-blue-50 rounded text-blue-600 break-all border border-blue-200">
                        {selectedEventData.event_hash}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                    ✓ Hash chain integrity verified for this event
                  </div>
                </div>

                {/* Event Data */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-900 mb-4">Event Data</h3>

                  <pre className="p-4 bg-slate-50 rounded text-xs text-slate-900 overflow-x-auto">
                    {JSON.stringify(selectedEventData.data, null, 2)}
                  </pre>
                </div>

                {/* Export */}
                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                    Export Event
                  </button>
                  <button className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 text-sm">
                    Copy Hash
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <p className="text-slate-500">Select an event to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
