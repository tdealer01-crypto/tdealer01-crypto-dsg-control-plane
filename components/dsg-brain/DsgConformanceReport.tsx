'use client';

import type { ExecutionHistoryEntry } from '@/lib/dsg/brain/ui/types';

interface DsgConformanceReportProps {
  entry?: ExecutionHistoryEntry;
}

export default function DsgConformanceReport({ entry }: DsgConformanceReportProps) {
  if (!entry) {
    return (
      <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700 p-4">
        <p className="text-slate-400 text-sm">Select an execution to view conformance details</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Conformance Report</h3>
          <span
            className={`px-2 py-1 rounded text-xs font-bold ${
              entry.success
                ? 'bg-emerald-900 text-emerald-100'
                : entry.violations.length > 0
                  ? 'bg-amber-900 text-amber-100'
                  : 'bg-red-900 text-red-100'
            }`}
          >
            {entry.success ? '✓ PASS' : entry.violations.length > 0 ? '⚠ BLOCKED' : '✗ ERROR'}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-2 font-mono">{entry.planHash}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Input</p>
          <p className="text-sm text-slate-100 bg-slate-950 p-2 rounded border border-slate-700">
            {entry.input}
          </p>
        </div>

        {entry.violations.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase mb-2">
              {entry.violations.length} Violation{entry.violations.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-2">
              {entry.violations.map((v, i) => (
                <div key={i} className="bg-slate-950 border border-amber-900 rounded p-3 text-sm">
                  <p className="font-mono text-amber-300 text-xs mb-1">Rule: {v.rule}</p>
                  <p className="text-slate-100">{v.message}</p>
                  {v.expected && (
                    <div className="mt-2 text-xs text-slate-400 space-y-1">
                      <p>Expected: {JSON.stringify(v.expected)}</p>
                      <p>Actual: {JSON.stringify(v.actual)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {entry.success && entry.result?.executedCommands && (
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase mb-2">
              {entry.result.executedCommands.length} Command{entry.result.executedCommands.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-1">
              {entry.result.executedCommands.map((cmd, i) => (
                <div key={i} className="bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-slate-100">
                  $ {cmd.command} {cmd.args.join(' ')}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-slate-400">
          <p>Timestamp: {new Date(entry.timestamp).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
