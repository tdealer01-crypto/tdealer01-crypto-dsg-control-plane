'use client';

import { useEffect, useState } from 'react';
import type { LaunchpadChecklistItem } from '@/lib/dsg/launchpad/types';

export function ChecklistRow({ item, onToggle, onNotesChange }: { item: LaunchpadChecklistItem; onToggle: () => void; onNotesChange: (notes: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.notes);

  useEffect(() => {
    if (!editing) setDraft(item.notes);
  }, [item.notes, editing]);

  return (
    <div className="border-b border-slate-800 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <input className="h-4 w-4 accent-blue-500" type="checkbox" checked={item.checked} onChange={onToggle} />
        <span className={`flex-1 text-sm ${item.checked ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.label}</span>
        <button className="rounded px-2 py-1 text-sm hover:bg-slate-800" onClick={() => setEditing((value) => !value)} title="Add/edit notes">{item.notes ? '📝' : '➕'}</button>
      </div>
      {item.notes && !editing && <p className="ml-7 mt-2 rounded bg-slate-950/70 px-3 py-2 text-xs italic text-slate-400">{item.notes}</p>}
      {editing && (
        <div className="ml-7 mt-2 space-y-2">
          <textarea className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-slate-200 outline-none focus:border-blue-500" rows={2} value={draft} maxLength={4000} onChange={(event) => setDraft(event.target.value)} placeholder="Add a note..." />
          <div className="flex gap-2">
            <button className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500" onClick={() => { onNotesChange(draft); setEditing(false); }}>Save</button>
            <button className="rounded bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700" onClick={() => { setDraft(item.notes); setEditing(false); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
