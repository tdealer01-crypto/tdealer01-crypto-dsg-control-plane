'use client';

import { useEffect, useState } from 'react';

type ProofItem = {
  id: string;
  execution_id: string;
  decision: string;
  reason: string;
  proof_hash: string | null;
  proof_type: string;
  stability_score: number | null;
  created_at: string;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ProofsPage() {
  const [items, setItems] = useState<ProofItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/api/proofs?limit=20', { cache: 'no-store' })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!alive) return;
        if (!ok) throw new Error(json.error || 'Failed to load proofs');
        setItems(json.items || []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load proofs');
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold">Proofs</h1>
        <p className="mt-2 text-slate-400">Recent DSG decisions with proof hashes and stability signals.</p>
        {error ? <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
        <div className="mt-8 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{item.decision}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.execution_id}</p>
                </div>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">{item.proof_type}</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-300">
                <p>Reason: {item.reason}</p>
                <p>Proof hash: {item.proof_hash || '-'}</p>
                <p>Stability: {item.stability_score ?? '-'}</p>
                <p>Created: {formatDate(item.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
