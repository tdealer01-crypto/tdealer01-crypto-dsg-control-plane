'use client';

import { useEffect, useState } from 'react';

type ReplayData = {
  execution?: {
    id: string;
    agent_id: string;
    decision: string;
    latency_ms: number;
    policy_version: string | null;
    reason: string | null;
    created_at: string;
  } | null;
  audit?: {
    id: string;
    decision: string;
    reason: string;
    evidence: Record<string, any>;
    created_at: string;
  } | null;
  core?: {
    ledger_ok: boolean;
    matched_item: any;
    error: string | null;
  };
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ReplayPage({ params }: { params: { executionId: string } }) {
  const [data, setData] = useState<ReplayData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`/api/replay/${params.executionId}`, { cache: 'no-store' })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!alive) return;
        if (!ok) throw new Error(json.error || 'Failed to load replay');
        setData(json);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load replay');
      });
    return () => {
      alive = false;
    };
  }, [params.executionId]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold">Replay</h1>
        <p className="mt-2 text-slate-400">Execution, audit evidence, and matched DSG core state.</p>
        {error ? <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
        {data?.execution ? (
          <div className="mt-8 space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">Execution</h2>
              <div className="mt-4 grid gap-2 text-sm text-slate-300">
                <p>ID: {data.execution.id}</p>
                <p>Agent: {data.execution.agent_id}</p>
                <p>Decision: {data.execution.decision}</p>
                <p>Reason: {data.execution.reason || '-'}</p>
                <p>Policy: {data.execution.policy_version || '-'}</p>
                <p>Latency: {data.execution.latency_ms} ms</p>
                <p>Created: {formatDate(data.execution.created_at)}</p>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">Audit</h2>
              <div className="mt-4 grid gap-2 text-sm text-slate-300">
                <p>ID: {data.audit?.id || '-'}</p>
                <p>Decision: {data.audit?.decision || '-'}</p>
                <p>Reason: {data.audit?.reason || '-'}</p>
                <p>Created: {formatDate(data.audit?.created_at)}</p>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">Core match</h2>
              <div className="mt-4 grid gap-2 text-sm text-slate-300">
                <p>Ledger ok: {String(data.core?.ledger_ok ?? false)}</p>
                <p>Core error: {data.core?.error || '-'}</p>
                <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">{JSON.stringify(data.core?.matched_item || null, null, 2)}</pre>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
