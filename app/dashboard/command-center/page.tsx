'use client';

import { useEffect, useMemo, useState } from 'react';
import { parseSseData, formatAgentEventMessage } from '../../../lib/agent/chat-event';

type HealthPayload = {
  service?: string;
  timestamp?: string;
  core_ok?: boolean;
  core?: {
    status?: string;
    version?: string;
    error?: string;
  };
};

type CapacityPayload = {
  ok?: boolean;
  plan_key?: string;
  billing_interval?: string;
  subscription_status?: string;
  billing_period?: string;
  executions: number;
  included_executions?: number;
  remaining_executions: number;
  utilization: number;
  overage_executions?: number;
  projected_amount_usd: number;
};

type UsagePayload = {
  plan?: string;
  subscription_status?: string;
  billing_period?: string;
  executions?: number;
  included_executions?: number;
  overage_executions?: number;
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

function formatDate(value?: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function resultTone(result?: string) {
  const normalized = (result || '').toUpperCase();
  if (normalized.includes('BLOCK') || normalized.includes('FREEZE')) return 'border-red-400/25 bg-red-500/10 text-red-100';
  if (normalized.includes('WARN') || normalized.includes('STABILIZE')) return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
}

export default function CommandCenterPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [capacity, setCapacity] = useState<CapacityPayload | null>(null);
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [audit, setAudit] = useState<AuditPayload | null>(null);
  const [command, setCommand] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatOutput, setChatOutput] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    Promise.allSettled([
      fetch('/api/health', { cache: 'no-store' }).then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || 'Failed to load health');
        return json;
      }),
      fetch('/api/capacity', { cache: 'no-store' }).then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || 'Failed to load capacity');
        return json;
      }),
      fetch('/api/usage', { cache: 'no-store' }).then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || 'Failed to load usage');
        return json;
      }),
      fetch('/api/audit?limit=8', { cache: 'no-store' }).then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || 'Failed to load audit');
        return json;
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

        if (errors.length > 0) setError(errors.join(' • '));
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load command center');
      });

    return () => {
      alive = false;
    };
  }, []);

  const overallStatus = useMemo(() => {
    if (!health) return 'CHECKING';
    return health.core_ok ? 'READY' : 'DEGRADED';
  }, [health]);

  const alerts = useMemo(() => {
    const events = audit?.items || [];
    return events.filter((item) => ['BLOCK', 'FREEZE'].includes((item.gate_result || '').toUpperCase()));
  }, [audit]);

  const auditUnavailableInInternalMode = useMemo(() => {
    const message = (audit?.error || '').toLowerCase();
    return message.includes('internal dsg core mode');
  }, [audit?.error]);

  const suggestedActions = useMemo(() => {
    const actions: string[] = [];
    if (!health?.core_ok) actions.push('Verify DSG core connectivity and runtime credentials.');
    if ((capacity?.utilization ?? 0) > 0.8) actions.push('Reduce execution load or expand plan capacity before quota pressure becomes operational risk.');
    if (alerts.length > 0) actions.push('Review the latest BLOCK or FREEZE events before releasing more approvals.');
    if (actions.length === 0) actions.push('System posture is stable. Continue monitoring audit entropy and queue pressure.');
    return actions;
  }, [alerts.length, capacity?.utilization, health?.core_ok]);

  const metrics = useMemo(
    () => [
      { label: 'Core status', value: health?.core_ok ? 'Online' : 'Offline', helper: health?.core?.version || 'No version reported' },
      { label: 'Executions', value: String(capacity?.executions ?? 0), helper: usage?.billing_period || 'Current period' },
      { label: 'Quota remaining', value: String(capacity?.remaining_executions ?? 0), helper: `${Math.round((capacity?.utilization ?? 0) * 100)}% utilized` },
      { label: 'Projected billing', value: `$${(capacity?.projected_amount_usd ?? 0).toFixed(2)}`, helper: usage?.plan || '-' },
    ],
    [capacity?.executions, capacity?.projected_amount_usd, capacity?.remaining_executions, capacity?.utilization, health?.core?.version, health?.core_ok, usage?.billing_period, usage?.plan],
  );

  async function submitCommand() {
    const value = command.trim();
    if (!value || chatBusy) return;
    setChatBusy(true);
    setChatOutput((prev) => [...prev, `> ${value}`]);

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: value }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Agent chat failed');
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
          setChatOutput((prev) => [...prev, message]);
        }
      }

      setCommand('');
    } catch (err) {
      setChatOutput((prev) => [...prev, err instanceof Error ? err.message : 'Agent chat failed']);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090a0d] px-6 pb-12 pt-8 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="border border-white/10 bg-[linear-gradient(135deg,rgba(120,14,21,0.2),rgba(10,11,14,0.92)_35%,rgba(245,197,92,0.08)_120%)] p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">DSG Command Center</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white md:text-5xl">Live operator surface for readiness, evidence, and intervention.</h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Use this room to scan control posture, review active audit signals, and run guided diagnostics before approving more runtime activity.
              </p>
            </div>
            <span className={`inline-flex rounded-full border px-4 py-2 text-xs uppercase tracking-[0.24em] ${overallStatus === 'READY' ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100' : 'border-red-400/25 bg-red-500/10 text-red-100'}`}>
              {overallStatus}
            </span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {metrics.map((item) => (
            <div key={item.label} className="border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
              <p className="mt-4 text-3xl font-semibold text-white">{item.value}</p>
              <p className="mt-2 text-sm text-slate-400">{item.helper}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="space-y-6">
            <div className="border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Control scorecard</p>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between border-l border-emerald-400/35 bg-black/20 p-4">
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Plan</span>
                  <span className="font-semibold text-white">{usage?.plan || '-'}</span>
                </div>
                <div className="flex items-center justify-between border-l border-red-400/35 bg-black/20 p-4">
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Active alerts</span>
                  <span className="font-semibold text-red-100">{alerts.length}</span>
                </div>
                <div className="flex items-center justify-between border-l border-amber-300/35 bg-black/20 p-4">
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Utilization</span>
                  <span className="font-semibold text-white">{Math.round((capacity?.utilization ?? 0) * 100)}%</span>
                </div>
              </div>
            </div>

            <div className="border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Suggested actions</p>
              <div className="mt-4 space-y-3">
                {suggestedActions.map((action) => (
                  <div key={action} className="border-l border-amber-300/35 bg-black/20 p-4 text-sm leading-7 text-slate-200">
                    {action}
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
              Core version: {health?.core?.version || '-'} · Status: {health?.core?.status || '-'} · Error: {health?.core?.error || '-'}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="border border-white/10 bg-[#0d0f12] p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Agent console</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Run diagnostics and operator prompts</h2>
                </div>
                <button
                  type="button"
                  onClick={submitCommand}
                  disabled={chatBusy}
                  className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  {chatBusy ? 'Running…' : 'Run diagnostics'}
                </button>
              </div>

              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Ask readiness, audit, capacity, or recovery questions..."
                className="mt-5 h-32 w-full border border-white/10 bg-black/30 p-4 text-sm text-slate-100 outline-none transition focus:border-amber-300/40"
              />
              {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}

              <div className="mt-5 max-h-72 space-y-3 overflow-y-auto pr-1">
                {chatOutput.length === 0 ? <p className="text-sm text-slate-500">No output yet.</p> : null}
                {chatOutput.map((line, index) => (
                  <pre key={`${index}-${line.slice(0, 8)}`} className="overflow-x-auto border border-white/10 bg-black/20 p-4 text-xs leading-6 text-slate-200">
                    {line}
                  </pre>
                ))}
              </div>
            </div>

            <div className="border border-white/10 bg-[#0d0f12] p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Audit stream</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Latest gate results and state evidence</h2>
                </div>
                <p className="text-sm text-slate-500">Last check: {formatDate(health?.timestamp)}</p>
              </div>

              <div className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {(audit?.items || []).map((item) => (
                  <div key={`${item.id}-${item.created_at}`} className={`border p-4 ${resultTone(item.gate_result)}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em]">{item.gate_result || '-'}</p>
                      <p className="text-xs text-slate-400">{formatDate(item.created_at)}</p>
                    </div>
                    <p className="mt-3 text-xs text-slate-300">Entropy: {typeof item.entropy === 'number' ? item.entropy.toFixed(4) : '-'}</p>
                    <p className="mt-2 break-all text-xs text-slate-500">State hash: {item.state_hash || '-'}</p>
                  </div>
                ))}
                {auditUnavailableInInternalMode ? <p className="text-sm text-slate-500">Audit unavailable in internal mode.</p> : null}
                {!auditUnavailableInInternalMode && audit?.items?.length === 0 ? <p className="text-sm text-slate-500">No audit events found.</p> : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
