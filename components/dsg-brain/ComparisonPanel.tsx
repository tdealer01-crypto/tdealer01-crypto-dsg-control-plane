'use client';

import { useMemo } from 'react';
import { diffJson, generateDiffSummary } from '@/lib/dsg/brain/ui/diff-json';
import type { ExecutionHistoryEntry } from '@/lib/dsg/brain/ui/types';

interface ComparisonPanelProps {
  before: ExecutionHistoryEntry | null;
  after: ExecutionHistoryEntry | null;
  onClose?: () => void;
}

export default function ComparisonPanel({ before, after, onClose }: ComparisonPanelProps) {
  const diff = useMemo(() => {
    if (!before?.result || !after?.result) {
      return null;
    }
    return diffJson(before.result as any, after.result as any);
  }, [before, after]);

  const summary = useMemo(() => {
    if (!diff) return null;
    return generateDiffSummary(diff);
  }, [diff]);

  if (!before || !after) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        <p className="text-sm">Select two executions to compare</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Execution Comparison</h3>
          <p className="text-xs text-slate-400 mt-1">
            {new Date(before.timestamp).toLocaleTimeString()} vs{' '}
            {new Date(after.timestamp).toLocaleTimeString()}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition text-lg leading-none"
            title="Close comparison"
          >
            ×
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Summary Section */}
        <div className="bg-slate-800/50 rounded border border-slate-700 p-4">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">Change Summary</p>
          <p className="text-sm font-mono text-slate-200">{summary}</p>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* Before section */}
          <div className="bg-slate-800/50 rounded border border-slate-700 p-3">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Before</p>
            <div className="space-y-2">
              <ExecutionInfo entry={before} />
            </div>
          </div>

          {/* After section */}
          <div className="bg-slate-800/50 rounded border border-slate-700 p-3">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">After</p>
            <div className="space-y-2">
              <ExecutionInfo entry={after} />
            </div>
          </div>
        </div>

        {/* Detailed Changes */}
        {diff && (
          <div className="space-y-4">
            {/* Added fields */}
            {diff.added.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">Added Fields</p>
                <div className="space-y-1">
                  {diff.added.map((field) => (
                    <div key={field} className="bg-emerald-900/20 border border-emerald-700/50 rounded px-3 py-1.5 text-xs">
                      <span className="text-emerald-300">+ {field}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Removed fields */}
            {diff.removed.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">Removed Fields</p>
                <div className="space-y-1">
                  {diff.removed.map((field) => (
                    <div key={field} className="bg-red-900/20 border border-red-700/50 rounded px-3 py-1.5 text-xs">
                      <span className="text-red-300">- {field}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Changed fields */}
            {diff.changed.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Changed Fields</p>
                <div className="space-y-2">
                  {diff.changed.map((change) => (
                    <div key={change.path} className="bg-amber-900/20 border border-amber-700/50 rounded px-3 py-2 text-xs">
                      <p className="text-amber-300 font-mono mb-1">{change.path}</p>
                      <div className="flex gap-2 text-slate-300">
                        <span className="line-through text-red-300">{JSON.stringify(change.before)}</span>
                        <span className="text-emerald-300">{JSON.stringify(change.after)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No changes */}
            {diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0 && (
              <div className="bg-slate-800/50 rounded border border-slate-700 p-4">
                <p className="text-xs text-slate-400 text-center">No differences found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ExecutionInfoProps {
  entry: ExecutionHistoryEntry;
}

function ExecutionInfo({ entry }: ExecutionInfoProps) {
  return (
    <>
      <div>
        <p className="text-xs text-slate-500">Input</p>
        <p className="text-xs text-slate-200 truncate font-mono">{entry.input}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500">Status</p>
        <p
          className={`text-xs font-semibold ${
            entry.success ? 'text-emerald-300' : entry.violations.length > 0 ? 'text-amber-300' : 'text-red-300'
          }`}
        >
          {entry.success ? '✓ Pass' : entry.violations.length > 0 ? '⚠ Blocked' : '✗ Error'}
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-500">Plan Hash</p>
        <p className="text-xs text-slate-200 font-mono">{entry.planHash.slice(0, 12)}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500">Time</p>
        <p className="text-xs text-slate-200">{new Date(entry.timestamp).toLocaleTimeString()}</p>
      </div>
      {entry.result?.executedCommands && entry.result.executedCommands.length > 0 && (
        <div>
          <p className="text-xs text-slate-500">Commands</p>
          <p className="text-xs text-slate-200">{entry.result.executedCommands.length} executed</p>
        </div>
      )}
      {entry.result?.fileChanges && entry.result.fileChanges.length > 0 && (
        <div>
          <p className="text-xs text-slate-500">Files Changed</p>
          <p className="text-xs text-slate-200">{entry.result.fileChanges.length} files</p>
        </div>
      )}
    </>
  );
}
