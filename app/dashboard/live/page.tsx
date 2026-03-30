'use client';

import { useEffect, useState } from 'react';
import { OperatorControls } from '../../../components/runtime/operator-controls';

type Agent = {
  id: string;
  name: string;
  status: string;
};

export default function LivePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    fetch('/api/agents', { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Failed to load agents');
        }
        if (!alive) return;
        setAgents((json.agents || []) as Agent[]);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load live summary');
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Live Room</p>
          <h1 className="mt-2 text-3xl font-semibold">Runtime Spine Console</h1>
          <p className="mt-3 text-sm text-slate-300">
            Unified intent flow for chat, cli, remote browser, voice, MCP, and operator channels.
          </p>

          {error ? (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
            <p className="font-medium text-slate-100">LiveRoom Notes</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>intent -&gt; approval -&gt; execute -&gt; effect -&gt; truth</li>
              <li>All runtime channels now use the same approval spine path.</li>
              <li>Operator console can manually issue channel-aware intents.</li>
            </ul>
          </div>
        </section>

        <OperatorControls agentId={agents[0]?.id || ''} />
      </div>
    </main>
  );
}
