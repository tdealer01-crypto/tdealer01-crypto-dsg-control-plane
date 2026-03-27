'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Execution = {
  id: string;
  agent_id: string;
  decision: 'ALLOW' | 'STABILIZE' | 'BLOCK';
  latency_ms: number;
  policy_version: string | null;
  reason: string | null;
  created_at: string;
};

type ProofItem = {
  id: string;
  execution_id: string;
  decision: string;
  proof_type: string;
  reason: string;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function OperationsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [proofs, setProofs] = useState<ProofItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch('/api/executions?limit=10', { cache: 'no-store' }).then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
      fetch('/api/proofs?limit=10', { cache: 'no-store' }).then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
    ])
      .then(([execRes, proofRes]) => {
        if (!alive) return;
        if (!execRes.ok) throw new Error(execRes.json.error || 'Failed to load executions');
        if (!proofRes.ok) throw new Error(proofRes.json.error || 'Failed to load proofs');
        setExecutions(execRes.json.executions || []);
        setProofs(proofRes.json.items || []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load operations');
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Operations</h1>
            <p className="mt-2 text-slate-400">Execution flow, proofs, and replay access in one place.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/executions" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">Executions</Link>
            <Link href="/dashboard/proofs" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">Proofs</Link>
            <Link href="/dashboard/ledger" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">Ledger</Link>
          </div>
        </div>
        {error ? <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Latest Executions</h2>
            <div className="mt-4 space-y-3">
              {executions.map((execution) => (
                <div key={execution.id} className="rounded-xl border border-slate-800 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{execution.decision}</p>
                      <p className="mt-1 text-sm text-slate-400">{execution.id}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">{execution.latency_ms} ms</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300">
                    <p>Agent: {execution.agent_id}</p>
                    <p>Reason: {execution.reason || '-'}</p>
                    <p>Created: {formatDate(execution.created_at)}</p>
                    <p><Link href={`/dashboard/replay/${execution.id}`} className="text-emerald-400 hover:text-emerald-300">Open replay</Link></p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Latest Proofs</h2>
            <div className="mt-4 space-y-3">
              {proofs.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-800 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{item.decision}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.execution_id}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">{item.proof_type}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{item.reason}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
