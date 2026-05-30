'use client';

import type { ExecutionHistoryEntry } from '@/lib/dsg/brain/ui/types';

interface DsgExecutionHistoryProps {
  entries: ExecutionHistoryEntry[];
  onSelectEntry: (entry: ExecutionHistoryEntry) => void;
}

export default function DsgExecutionHistory({ entries, onSelectEntry }: DsgExecutionHistoryProps) {
  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Execution History</h3>
        <p className="text-xs text-slate-400 mt-1">{entries.length} executions</p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-sm">
            No executions yet
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {entries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className="w-full text-left p-3 hover:bg-slate-800 transition border-b border-slate-700 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate font-medium">{entry.input}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          entry.success
                            ? 'bg-emerald-900 text-emerald-100'
                            : entry.violations.length > 0
                              ? 'bg-amber-900 text-amber-100'
                              : 'bg-red-900 text-red-100'
                        }`}
                      >
                        {entry.success ? '✓ Pass' : entry.violations.length > 0 ? '⚠ Blocked' : '✗ Error'}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-mono truncate max-w-[100px]">
                      {entry.planHash.slice(0, 8)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
