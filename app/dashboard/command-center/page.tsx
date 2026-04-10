'use client';

import { useEffect, useMemo, useState } from 'react';

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
  if (normalized.includes('BLOCK') || normalized.includes('FREEZE')) return 'text-rose-300 border-rose-500/20';
  if (normalized.includes('WARN')) return 'text-amber-200 border-amber-500/20';
  if (normalized.includes('PASS') || normalized.includes('ALLOW') || normalized.includes('SUCCESS')) return 'text-emerald-200 border-emerald-500/20';
  return 'text-slate-200 border-slate-700';
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

        if (errors.length > 0) {
          setError(errors.join(' • '));
        }
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
    if (!health?.core_ok) actions.push('Run /api/health diagnostics and verify DSG core connectivity.');
    if ((capacity?.utilization ?? 0) > 0.8) actions.push('Reduce execution load or upgrade plan before quota exhaustion.');
    if (alerts.length > 0) actions.push('Review latest BLOCK/FREEZE audit events before approving new executions.');
    if (actions.length === 0) actions.push('System is stable. Continue monitoring entropy and latency trends.');
    return actions;
  }, [health?.core_ok, capacity?.utilization, alerts.length]);

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
          const event = JSON.parse(raw.slice(6));
          if (event.type === 'step_result' || event.type === 'step_error') {
            setChatOutput((prev) => [...prev, JSON.stringify(event, null, 2)]);
          }
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
    <main className="min-h-screen bg-[#0d0e11] px-6 pb-12 pt-8 text-[#f7f6f9]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-12">
        <section className="relative overflow-hidden bg-[#1e2023] p-8 md:col-span-8">
          <div className="relative z-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-mono text-sm uppercase tracking-[0.3em] text-[#00e5ff]">DSG ONE · COMMAND CENTER</h1>
                <p className="mt-3 text-3xl font-bold uppercase tracking-tight text-[#81ecff]">System Health Matrix</p>
                <p className="mt-2 text-sm text-slate-300">Autonomous reconciliation monitoring active.</p>
              </div>
              <span className="rounded-full border border-[#00fe66]/30 bg-[#00fe66]/10 px-3 py-1 font-mono text-xs text-[#00fe66]">{overallStatus}</span>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="border-l-2 border-[#00e5ff] bg-[#121316] p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Core Status</p>
                <p className="mt-1 font-mono text-2xl">{health?.core_ok ? 'ONLINE' : 'OFFLINE'}</p>
              </div>
              <div className="border-l-2 border-[#00e5ff] bg-[#121316] p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Executions</p>
                <p className="mt-1 font-mono text-2xl">{capacity?.executions ?? 0}</p>
              </div>
              <div className="border-l-2 border-[#ff6e85] bg-[#121316] p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Quota Remaining</p>
                <p className="mt-1 font-mono text-2xl">{capacity?.remaining_executions ?? 0}</p>
              </div>
              <div className="border-l-2 border-[#00e5ff] bg-[#121316] p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Projected Billing</p>
                <p className="mt-1 font-mono text-2xl">${(capacity?.projected_amount_usd ?? 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={submitCommand}
                disabled={chatBusy}
                className="bg-[#81ecff] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                {chatBusy ? 'Running…' : 'Run Diagnostics'}
              </button>
              <span className="border border-[#81ecff]/30 px-4 py-2 font-mono text-xs uppercase tracking-wider text-[#81ecff]">
                Last check: {formatDate(health?.timestamp)}
              </span>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,227,253,0.18),transparent_60%)]" />
        </section>

        <section className="bg-[#181a1d] p-6 md:col-span-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-[#81ecff]">Compliance Scorecard</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between border-l-4 border-[#00fe66] bg-[#121316] p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Plan</p>
              <p className="font-mono text-lg">{usage?.plan || '-'}</p>
            </div>
            <div className="flex items-center justify-between border-l-4 border-[#ff6e85] bg-[#121316] p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Active Alerts</p>
              <p className="font-mono text-lg text-[#ff6e85]">{alerts.length}</p>
            </div>
            <div className="flex items-center justify-between border-l-4 border-[#81ecff] bg-[#121316] p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Utilization</p>
              <p className="font-mono text-lg">{Math.round((capacity?.utilization ?? 0) * 100)}%</p>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-700/50 pt-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Suggested Actions</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              {suggestedActions.map((action) => (
                <li key={action}>• {action}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border border-slate-800 bg-black/30 p-6 md:col-span-12">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-[#81ecff]">Operator Console</h2>
              <p className="mt-2 text-sm text-slate-400">Prompt the agent for summaries and recovery procedures.</p>
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Ask readiness/audit/capacity/execute..."
                className="mt-3 h-28 w-full border border-slate-700 bg-[#0d0e11] p-3 font-mono text-sm text-slate-100 outline-none focus:border-[#81ecff]"
              />
              {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
              <div className="mt-4 max-h-60 space-y-2 overflow-y-auto pr-2">
                {chatOutput.length === 0 ? <p className="text-sm text-slate-500">No output yet.</p> : null}
                {chatOutput.map((line, index) => (
                  <pre key={`${index}-${line.slice(0, 8)}`} className="overflow-x-auto border border-slate-700 bg-[#121316] p-3 text-xs text-slate-200">
                    {line}
                  </pre>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-[#81ecff]">Active Execution Loops</h2>
              <p className="mt-2 text-sm text-slate-400">Latest audit stream and gate results.</p>
              <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-2">
                {(audit?.items || []).map((item) => (
                  <div key={`${item.id}-${item.created_at}`} className={`border bg-[#121316] p-3 text-sm ${resultTone(item.gate_result)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold uppercase">{item.gate_result || '-'}</p>
                      <p className="text-xs text-slate-400">{formatDate(item.created_at)}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">Entropy: {typeof item.entropy === 'number' ? item.entropy.toFixed(4) : '-'}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">State hash: {item.state_hash || '-'}</p>
                  </div>
                ))}
                {auditUnavailableInInternalMode ? <p className="text-sm text-slate-500">Audit unavailable in internal mode.</p> : null}
                {!auditUnavailableInInternalMode && audit?.items?.length === 0 ? <p className="text-sm text-slate-500">No audit events found.</p> : null}
              </div>
              <div className="mt-3 border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">Core version: {health?.core?.version || '-'} · Status: {health?.core?.status || '-'} · Error: {health?.core?.error || '-'}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
