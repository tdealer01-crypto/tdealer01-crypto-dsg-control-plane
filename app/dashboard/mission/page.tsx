'use client';

import { useEffect, useState } from 'react';
import EntropyField from '../../../components/canvas/EntropyField';

type MonitorPayload = {
  ok: boolean;
  readiness?: {
    status: 'ready' | 'degraded' | 'down';
    score: number;
    reasons: string[];
  };
  control_plane?: {
    requests_today: number;
    allow_rate: number;
    block_rate: number;
    stabilize_rate: number;
    avg_latency_ms: number;
    active_agents: number;
  };
  billing?: {
    executions_this_month: number;
  };
  core?: {
    health?: {
      ok?: boolean;
    };
  };
  alerts?: Array<{
    level: 'warning' | 'error';
    code: string;
    message: string;
  }>;
};

export default function MissionPage() {
  const [monitor, setMonitor] = useState<MonitorPayload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    fetch('/api/core/monitor', { cache: 'no-store' })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error || 'Failed to load monitor');
        }
        if (!alive) return;
        setMonitor(json);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load mission');
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold">Mission</h1>
        <p className="mt-2 text-slate-400">Live summary for core readiness and control-plane activity.</p>
        {error ? <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-sm text-slate-400">Readiness</p><p className="mt-3 text-3xl font-semibold">{monitor?.readiness?.status ?? '-'}</p></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-sm text-slate-400">Score</p><p className="mt-3 text-3xl font-semibold">{monitor?.readiness?.score ?? 0}</p></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-sm text-slate-400">Requests Today</p><p className="mt-3 text-3xl font-semibold">{monitor?.control_plane?.requests_today ?? 0}</p></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-sm text-slate-400">Monthly Executions</p><p className="mt-3 text-3xl font-semibold">{monitor?.billing?.executions_this_month ?? 0}</p></div>
        </div>

        <section className="mt-8">
          <EntropyField
            status={monitor?.readiness?.status ?? 'down'}
            entropy={Math.min(Math.max((100 - (monitor?.readiness?.score ?? 0)) / 100, 0), 1)}
            latencyMs={monitor?.control_plane?.avg_latency_ms ?? 0}
            activeAgents={monitor?.control_plane?.active_agents ?? 0}
            allowRate={monitor?.control_plane?.allow_rate ?? 0}
            blockRate={monitor?.control_plane?.block_rate ?? 0}
            stabilizeRate={monitor?.control_plane?.stabilize_rate ?? 0}
            className="w-full"
          />
        </section>

        {!!monitor?.alerts?.length ? (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Alerts</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {monitor.alerts.map((alert) => (
                <li key={alert.code}>
                  <span className={alert.level === 'error' ? 'text-red-300' : 'text-amber-300'}>
                    [{alert.level.toUpperCase()}]
                  </span>{' '}
                  {alert.message}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
