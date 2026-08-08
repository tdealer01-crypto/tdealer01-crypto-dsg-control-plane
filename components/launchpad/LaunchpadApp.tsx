'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { createLaunchpadClient } from '@/lib/dsg/launchpad/client';
import type { LaunchpadLaunch } from '@/lib/dsg/launchpad/types';
import { createDefaultLaunchpadSections } from './defaults';
import { LaunchSidebar } from './LaunchSidebar';
import { LaunchDetail } from './LaunchDetail';

export function LaunchpadApp({ workspaceId }: { workspaceId: string }) {
  const [launches, setLaunches] = useState<LaunchpadLaunch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const client = useMemo(() => {
    if (!accessToken) return null;
    return createLaunchpadClient({ accessToken, workspaceId });
  }, [accessToken, workspaceId]);

  useEffect(() => {
    const supabase = createSupabaseClient();
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAccessToken(data.session?.access_token ?? null);
      if (!data.session?.access_token) {
        setError('AUTH_SESSION_REQUIRED');
        setLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setAccessToken(session?.access_token ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      Object.values(saveTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void client.list()
      .then((items) => {
        if (cancelled) return;
        setLaunches(items);
        setSelectedId((current) => current && items.some((item) => item.id === current) ? current : items[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'LAUNCHPAD_LOAD_FAILED');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [client]);

  const scheduleSave = useCallback((launch: LaunchpadLaunch) => {
    if (!client) return;
    const existing = saveTimers.current[launch.id];
    if (existing) clearTimeout(existing);
    saveTimers.current[launch.id] = setTimeout(() => {
      void client.update(launch.id, { sections: launch.sections })
        .then((stored) => {
          setLaunches((current) => current.map((item) => item.id === stored.id ? stored : item));
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'LAUNCHPAD_SAVE_FAILED'));
    }, 500);
  }, [client]);

  const handleCreate = useCallback(async () => {
    if (!client || !newName.trim()) return;
    try {
      setError(null);
      const launch = await client.create({ name: newName.trim(), sections: createDefaultLaunchpadSections() });
      setLaunches((current) => [launch, ...current]);
      setSelectedId(launch.id);
      setNewName('');
      setShowNewDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'LAUNCHPAD_CREATE_FAILED');
    }
  }, [client, newName]);

  const handleDelete = useCallback(async (id: string) => {
    if (!client) return;
    try {
      await client.remove(id);
      setLaunches((current) => {
        const next = current.filter((item) => item.id !== id);
        setSelectedId((selected) => selected === id ? next[0]?.id ?? null : selected);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'LAUNCHPAD_DELETE_FAILED');
    }
  }, [client]);

  const mutateSelected = useCallback((mutator: (launch: LaunchpadLaunch) => LaunchpadLaunch) => {
    setLaunches((current) => {
      let changed: LaunchpadLaunch | null = null;
      const next = current.map((launch) => {
        if (launch.id !== selectedId) return launch;
        changed = mutator(launch);
        return changed;
      });
      if (changed) scheduleSave(changed);
      return next;
    });
  }, [scheduleSave, selectedId]);

  const handleToggle = useCallback((sectionId: string, itemId: string) => {
    mutateSelected((launch) => ({
      ...launch,
      sections: launch.sections.map((section) => section.id !== sectionId ? section : {
        ...section,
        items: section.items.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item),
      }),
    }));
  }, [mutateSelected]);

  const handleNotes = useCallback((sectionId: string, itemId: string, notes: string) => {
    mutateSelected((launch) => ({
      ...launch,
      sections: launch.sections.map((section) => section.id !== sectionId ? section : {
        ...section,
        items: section.items.map((item) => item.id === itemId ? { ...item, notes } : item),
      }),
    }));
  }, [mutateSelected]);

  const selected = launches.find((launch) => launch.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex min-h-[72vh] flex-col md:flex-row">
          <LaunchSidebar launches={launches} selectedId={selectedId} onSelect={setSelectedId} onNew={() => setShowNewDialog(true)} onDelete={handleDelete} />
          <main className="min-w-0 flex-1 bg-slate-950">
            {error && <div className="m-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
            {loading ? (
              <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-400">Loading launches from DSG backend…</div>
            ) : selected ? (
              <LaunchDetail launch={selected} onToggleItem={handleToggle} onNotesChange={handleNotes} />
            ) : (
              <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="text-4xl">🚀</div>
                <div>
                  <h2 className="font-semibold text-white">No launch selected</h2>
                  <p className="mt-1 text-sm text-slate-500">Create a launch checklist to get started.</p>
                </div>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500" onClick={() => setShowNewDialog(true)}>Create launch</button>
              </div>
            )}
          </main>
        </div>
      </div>

      {showNewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">New Launch Checklist</h3>
            <p className="mt-1 text-sm text-slate-500">Creates a workspace-scoped launch in the real DSG backend.</p>
            <input autoFocus className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" placeholder="e.g. Auth Service v2.0" maxLength={200} value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleCreate(); }} />
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700" onClick={() => { setShowNewDialog(false); setNewName(''); }}>Cancel</button>
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50" disabled={!newName.trim() || !client} onClick={() => void handleCreate()}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
