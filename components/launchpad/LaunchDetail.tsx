'use client';

import { useState } from 'react';
import type { LaunchpadLaunch } from '@/lib/dsg/launchpad/types';
import { ProgressBar } from './ProgressBar';
import { SectionPanel } from './SectionPanel';

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'launch';
}

export function LaunchDetail({ launch, onToggleItem, onNotesChange }: { launch: LaunchpadLaunch; onToggleItem: (sectionId: string, itemId: string) => void; onNotesChange: (sectionId: string, itemId: string, notes: string) => void }) {
  const totalItems = launch.sections.reduce((sum, section) => sum + section.items.length, 0);
  const checkedItems = launch.sections.reduce((sum, section) => sum + section.items.filter((item) => item.checked).length, 0);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const exportCsv = () => {
    const rows = [['Section', 'Item', 'Status', 'Notes']];
    for (const section of launch.sections) {
      for (const item of section.items) rows.push([section.title, item.label, item.checked ? 'Done' : 'Pending', item.notes]);
    }
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadBlob(`${safeFilename(launch.name)}_checklist.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    setShowExportMenu(false);
  };

  const exportJson = () => {
    const data = {
      name: launch.name,
      createdAt: launch.createdAt,
      completionPercent: totalItems ? Math.round((checkedItems / totalItems) * 100) : 0,
      sections: launch.sections.map((section) => ({
        title: section.title,
        items: section.items.map((item) => ({ label: item.label, status: item.checked ? 'Done' : 'Pending', notes: item.notes })),
      })),
    };
    downloadBlob(`${safeFilename(launch.name)}_checklist.json`, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    setShowExportMenu(false);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Project launch checklist</p>
          <h1 className="mt-1 text-2xl font-bold text-white">{launch.name}</h1>
          <p className="mt-1 text-xs text-slate-500">Created {new Date(launch.createdAt).toLocaleString()}</p>
        </div>
        <div className="relative">
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500" onClick={() => setShowExportMenu((value) => !value)}>⬇️ Export</button>
          {showExportMenu && (
            <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
              <button className="block w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-800" onClick={exportCsv}>📄 Export as CSV</button>
              <button className="block w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-800" onClick={exportJson}>📋 Export as JSON</button>
            </div>
          )}
        </div>
      </div>
      <ProgressBar totalItems={totalItems} checkedItems={checkedItems} />
      {launch.sections.map((section) => (
        <SectionPanel key={section.id} section={section} onToggleItem={(itemId) => onToggleItem(section.id, itemId)} onNotesChange={(itemId, notes) => onNotesChange(section.id, itemId, notes)} />
      ))}
    </div>
  );
}
