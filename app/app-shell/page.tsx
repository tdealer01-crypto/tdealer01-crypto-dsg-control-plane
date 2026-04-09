'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import EntropyField from '../../components/canvas/EntropyField';

type MonitorPayload = {
  ok: boolean;
  generated_at?: string;
  readiness?: {
    ready?: boolean;
    status?: 'ready' | 'degraded' | 'down' | 'blocked' | 'unknown';
    score?: number;
    reasons?: string[];
  };
  core?: {
    health?: {
      ok?: boolean;
      error?: string | null;
      url?: string;
    };
    determinism?: {
      ok?: boolean;
      data?: {
        max_entropy?: number;
        deterministic?: boolean;
        gate_action?: string;
        sequence?: number;
        region_count?: number;
        unique_state_hashes?: number;
      } | null;
      error?: string | null;
    };
  };
  control_plane?: {
    requests_today?: number;
    allow_rate?: number;
    block_rate?: number;
    stabilize_rate?: number;
    avg_latency_ms?: number;
    active_agents?: number;
  };
  billing?: {
    subscription?: {
      plan_key?: string;
      billing_interval?: string;
      status?: string;
    } | null;
    executions_this_month?: number;
  };
  alerts?: Array<{
    level: 'info' | 'warning' | 'error' | 'critical';
    code: string;
    message: string;
  }>;
};

type ChatMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/command-center', label: 'Command Center' },
  { href: '/dashboard/integration', label: 'Integration' },
  { href: '/dashboard/mission', label: 'Mission' },
  { href: '/dashboard/operations', label: 'Operations' },
  { href: '/dashboard/executions', label: 'Executions' },
  { href: '/dashboard/proofs', label: 'Proofs' },
  { href: '/dashboard/ledger', label: 'Ledger' },
  { href: '/dashboard/capacity', label: 'Capacity' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/audit', label: 'Audit' },
];

function badgeTone(status?: string) {
  switch (status) {
    case 'ready':
      return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
    case 'degraded':
      return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
    case 'blocked':
      return 'border-orange-400/30 bg-orange-400/10 text-orange-200';
    case 'down':
      return 'border-red-400/30 bg-red-400/10 text-red-200';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-300';
  }
}

function alertTone(level: string) {
  switch (level) {
    case 'critical':
    case 'error':
      return 'border-red-500/30 bg-red-500/10 text-red-200';
    case 'warning':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-300';
  }
}

function pct(v?: number) {
  return `${Math.round((v || 0) * 100)}%`;
}

export default function AppShellPage() {
  const [monitor, setMonitor] = useState<MonitorPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm0',
      role: 'system',
      content:
        'Authenticated command workspace ready. Use the monitor on the right to assess readiness, entropy, alerts, and current operator context before acting.',
    },
  ]);

  useEffect(() => {
    let alive = true;

    async function loadMonitor() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/core/monitor', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load monitor');
        if (!alive) return;
        setMonitor(json);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load monitor');
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadMonitor();
    const timer = setInterval(loadMonitor, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const readinessStatus = monitor?.readiness?.status || 'unknown';
  const entropy = monitor?.core?.determinism?.data?.max_entropy ?? null;
  const deterministic = monitor?.core?.determinism?.data?.deterministic ?? null;
  const control = monitor?.control_plane;
  const alerts = monitor?.alerts || [];

  const quickStats = useMemo(
    () => [
      { label: 'Requests Today', value: String(control?.requests_today ?? 0) },
      { label: 'Latency', value: `${control?.avg_latency_ms ?? 0} ms` },
      { label: 'Agents', value: String(control?.active_agents ?? 0) },
      { label: 'Allow Rate', value: pct(control?.allow_rate) },
      { label: 'Block Rate', value: pct(control?.block_rate) },
      { label: 'Stabilize Rate', value: pct(control?.stabilize_rate) },
    ],
    [control],
  );

  async function submitPrompt() {
    const value = draft.trim();
    if (!value || chatBusy) return;

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: value }]);
    setDraft('');
    setChatBusy(true);

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: value }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to run agent chat');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream body returned');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const raw of events) {
          if (!raw.startsWith('data: ')) continue;
          const event = JSON.parse(raw.slice(6));
          if (event.type === 'step_result' || event.type === 'step_error') {
            setMessages((prev) => [
              ...prev,
              {
                id: `a-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                role: 'assistant',
                content: JSON.stringify(event, null, 2),
              },
            ]);
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Agent chat failed',
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">DSG ONE</p>
            <h1 className="text-2xl font-semibold">Unified Command Workspace</h1>
            <p className="mt-1 text-sm text-slate-400">
              Split-pane operator workspace with authenticated monitor data and command execution in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-emerald-400"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 xl:grid-cols-[1.02fr_0.98fr]">
        <section className="flex min-h-[780px] flex-col rounded-[1.75rem] border border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">Agent Console</p>
              <p className="text-xs text-slate-400">
                Issue commands, ask for analysis, and review operator guidance from authenticated runtime paths.
              </p>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
              Operator Session
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === 'user'
                    ? 'ml-auto max-w-[88%] rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50'
                    : message.role === 'assistant'
                      ? 'max-w-[88%] rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100'
                      : 'max-w-[92%] rounded-2xl border border-indigo-400/20 bg-indigo-400/10 px-4 py-3 text-sm text-indigo-100'
                }
              >
                {message.content}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask for readiness, active alerts, audit status, policies, capacity, or execution context..."
                className="min-h-[112px] rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400"
              />
              <div className="flex flex-col gap-3">
                <button
                  onClick={submitPrompt}
                  disabled={chatBusy}
                  className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  {chatBusy ? 'Running…' : 'Run in Agent Chat'}
                </button>
                <button
                  onClick={() =>
                    setDraft(
                      'Analyze current readiness, active alerts, determinism health, and quota pressure. Recommend the next operator action.',
                    )
                  }
                  className="rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200"
                >
                  Use Readiness Prompt
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6 rounded-[1.75rem] border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">Live Monitor</p>
              <p className="text-xs text-slate-400">Authenticated core truth, readiness, entropy pattern, and active alerts.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeTone(readinessStatus)}`}
              >
                {loading ? 'loading' : readinessStatus}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                {monitor?.generated_at ? new Date(monitor.generated_at).toLocaleTimeString() : 'waiting'}
              </span>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <EntropyField
            width={720}
            height={340}
            cols={56}
            rows={26}
            status={readinessStatus}
            entropy={entropy ?? 0}
            latencyMs={control?.avg_latency_ms ?? 0}
            activeAgents={control?.active_agents ?? 0}
            allowRate={control?.allow_rate ?? 0}
            blockRate={control?.block_rate ?? 0}
            stabilizeRate={control?.stabilize_rate ?? 0}
            deterministic={deterministic ?? false}
            animated={true}
            className="w-full"
          />

          <div className="grid gap-4 md:grid-cols-3">
            {quickStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-100">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-sm font-semibold text-slate-200">Core Readiness</p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>Core OK: {monitor?.core?.health?.ok ? 'yes' : 'no'}</p>
                <p>Deterministic: {deterministic === null ? 'unknown' : deterministic ? 'yes' : 'no'}</p>
                <p>Entropy: {typeof entropy === 'number' ? entropy.toFixed(3) : '-'}</p>
                <p>Gate Action: {monitor?.core?.determinism?.data?.gate_action || '-'}</p>
                <p>Sequence: {monitor?.core?.determinism?.data?.sequence || '-'}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-sm font-semibold text-slate-200">Billing / Capacity</p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>Plan: {monitor?.billing?.subscription?.plan_key || '-'}</p>
                <p>Interval: {monitor?.billing?.subscription?.billing_interval || '-'}</p>
                <p>Status: {monitor?.billing?.subscription?.status || '-'}</p>
                <p>Executions this month: {monitor?.billing?.executions_this_month ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-200">Active Alerts</p>
              <span className="text-xs text-slate-400">{alerts.length} item(s)</span>
            </div>
            <div className="mt-3 space-y-3">
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-400">
                  No active alerts.
                </div>
              ) : (
                alerts.map((alert, index) => (
                  <div
                    key={`${alert.code}-${index}`}
                    className={`rounded-xl border p-3 text-sm ${alertTone(alert.level)}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{alert.code}</span>
                      <span className="text-xs uppercase tracking-wide">{alert.level}</span>
                    </div>
                    <p className="mt-2">{alert.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
