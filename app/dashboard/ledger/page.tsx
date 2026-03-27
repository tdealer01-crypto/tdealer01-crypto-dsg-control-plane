'use client';

import { useEffect, useState } from 'react';

type Item = {
  id: string;
  execution_id?: string | null;
  decision?: string | null;
  reason?: string | null;
  proof_hash?: string | null;
  created_at?: string | null;
};

type CoreItem = {
  id: string;
  sequence: number;
  decision?: string | null;
  gate_result?: string | null;
  proof_hash?: string | null;
  ledger_hash?: string | null;
  created_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function LedgerPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [coreItems, setCoreItems] = useState<CoreItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/api/ledger?limit=20', { cache: 'no-store' })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!alive) return;
        if (!ok) throw new Error(json.error || 'Failed to load ledger');
        setItems(json.items || []);
        setCoreItems(json.core?.items || []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load ledger');
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-semibold">Ledger</h1>
        <p className="mt-2 text-slate-400">Control-plane evidence plus DSG core ledger chain.</p>
        {error ? <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Control-plane</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-800 p-4">
                  <p className="font-semibold">{item.decision || '-'}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.execution_id || item.id}</p>
                  <p className="mt-2 text-sm text-slate-300">{item.reason || '-'}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDate(item.created_at)}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">DSG Core</h2>
            <div className="mt-4 space-y-3">
              {coreItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-800 p-4">
                  <p className="font-semibold">{item.decision || item.gate_result || '-'}</p>
                  <p className="mt-1 text-sm text-slate-400">sequence {item.sequence}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDate(item.created_at)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
