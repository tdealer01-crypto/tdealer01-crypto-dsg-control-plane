'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

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
  const [loading, setLoading] = useState(true);
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
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Ledger"
          description="Control-plane evidence plus DSG core ledger chain."
        />

        {error && (
          <Card variant="error" className="mt-6">
            <p className="text-sm font-medium">Error loading ledger</p>
            <p className="mt-1 text-xs opacity-90">{error}</p>
          </Card>
        )}

        {!loading && items.length === 0 && coreItems.length === 0 && !error && (
          <EmptyState
            title="No ledger entries"
            description="No control-plane or DSG core entries found"
          />
        )}

        {loading && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-lg border border-slate-700 bg-slate-900 animate-pulse" />
              ))}
            </div>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-lg border border-slate-700 bg-slate-900 animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {!loading && (items.length > 0 || coreItems.length > 0) && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-lg font-semibold text-slate-100">Control-plane</h2>
              <div className="mt-4 space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <p className="font-semibold text-slate-100">{item.decision || '-'}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.execution_id || item.id}</p>
                    <p className="mt-2 text-xs text-slate-300">{item.reason || '-'}</p>
                    <p className="mt-2 text-xs text-slate-500">{formatDate(item.created_at)}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-slate-100">DSG Core</h2>
              <div className="mt-4 space-y-2">
                {coreItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <p className="font-semibold text-slate-100">{item.decision || item.gate_result || '-'}</p>
                    <p className="mt-1 text-xs text-slate-400">sequence {item.sequence}</p>
                    <p className="mt-2 text-xs text-slate-500">{formatDate(item.created_at)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
