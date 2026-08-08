'use client';

import { useState } from 'react';
import type { LaunchpadSection } from '@/lib/dsg/launchpad/types';
import { ChecklistRow } from './ChecklistRow';

export function SectionPanel({ section, onToggleItem, onNotesChange }: { section: LaunchpadSection; onToggleItem: (itemId: string) => void; onNotesChange: (itemId: string, notes: string) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const done = section.items.filter((item) => item.checked).length;

  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
      <button className="flex w-full items-center gap-3 bg-slate-900 px-4 py-3 text-left hover:bg-slate-800/80" onClick={() => setCollapsed((value) => !value)}>
        <span className="text-xl">{section.icon}</span>
        <span className="flex-1 font-semibold text-white">{section.title}</span>
        <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-300">{done}/{section.items.length}</span>
        <span className="text-slate-500">{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <div className="px-4 py-1">
          {section.items.map((item) => (
            <ChecklistRow key={item.id} item={item} onToggle={() => onToggleItem(item.id)} onNotesChange={(notes) => onNotesChange(item.id, notes)} />
          ))}
        </div>
      )}
    </section>
  );
}
