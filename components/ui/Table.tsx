'use client';

import React, { useState } from 'react';

interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface TableProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  sortable?: boolean;
  selectable?: boolean;
  emptyMessage?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  onRowClick,
  sortable = true,
  selectable = false,
  emptyMessage = 'No data',
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const handleSort = (key: string) => {
    if (!sortable) return;
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...rows].sort((a, b) => {
    if (!sortKey) return 0;
    const av = a[sortKey]; const bv = b[sortKey];
    if (typeof av === 'string' && typeof bv === 'string')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
  });

  const toggleRow = (i: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
  const toggleAll = () =>
    setSelected(selected.size === sorted.length ? new Set() : new Set(sorted.map((_, i) => i)));

  const thBase = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#AAB3C5] border-b border-[rgba(247,220,120,0.10)]';
  const tdBase = 'px-4 py-3 text-sm text-[#F8FAFC]';

  return (
    <div className="overflow-x-auto rounded-xl border border-[rgba(247,220,120,0.16)]">
      <table className="w-full border-collapse">
        <thead className="bg-[rgba(255,255,255,0.03)]">
          <tr>
            {selectable && (
              <th className={`${thBase} w-10`}>
                <input
                  type="checkbox"
                  checked={selected.size === sorted.length && sorted.length > 0}
                  onChange={toggleAll}
                  className="cursor-pointer"
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`${thBase} ${sortable ? 'cursor-pointer hover:text-[#F7DC78] transition-colors' : ''}`}
                style={{ textAlign: col.align || 'left' }}
              >
                {col.label}
                {sortable && sortKey === col.key && (
                  <span className="ml-1 text-[#D4AF37]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-[rgba(247,220,120,0.06)] transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              } ${selected.has(i) ? 'bg-[rgba(212,175,55,0.08)]' : 'hover:bg-[rgba(255,255,255,0.025)]'}`}
            >
              {selectable && (
                <td className={tdBase}>
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={e => { e.stopPropagation(); toggleRow(i); }}
                    className="cursor-pointer"
                  />
                </td>
              )}
              {columns.map(col => (
                <td key={col.key} className={tdBase} style={{ textAlign: col.align || 'left' }}>
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="py-10 text-center text-sm text-[#AAB3C5]">{emptyMessage}</div>
      )}
    </div>
  );
}
