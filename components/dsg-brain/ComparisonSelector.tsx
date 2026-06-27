'use client';

import { useEffect, useRef, useState } from 'react';
import type { ExecutionHistoryEntry } from '@/lib/dsg/brain/ui/types';

interface ComparisonSelectorProps {
  currentEntry: ExecutionHistoryEntry;
  availableEntries: ExecutionHistoryEntry[];
  onSelect: (entry: ExecutionHistoryEntry) => void;
  onCancel: () => void;
}

export default function ComparisonSelector({
  currentEntry,
  availableEntries,
  onSelect,
  onCancel,
}: ComparisonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectableEntries = availableEntries.filter((e) => e.id !== currentEntry.id);

  const handleSelect = (entry: ExecutionHistoryEntry) => {
    onSelect(entry);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded border border-amber-500 transition"
      >
        <span>Compare</span>
        <span className="text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded shadow-lg z-50">
          {/* Header */}
          <div className="border-b border-slate-700 px-3 py-2">
            <p className="text-xs font-semibold text-slate-300">Compare with:</p>
          </div>

          {/* List of entries */}
          <div className="max-h-64 overflow-y-auto">
            {selectableEntries.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                No other executions available
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {selectableEntries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => handleSelect(entry)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-700 transition text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-slate-100 truncate font-medium text-xs">{entry.input}</p>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ml-2 ${
                          entry.success
                            ? 'bg-emerald-900 text-emerald-100'
                            : entry.violations.length > 0
                              ? 'bg-amber-900 text-amber-100'
                              : 'bg-red-900 text-red-100'
                        }`}
                      >
                        {entry.success ? '✓' : entry.violations.length > 0 ? '⚠' : '✗'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 px-3 py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onCancel();
              }}
              className="w-full text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
