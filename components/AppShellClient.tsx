'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import EntropyField from './canvas/EntropyField';
import { parseSseData, formatAgentEventMessage } from '../lib/agent/chat-event';

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
      return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100 shadow-[0_0_24px_rgba(51,209,122,0.12)]';
    case 'degraded':
      return 'border-amber-300/35 bg-amber-300/10 text-amber-100 shadow-[0_0_24px_rgba(245,197,66,0.12)]';
    case 'blocked':
      return 'border-orange-300/35 bg-orange-400/10 text-orange-100';
    case 'down':
      return 'border-red-400/35 bg-red-500/10 text-red-100 shadow-[0_0_24px_rgba(225,6,0,0.12)]';
    default:
      return 'border-white/10 bg-white/[0.04] text-slate-300';
  }
}

function alertTone(level: string) {
  switch (level) {
    case 'critical':
    case 'error':
      return 'border-red-400/35 bg-red-500/10 text-red-100';
    case 'warning':
      return 'border-amber-300/35 bg-amber-300/10 text-amber-100';
    default:
      return 'border-white/10 bg-white/[0.04] text-slate-300';
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
        'Authenticated command workspace ready. Review readiness, entropy, alerts, and operator context before taking action.',
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
  const coreOk = monitor?.core?.health?.ok;
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

  const missionCards = useMemo(
    () => [
      {
        label: 'Runtime authority',
        value: readinessStatus.toUpperCase(),
        helper: 'Authenticated monitor truth, refreshed every 5 seconds.',
      },
      {
        label: 'Human action gate',
        value: alerts.length > 0 ? `${alerts.length} alert(s)` : 'Clear',
        helper: 'Review warnings before approving execution pressure.',
      },
      {
        label: 'Determinism',
        value: deterministic === null ? 'Unknown' : deterministic ? 'Stable' : 'Drift',
        helper: typeof entropy === 'number' ? `Max entropy ${entropy.toFixed(3)}` : 'Waiting for entropy signal.',
      },
    ],
    [alerts.length, deterministic, entropy, readinessStatus],
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
          const event = parseSseData(raw);
          if (!event) continue;
          const message = formatAgentEventMessage(event);
          if (!message) continue;
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              role: 'assistant',
              content: message,
            },
          ]);
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
    <main className="min-h-screen overflow-hidden bg-[#050505] text-[#F7F7F2]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(225,6,0,0.18),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(212,175,55,0.14),transparent_30%),linear-gradient(180deg,#050505_0%,#0b0b0f_48%,#050505_100%)]" />

      <div className="relative border-b border-white/10 bg-black/65 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#D4AF37]">DSG One · Authenticated Cockpit</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Unified Command Workspace</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Split-pane agent chat, mission telemetry, and protected runtime evidence in one operator-first surface.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${badgeTone(readinessStatus)}`}>
              {loading ? 'loading' : readinessStatus}
            </span>
            <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#F5D76E]">
              Operator session
            </span>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-6 pb-5">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#D4AF37]/45 hover:bg-[#D4AF37]/10 hover:text-[#F5D76E]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-6 py-6">
        <section className="grid gap-4 lg:grid-cols-3">
          {missionCards.map((card) => (
            <div key={card.label} className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{card.helper}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="flex min-h-[780px] flex-col rounded-[2rem] border border-white/10 bg-[#0B0B0F]/90 shadow-[0_24px_120px_rgba(0,0,0,0.34)]">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-white">Agent Console</p>
                <p className="text-xs leading-5 text-slate-400">
                  Ask for readiness, active alerts, audit status, policies, capacity, or execution context.
                </p>
              </div>
              <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold text-[#F5D76E]">
                Human-reviewed actions
              </span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === 'user'
                      ? 'ml-auto max-w-[88%] rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-4 py-3 text-sm leading-6 text-[#F7F7F2]'
                      : message.role === 'assistant'
                        ? 'max-w-[88%] rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm leading-6 text-slate-100'
                        : 'max-w-[92%] rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-50'
                  }
                >
                  {message.content}
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ask for readiness, active alerts, audit status, policies, capacity, or execution context..."
                  className="min-h-[112px] rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/10"
                />
                <div className="flex flex-col gap-3">
                  <button
                    onClick={submitPrompt}
                    disabled={chatBusy}
                    className="rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-black shadow-[0_18px_60px_rgba(212,175,55,0.18)] transition hover:bg-[#F5D76E] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                  >
                    {chatBusy ? 'Running…' : 'Run in Agent Chat'}
                  </button>
                  <button
                    onClick={() =>
                      setDraft(
                        'Analyze current readiness, active alerts, determinism health, and quota pressure. Recommend the next operator action.',
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-50"
                  >
                    Use Readiness Prompt
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6 rounded-[2rem] border border-white/10 bg-[#0B0B0F]/90 p-5 shadow-[0_24px_120px_rgba(0,0,0,0.34)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Live Monitor</p>
                <p className="text-xs leading-5 text-slate-400">Protected core truth, readiness, entropy pattern, and active alerts.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeTone(readinessStatus)}`}
                >
                  {loading ? 'loading' : readinessStatus}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                  {monitor?.generated_at ? new Date(monitor.generated_at).toLocaleTimeString() : 'waiting'}
                </span>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-400/35 bg-red-500/10 p-4 text-sm text-red-100">
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
              className="w-full rounded-[1.5rem] border border-white/10 bg-black/35"
            />

            <div className="grid gap-4 md:grid-cols-3">
              {quickStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-black/35 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                <p className="text-sm font-semibold text-white">Core Readiness</p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  <p>Core OK: {typeof coreOk === 'boolean' ? (coreOk ? 'yes' : 'no') : 'unknown'}</p>
                  <p>Deterministic: {deterministic === null ? 'unknown' : deterministic ? 'yes' : 'no'}</p>
                  <p>Entropy: {typeof entropy === 'number' ? entropy.toFixed(3) : '-'}</p>
                  <p>Gate Action: {monitor?.core?.determinism?.data?.gate_action || '-'}</p>
                  <p>Sequence: {monitor?.core?.determinism?.data?.sequence || '-'}</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Public smoke check is available at <code>/api/health</code>. This panel reflects authenticated monitor payloads.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                <p className="text-sm font-semibold text-white">Billing / Capacity</p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  <p>Plan: {monitor?.billing?.subscription?.plan_key || '-'}</p>
                  <p>Interval: {monitor?.billing?.subscription?.billing_interval || '-'}</p>
                  <p>Status: {monitor?.billing?.subscription?.status || '-'}</p>
                  <p>Executions this month: {monitor?.billing?.executions_this_month ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">Active Alerts</p>
                <span className="text-xs text-slate-500">{alerts.length} item(s)</span>
              </div>
              <div className="mt-3 space-y-3">
                {alerts.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm text-slate-400">
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
                      <p className="mt-2 leading-6">{alert.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
