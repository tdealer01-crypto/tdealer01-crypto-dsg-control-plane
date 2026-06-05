'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { parseSseData, formatAgentEventMessage } from '../../../lib/agent/chat-event';
import { usePageMemory } from '../../../hooks/usePageMemory';

type GateStatus = 'PASS' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED';
type RuntimeStatus = 'CHECKING' | 'GRAPH_READY' | 'DEGRADED' | 'RUNNING' | 'BLOCKED';
type ClaimStatus = 'REVIEW' | 'BLOCKED';

type HealthPayload = {
  service?: string;
  timestamp?: string;
  core_ok?: boolean;
  core?: { status?: string; version?: string; error?: string };
};

type CapacityPayload = {
  ok?: boolean;
  plan_key?: string;
  subscription_status?: string;
  executions?: number;
  included_executions?: number;
  remaining_executions?: number;
  utilization?: number;
  projected_amount_usd?: number;
};

type UsagePayload = {
  plan?: string;
  subscription_status?: string;
  billing_period?: string;
  executions?: number;
  included_executions?: number;
  projected_amount_usd?: number;
};

type AuditPayload = {
  ok?: boolean;
  error?: string | null;
  items?: Array<{
    id?: number;
    gate_result?: string;
    entropy?: number;
    created_at?: string;
    state_hash?: string;
  }>;
};

type CommandCenterMemory = {
  command: string;
  chatOutput: string[];
  error: string;
};

const PAGE_KEY = '/dashboard/command-center';

const INITIAL_MEMORY: CommandCenterMemory = {
  command: '',
  chatOutput: [],
  error: '',
};

function formatDate(value?: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusTone(status: GateStatus | RuntimeStatus | ClaimStatus) {
  const normalized = status.toUpperCase();
  if (['PASS', 'GRAPH_READY'].includes(normalized)) return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
  if (['BLOCK', 'BLOCKED', 'DEGRADED'].includes(normalized)) return 'border-red-400/30 bg-red-500/10 text-red-100';
  if (['REVIEW', 'CHECKING', 'RUNNING'].includes(normalized)) return 'border-amber-300/30 bg-amber-300/10 text-amber-100';
  return 'border-slate-500/30 bg-slate-800/70 text-slate-200';
}

function StatusPill({ status }: { status: GateStatus | RuntimeStatus | ClaimStatus }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusTone(status)}`}>{status}</span>;
}

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="border border-white/10 bg-[#0d0f12] p-6">
      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function CommandCenterPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [capacity, setCapacity] = useState<CapacityPayload | null>(null);
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [audit, setAudit] = useState<AuditPayload | null>(null);
  const [chatBusy, setChatBusy] = useState(false);

  const {
    value: memory,
    setValue: setMemory,
    loaded: memoryLoaded,
    error: memoryError,
    reset: resetMemory,
  } = usePageMemory(PAGE_KEY, INITIAL_MEMORY);

  useEffect(() => {
    let alive = true;

    Promise.allSettled([
      fetch('/api/health', { cache: 'no-store' }).then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || 'Failed to load health');
        return json as HealthPayload;
      }),
      fetch('/api/capacity', { cache: 'no-store' }).then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || 'Failed to load capacity');
        return json as CapacityPayload;
      }),
      fetch('/api/usage', { cache: 'no-store' }).then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || 'Failed to load usage');
        return json as UsagePayload;
      }),
      fetch('/api/audit?limit=8', { cache: 'no-store' }).then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || 'Failed to load audit');
        return json as AuditPayload;
      }),
    ])
      .then(([healthRes, capacityRes, usageRes, auditRes]) => {
        if (!alive) return;

        const errors: string[] = [];
        if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
        else errors.push(healthRes.reason?.message || 'Failed to load health');

        if (capacityRes.status === 'fulfilled') setCapacity(capacityRes.value);
        else errors.push(capacityRes.reason?.message || 'Failed to load capacity');

        if (usageRes.status === 'fulfilled') setUsage(usageRes.value);
        else errors.push(usageRes.reason?.message || 'Failed to load usage');

        if (auditRes.status === 'fulfilled') setAudit(auditRes.value);
        else errors.push(auditRes.reason?.message || 'Failed to load audit');

        setMemory((prev) => ({ ...prev, error: errors.join(' • ') }));
      })
      .catch((err) => {
        if (!alive) return;
        setMemory((prev) => ({ ...prev, error: err instanceof Error ? err.message : 'Failed to load command center' }));
      });

    return () => {
      alive = false;
    };
  }, [setMemory]);

  const overallStatus = useMemo<RuntimeStatus>(() => {
    if (!health) return 'CHECKING';
    return health.core_ok ? 'GRAPH_READY' : 'DEGRADED';
  }, [health]);

  const alerts = useMemo(() => {
    const events = audit?.items || [];
    return events.filter((item) => ['BLOCK', 'FREEZE'].includes((item.gate_result || '').toUpperCase()));
  }, [audit]);

  const metrics = useMemo(
    () => [
      { label: 'Runtime status', value: overallStatus, helper: health?.core?.version || 'Graph-backed review surface' },
      { label: 'Current claim', value: 'REVIEW', helper: 'Verification evidence still required' },
      { label: 'Production claim', value: 'BLOCKED', helper: 'Production-flow proof required' },
      { label: 'Active audit alerts', value: String(alerts.length), helper: `${audit?.items?.length ?? 0} latest audit item(s)` },
    ],
    [alerts.length, audit?.items?.length, health?.core?.version, overallStatus],
  );

  function appendChatOutput(line: string) {
    setMemory((prev) => ({ ...prev, chatOutput: [...prev.chatOutput, line].slice(-160) }));
  }

  async function submitCommand() {
    const value = memory.command.trim();
    if (!value || chatBusy) return;

    setChatBusy(true);
    appendChatOutput(`> ${value}`);

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: value, pageContext: 'command-center', sessionId: PAGE_KEY }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Agent chat failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream body returned');

      const decoder = new TextDecoder();
      let buffer = '';
      let sawFinalEvent = false;

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
          if (event.type === 'done') sawFinalEvent = true;
          const message = formatAgentEventMessage(event);
          if (!message) continue;
          appendChatOutput(message);
        }
      }

      if (!sawFinalEvent) appendChatOutput('⚠️ Stream ended before final done event. Inspect runtime logs before claiming completion.');
      setMemory((prev) => ({ ...prev, command: '' }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Agent chat failed';
      appendChatOutput(message);
      setMemory((prev) => ({ ...prev, error: message }));
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090a0d] px-6 pb-12 pt-8 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="border border-white/10 bg-[linear-gradient(135deg,rgba(120,14,21,0.2),rgba(10,11,14,0.92)_35%,rgba(245,197,92,0.08)_120%)] p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">DSG ONE Command Center</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white md:text-5xl">Runtime control surface with refresh-safe page memory.</h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Command Center shows what DSG ONE is doing, what it blocked, what needs approval, and what evidence supports each claim. Operator console state now restores from `/api/ui-memory` after refresh instead of disappearing with client-only state.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <StatusPill status={overallStatus} />
              <StatusPill status="REVIEW" />
              <StatusPill status="BLOCKED" />
            </div>
          </div>
        </section>

        {(memory.error || memoryError) ? (
          <section className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">Persistence / data notice</p>
            <p className="mt-1 text-amber-50/80">{memoryError || memory.error}</p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          {metrics.map((item) => (
            <div key={item.label} className="border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
              <p className="mt-4 text-3xl font-semibold text-white">{item.value}</p>
              <p className="mt-2 text-sm text-slate-400">{item.helper}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Panel eyebrow="Chat / Agent Console" title="Refresh-safe command console">
            <div className="rounded-xl border border-slate-800 bg-black/30 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <span>{memoryLoaded ? 'Memory loaded from /api/ui-memory' : 'Loading page memory...'}</span>
                <button
                  type="button"
                  onClick={resetMemory}
                  disabled={chatBusy}
                  className="rounded-lg border border-slate-700 px-3 py-1 text-slate-300 transition hover:border-amber-300/60 disabled:opacity-50"
                >
                  Reset saved console
                </button>
              </div>
              <div className="min-h-64 max-h-96 overflow-y-auto rounded-lg border border-white/10 bg-[#050609] p-4 font-mono text-xs leading-6 text-slate-200">
                {memory.chatOutput.length === 0 ? (
                  <p className="text-slate-600">No command output yet. Submit a safe command; refresh will preserve this panel after persistence is active.</p>
                ) : (
                  memory.chatOutput.map((line, index) => <p key={`${index}-${line.slice(0, 16)}`} className="whitespace-pre-wrap break-words">{line}</p>)
                )}
              </div>
              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <textarea
                  value={memory.command}
                  onChange={(event) => setMemory((prev) => ({ ...prev, command: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      submitCommand();
                    }
                  }}
                  disabled={chatBusy}
                  rows={2}
                  className="min-h-14 flex-1 resize-none rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-amber-300/50"
                  placeholder="Ask DSG to inspect status, list blockers, or explain the next safe action..."
                />
                <button
                  type="button"
                  onClick={submitCommand}
                  disabled={chatBusy || !memory.command.trim()}
                  className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {chatBusy ? 'Running...' : 'Run in Agent Chat'}
                </button>
              </div>
            </div>
          </Panel>

          <Panel eyebrow="Monitor / Control Panel" title="Live evidence and blockers">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-white">System health</span>
                  <StatusPill status={overallStatus} />
                </div>
                <p className="mt-2 text-xs text-slate-500">Service: {health?.service ?? 'not loaded'} · Timestamp: {formatDate(health?.timestamp)}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-white">Capacity</span>
                  <span className="font-mono text-amber-100">{Math.round((capacity?.utilization ?? 0) * 100)}%</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">Executions: {capacity?.executions ?? usage?.executions ?? 0} · Remaining: {capacity?.remaining_executions ?? '-'} · Plan: {capacity?.plan_key ?? usage?.plan ?? '-'}</p>
              </div>

              <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-red-100">Production claim</span>
                  <StatusPill status="BLOCKED" />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">Keep production claim blocked until deployment proof, production-flow proof, auth/RBAC proof, audit proof, evidence proof, and replay proof are present.</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="font-semibold text-white">Latest audit items</p>
                <div className="mt-3 space-y-2">
                  {(audit?.items ?? []).length === 0 ? (
                    <p className="text-xs text-slate-500">No audit items loaded for this page.</p>
                  ) : (
                    (audit?.items ?? []).map((item) => (
                      <div key={item.id ?? item.state_hash} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-200">{item.gate_result ?? 'unknown'}</span>
                          <span className="text-slate-500">{formatDate(item.created_at)}</span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-slate-500">{item.state_hash ?? 'no state hash'}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Panel>
        </section>

        <section className="flex flex-wrap gap-3 text-sm">
          <Link className="rounded-xl border border-white/15 px-4 py-3 font-semibold text-slate-100" href="/enterprise-proof/demo">View live gate evidence</Link>
          <Link className="rounded-xl border border-white/15 px-4 py-3 font-semibold text-slate-100" href="/evidence-pack">Open evidence pack</Link>
          <Link className="rounded-xl border border-white/15 px-4 py-3 font-semibold text-slate-100" href="/dashboard/hermes">Open Hermes Agent</Link>
        </section>
      </div>
    </main>
  );
}
