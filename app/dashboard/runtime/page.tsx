'use client';

import { useEffect, useMemo, useState } from 'react';
import MissionCards from '../../../components/runtime/mission-cards';
import StreamConsole from '../../../components/runtime/stream-console';
import type { RuntimeSummaryCard, StreamConsoleMessage } from '../../../lib/runtime/dashboard-contract';

function asRuntimeMessages(summary: RuntimeSummaryCard): StreamConsoleMessage[] {
  const fromApprovals: StreamConsoleMessage[] = summary.approvals.recent.map((item) => ({
    id: `approval-${item.id}`,
    kind: 'approval',
    request_id: item.request_id,
    title: `${item.action} • ${item.status}`,
    body: `expires ${new Date(item.expires_at).toLocaleString()}`,
    created_at: item.approved_at,
  }));

  const fromEffects: StreamConsoleMessage[] = summary.effects.recent.map((item) => ({
    id: `effect-${item.effect_id}`,
    kind: 'effect',
    request_id: item.request_id,
    title: `${item.action} • ${item.status}`,
    created_at: item.updated_at,
  }));

  const fromLedger: StreamConsoleMessage[] = summary.ledger.recent.map((item) => ({
    id: `ledger-${item.sequence}`,
    kind: 'decision',
    request_id: undefined,
    sequence: item.sequence,
    title: `${item.action} • ${item.decision}`,
    body: item.reason,
    created_at: item.created_at,
  }));

  const fromMemory: StreamConsoleMessage[] = summary.memory.recent.map((item) => ({
    id: `memory-${item.id}`,
    kind: 'memory_write',
    request_id: item.request_id,
    title: item.memory_key,
    body: item.lineage_hash,
    created_at: item.created_at,
  }));

  return [...fromApprovals, ...fromEffects, ...fromLedger, ...fromMemory]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 60);
}

export default function RuntimePage() {
  const [summary, setSummary] = useState<RuntimeSummaryCard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const response = await fetch('/api/runtime-summary', { cache: 'no-store' });
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error || 'Failed to load runtime summary');
        }
        if (alive) setSummary(json as RuntimeSummaryCard);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load runtime summary');
      }
    }

    load();
    const timer = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const stream = useMemo(() => (summary ? asRuntimeMessages(summary) : []), [summary]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">DSG Runtime</p>
          <h1 className="mt-2 text-3xl font-semibold">Mission Console</h1>
          <p className="mt-2 text-slate-400">Truth state, approvals, effects, memory, ledger, and agents in one live view.</p>
        </header>

        {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">{error}</div> : null}

        {summary ? (
          <>
            <MissionCards summary={summary} />

            <section className="grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <StreamConsole messages={stream} />
              </div>

              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <h2 className="text-lg font-semibold">Truth State</h2>
                  <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950/70 p-3 text-xs text-slate-300">
                    {JSON.stringify(summary.truth_state, null, 2)}
                  </pre>
                </section>

                <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <h2 className="text-lg font-semibold">Agent Status</h2>
                  <div className="mt-3 space-y-2 text-sm">
                    {summary.agents.map((agent) => (
                      <div key={agent.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-slate-400">{agent.status}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-400">Loading runtime console...</div>
        )}
      </div>
    </main>
  );
}
