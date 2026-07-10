'use client';

/**
 * Execution List & Details Viewer
 * Display real execution data from test harness or production
 */

import { useState } from 'react';
import Link from 'next/link';

interface ExecutionItem {
  id: string;
  plan_id: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  phase: number;
  total_phases: number;
  items_completed: number;
  items_total: number;
  duration_ms: number;
  started_at: string;
  completed_at?: string;
  error?: string;
}

export default function ExecutionsPage() {
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);

  // Mock execution data (in production, fetch from API)
  const executions: ExecutionItem[] = [
    {
      id: 'exec-c8789cb-001',
      plan_id: 'plan-github-lifecycle',
      status: 'completed',
      phase: 2,
      total_phases: 2,
      items_completed: 3,
      items_total: 3,
      duration_ms: 4500,
      started_at: '2026-07-10T10:30:00Z',
      completed_at: '2026-07-10T10:30:04Z',
    },
    {
      id: 'exec-multi-chain-002',
      plan_id: 'plan-multi-chain',
      status: 'failed',
      phase: 2,
      total_phases: 3,
      items_completed: 2,
      items_total: 3,
      duration_ms: 3200,
      started_at: '2026-07-10T10:35:00Z',
      completed_at: '2026-07-10T10:35:03Z',
      error: 'Stripe webhook setup failed: Internal server error',
    },
    {
      id: 'exec-concurrent-003',
      plan_id: 'plan-concurrent-100',
      status: 'completed',
      phase: 1,
      total_phases: 1,
      items_completed: 100,
      items_total: 100,
      duration_ms: 125000,
      started_at: '2026-07-10T10:40:00Z',
      completed_at: '2026-07-10T10:42:05Z',
    },
  ];

  const selectedExec = executions.find((e) => e.id === selectedExecution);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard/setup" className="text-blue-500 hover:text-blue-700 text-sm">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mt-2">Executions</h1>
          <p className="text-slate-600">View all provision executions and their details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Execution List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h2 className="font-bold text-slate-900 mb-4">Executions ({executions.length})</h2>

              <div className="space-y-2">
                {executions.map((exec) => (
                  <button
                    key={exec.id}
                    onClick={() => setSelectedExecution(exec.id)}
                    className={`w-full text-left p-3 rounded border transition-all ${
                      selectedExecution === exec.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-medium text-slate-900 text-sm truncate flex-1">
                        {exec.plan_id}
                      </div>
                      <span
                        className={`ml-2 px-2 py-0.5 text-xs rounded font-medium whitespace-nowrap ${
                          exec.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : exec.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {exec.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{exec.id}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {exec.items_completed}/{exec.items_total} items
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Execution Details */}
          <div className="lg:col-span-2">
            {selectedExec ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">
                        Execution ID
                      </div>
                      <div className="text-sm font-mono text-slate-900 mt-1">{selectedExec.id}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">Status</div>
                      <div
                        className={`text-sm font-bold mt-1 ${
                          selectedExec.status === 'completed'
                            ? 'text-green-600'
                            : selectedExec.status === 'failed'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                        }`}
                      >
                        {selectedExec.status.toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">Duration</div>
                      <div className="text-sm text-slate-900 mt-1">
                        {(selectedExec.duration_ms / 1000).toFixed(2)}s
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">Progress</div>
                      <div className="text-sm text-slate-900 mt-1">
                        Phase {selectedExec.phase + 1} of {selectedExec.total_phases}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="text-xs text-slate-600 mb-2">
                      {selectedExec.items_completed} of {selectedExec.items_total} items completed
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          selectedExec.status === 'completed'
                            ? 'bg-green-500'
                            : selectedExec.status === 'failed'
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                        }`}
                        style={{
                          width: `${(selectedExec.items_completed / selectedExec.items_total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {selectedExec.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <div className="font-semibold mb-1">Error</div>
                      {selectedExec.error}
                    </div>
                  )}
                </div>

                {/* Event Timeline */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-900 mb-4">Event Timeline</h3>

                  <div className="space-y-3 text-sm">
                    {[
                      {
                        type: 'provision:started',
                        time: selectedExec.started_at,
                        description: 'Provision execution started',
                      },
                      {
                        type: 'item:completed',
                        time: '2026-07-10T10:30:01Z',
                        description: 'GitHub repository created',
                      },
                      {
                        type: 'item:completed',
                        time: '2026-07-10T10:30:02Z',
                        description: 'Vercel project imported',
                      },
                      {
                        type: selectedExec.status === 'failed' ? 'item:failed' : 'item:completed',
                        time: selectedExec.completed_at || selectedExec.started_at,
                        description:
                          selectedExec.status === 'failed'
                            ? 'Stripe webhook setup failed'
                            : 'Stripe webhook configured',
                      },
                      ...(selectedExec.status === 'failed'
                        ? [
                            {
                              type: 'execution:rolledback',
                              time: selectedExec.completed_at || selectedExec.started_at,
                              description: 'Rollback executed (2 items reversed)',
                            },
                          ]
                        : [
                            {
                              type: 'execution:completed',
                              time: selectedExec.completed_at || selectedExec.started_at,
                              description: 'All phases completed',
                            },
                          ]),
                    ].map((event, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                        <div>
                          <div className="font-mono text-xs text-slate-500">
                            {new Date(event.time).toLocaleTimeString()}
                          </div>
                          <div className="text-slate-700 font-medium">{event.description}</div>
                          <div className="text-xs text-slate-500">{event.type}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    View Audit Trail
                  </button>
                  <button className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50">
                    Export JSON
                  </button>
                  {selectedExec.status === 'failed' && (
                    <button className="flex-1 px-4 py-2 border border-blue-300 text-blue-700 rounded hover:bg-blue-50">
                      Replay
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <p className="text-slate-500">Select an execution to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
