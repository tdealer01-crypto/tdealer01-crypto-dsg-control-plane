'use client';

import type { LaunchpadLaunch } from '@/lib/dsg/launchpad/types';

export function LaunchSidebar({ launches, selectedId, onSelect, onNew, onDelete }: { launches: LaunchpadLaunch[]; selectedId: string | null; onSelect: (id: string) => void; onNew: () => void; onDelete: (id: string) => void }) {
  return (
    <aside className="w-full border-b border-slate-800 bg-slate-950/80 md:w-72 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">LaunchPad</p>
          <h2 className="font-semibold text-white">🚀 Launches</h2>
        </div>
        <button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500" onClick={onNew}>+ New</button>
      </div>
      <div className="max-h-72 overflow-y-auto p-2 md:max-h-[calc(100vh-12rem)]">
        {launches.length === 0 && <p className="px-3 py-8 text-center text-sm text-slate-500">No launches yet</p>}
        {launches.map((launch) => {
          const total = launch.sections.reduce((sum, section) => sum + section.items.length, 0);
          const done = launch.sections.reduce((sum, section) => sum + section.items.filter((item) => item.checked).length, 0);
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const active = launch.id === selectedId;
          return (
            <button key={launch.id} className={`mb-2 w-full rounded-lg border p-3 text-left transition ${active ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'}`} onClick={() => onSelect(launch.id)}>
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">{launch.name}</span>
                <span role="button" tabIndex={0} className="rounded px-1 text-xs text-slate-500 hover:bg-slate-800 hover:text-rose-300" title="Delete launch" onClick={(event) => { event.stopPropagation(); onDelete(launch.id); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); onDelete(launch.id); } }}>✕</span>
              </div>
              <div className="mt-1 flex justify-between gap-3 text-[11px] text-slate-500">
                <span>{pct}% complete</span>
                <span>{new Date(launch.createdAt).toLocaleDateString()}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
