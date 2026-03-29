'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type StreamStatus = 'connecting' | 'live' | 'error';

type StreamState = {
  streamStatus: StreamStatus;
  connectedAt: string | null;
  lastHeartbeat: string | null;
  readinessStatus: 'ready' | 'degraded' | 'down' | null;
  latestExecutions: Array<{
    id: string;
    decision: 'ALLOW' | 'STABILIZE' | 'BLOCK' | string;
    latency_ms: number | null;
    created_at: string;
  }>;
  activeAlerts: Array<{
    level: 'warning' | 'error' | string;
    code: string;
    message: string;
  }>;
};

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/mission', label: 'Mission' },
  { href: '/dashboard/operations', label: 'Operations' },
  { href: '/dashboard/executions', label: 'Executions' },
  { href: '/dashboard/proofs', label: 'Proofs' },
  { href: '/dashboard/ledger', label: 'Ledger' },
  { href: '/dashboard/capacity', label: 'Capacity' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/audit', label: 'Audit' },
];

const initialState: StreamState = {
  streamStatus: 'connecting',
  connectedAt: null,
  lastHeartbeat: null,
  readinessStatus: null,
  latestExecutions: [],
  activeAlerts: [],
};

export default function AppShellPage() {
  const [stream, setStream] = useState<StreamState>(initialState);

  useEffect(() => {
    const source = new EventSource('/api/core/stream');

    const onConnected = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as { connected_at?: string };
      setStream((prev) => ({
        ...prev,
        streamStatus: 'live',
        connectedAt: payload.connected_at || new Date().toISOString(),
      }));
    };

    const onReadiness = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as { status?: 'ready' | 'degraded' | 'down' };
      setStream((prev) => ({
        ...prev,
        readinessStatus: payload.status || null,
      }));
    };

    const onExecutions = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as StreamState['latestExecutions'];
      setStream((prev) => ({
        ...prev,
        latestExecutions: Array.isArray(payload) ? payload : prev.latestExecutions,
      }));
    };

    const onHeartbeat = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as { ts?: string };
      setStream((prev) => ({
        ...prev,
        lastHeartbeat: payload.ts || new Date().toISOString(),
      }));
    };

    const onAlert = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as StreamState['activeAlerts'][number];
      setStream((prev) => ({
        ...prev,
        activeAlerts: [payload, ...prev.activeAlerts].slice(0, 5),
      }));
    };

    source.addEventListener('connected', onConnected);
    source.addEventListener('readiness_update', onReadiness);
    source.addEventListener('execution_update', onExecutions);
    source.addEventListener('heartbeat', onHeartbeat);
    source.addEventListener('alert', onAlert);
    source.onerror = () => {
      setStream((prev) => ({ ...prev, streamStatus: 'error' }));
    };

    return () => {
      source.close();
    };
  }, []);

  const streamBadge = useMemo(() => {
    if (stream.streamStatus === 'live') return 'LIVE';
    if (stream.streamStatus === 'error') return 'ERROR';
    return 'CONNECTING';
  }, [stream.streamStatus]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">DSG ONE App Shell</h1>
            <p className="mt-2 text-slate-400">Unified entry page with live monitor stream from /api/core/stream.</p>
          </div>
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 text-sm font-semibold text-emerald-300">
            {streamBadge}
          </span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 font-semibold text-slate-100 hover:border-emerald-400">
              {link.label}
            </Link>
          ))}
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Readiness</p>
            <p className="mt-2 text-2xl font-semibold">{stream.readinessStatus ?? '-'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Connected At</p>
            <p className="mt-2 text-sm text-slate-200">{stream.connectedAt ?? '-'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Last Heartbeat</p>
            <p className="mt-2 text-sm text-slate-200">{stream.lastHeartbeat ?? '-'}</p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Latest Executions</h2>
            {stream.latestExecutions.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Waiting for execution_update events…</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                {stream.latestExecutions.map((execution) => (
                  <li key={execution.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2">
                    <span className="font-mono text-xs text-slate-400">{execution.id}</span>
                    <span>{execution.decision}</span>
                    <span>{execution.latency_ms ?? 0} ms</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Active Alerts</h2>
            {stream.activeAlerts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No alerts from stream.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                {stream.activeAlerts.map((alert, index) => (
                  <li key={`${alert.code}-${index}`} className="rounded-lg border border-slate-800 px-3 py-2">
                    <span className={alert.level === 'error' ? 'text-red-300' : 'text-amber-300'}>
                      [{String(alert.level).toUpperCase()}]
                    </span>{' '}
                    {alert.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
