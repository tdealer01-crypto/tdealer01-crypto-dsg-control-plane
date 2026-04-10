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
  executions: number;
  remaining_executions: number;
  utilization: number;
  projected_amount_usd: number;
  billing_period?: string;
};

type UsagePayload = {
  plan?: string;
  billing_period?: string;
  subscription_status?: string;
  executions?: number;
};

type AuditPayload = {
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

export default function CommandCenterPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [capacity, setCapacity] = useState<CapacityPayload | null>(null);
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [audit, setAudit] = useState<AuditPayload | null>(null);
  const [command, setCommand] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatOutput, setChatOutput] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [chatAuthRequired, setChatAuthRequired] = useState(false);

  useEffect(() => {
    let alive = true;

    const fetchJson = async (url: string) => {
      const response = await fetch(url, { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      return { ok: response.ok, status: response.status, json };
    };

    Promise.allSettled([
      fetchJson('/api/health'),
      fetchJson('/api/capacity'),
      fetchJson('/api/usage'),
      fetchJson('/api/audit?limit=8'),
    ])
      .then((results) => {
        if (!alive) return;

        const nextWarnings: string[] = [];
        setError('');

        const [healthRes, capacityRes, usageRes, auditRes] = results;

        if (healthRes.status === 'fulfilled') {
          if (healthRes.value.ok) {
            setHealth(healthRes.value.json);
          } else {
            const message = healthRes.value.json?.error || 'Failed to load health';
            setError(message);
          }
        } else {
          setError('Failed to load health');
        }

        if (capacityRes.status === 'fulfilled') {
          if (capacityRes.value.ok) {
            setCapacity(capacityRes.value.json);
          } else if (capacityRes.value.status === 401) {
            nextWarnings.push('Capacity is unavailable until you sign in.');
          } else {
            nextWarnings.push(capacityRes.value.json?.error || 'Failed to load capacity.');
          }
        } else {
          nextWarnings.push('Failed to load capacity.');
        }

        if (usageRes.status === 'fulfilled') {
          if (usageRes.value.ok) {
            setUsage(usageRes.value.json);
          } else if (usageRes.value.status === 401) {
            nextWarnings.push('Usage is unavailable until you sign in.');
          } else {
            nextWarnings.push(usageRes.value.json?.error || 'Failed to load usage.');
          }
        } else {
          nextWarnings.push('Failed to load usage.');
        }

        if (auditRes.status === 'fulfilled') {
          if (auditRes.value.ok) {
            setAudit(auditRes.value.json);
          } else if (auditRes.value.status === 401) {
            nextWarnings.push('Audit stream is unavailable until you sign in.');
          } else {
            const message = auditRes.value.json?.error || 'Failed to load audit.';
            if (/internal mode/i.test(message)) {
              nextWarnings.push('Audit unavailable in internal mode.');
            } else {
              nextWarnings.push(message);
            }
          }
        } else {
          nextWarnings.push('Failed to load audit.');
        }

        setWarnings(nextWarnings);
      })
      .catch(() => {
        if (!alive) return;
        setError('Failed to load command center');
      });

    return () => {
      alive = false;
    };
  }, []);

  const overallStatus = useMemo(() => {
    if (!health) return 'Checking';
    return health.core_ok ? 'Ready' : 'Degraded';
  }, [health]);

  const alerts = useMemo(() => {
    const events = audit?.items || [];
    return events.filter((item) => ['BLOCK', 'FREEZE'].includes((item.gate_result || '').toUpperCase()));
  }, [audit]);

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
        if (res.status === 401) {
          setChatAuthRequired(true);
          throw new Error('Please sign in with operator or org_admin access to use Agent Chat.');
        }
        throw new Error(json.error || 'Agent chat failed');
      }

      setChatAuthRequired(false);

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
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Unified Command Center</p>
          <div className="mt-3 grid gap-4 md:grid-cols-5">
            <div>
              <p className="text-sm text-slate-400">Overall</p>
              <p className="text-2xl font-semibold">{overallStatus}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Core Status</p>
              <p className="text-2xl font-semibold">{health?.core_ok ? 'Online' : 'Offline'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Active Session</p>
              <p className="text-2xl font-semibold">control-plane</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Executions</p>
              <p className="text-2xl font-semibold">{capacity?.executions ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Period</p>
              <p className="text-2xl font-semibold">{capacity?.billing_period || usage?.billing_period || '-'}</p>
            </div>
          </div>
        </header>

        {error ? <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
        {warnings.length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
            <p className="font-semibold">Partial data loaded</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Chat / Agent Console</h2>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">Live</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">Use this pane for command prompts, summaries, and action planning.</p>
            <label className="mt-4 block text-sm text-slate-300">Command</label>
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Ask readiness/audit/capacity/execute..."
              className="mt-2 h-28 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none ring-emerald-400 focus:ring-1"
            />
            {chatAuthRequired ? (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                Please sign in with operator/org_admin role to run Agent Chat commands.
              </div>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={submitCommand}
                disabled={chatBusy}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                {chatBusy ? 'Running…' : 'Submit'}
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="font-semibold text-slate-200">Suggested Actions</p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-300">
                {suggestedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="font-semibold text-slate-200">Command Output</p>
              <div className="mt-2 max-h-52 space-y-2 overflow-y-auto text-xs text-slate-300">
                {chatOutput.length === 0 ? <p className="text-slate-500">No output yet.</p> : null}
                {chatOutput.map((line, index) => (
                  <pre key={`${index}-${line.slice(0, 8)}`} className="whitespace-pre-wrap break-all rounded border border-slate-800 bg-slate-900 p-2">
                    {line}
                  </pre>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Monitor / Control Panel</h2>
            <p className="mt-2 text-sm text-slate-400">Readiness, entropy, alerts, quota, and runtime stats in one pane.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Quota Remaining</p>
                <p className="mt-1 text-2xl font-semibold">{capacity?.remaining_executions ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Utilization</p>
                <p className="mt-1 text-2xl font-semibold">{Math.round((capacity?.utilization ?? 0) * 100)}%</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Projected Billing (USD)</p>
                <p className="mt-1 text-2xl font-semibold">${(capacity?.projected_amount_usd ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Plan</p>
                <p className="mt-1 text-2xl font-semibold">{usage?.plan || '-'}</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
              <p>Core version: {health?.core?.version || '-'}</p>
              <p>Core status: {health?.core?.status || '-'}</p>
              <p>Last check: {formatDate(health?.timestamp)}</p>
              <p>Core error: {health?.core?.error || '-'}</p>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Logs / Audit / Event Stream</h2>
          <p className="mt-2 text-sm text-slate-400">Latest events to close the loop between alerting and agent actions.</p>
          <div className="mt-4 space-y-3">
            {(audit?.items || []).map((item) => (
              <div key={`${item.id}-${item.created_at}`} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-100">{item.gate_result || '-'}</p>
                  <p>{formatDate(item.created_at)}</p>
                </div>
                <p className="mt-1">Entropy: {typeof item.entropy === 'number' ? item.entropy.toFixed(4) : '-'}</p>
                <p className="mt-1 break-all text-slate-400">State hash: {item.state_hash || '-'}</p>
              </div>
            ))}
            {audit?.items?.length === 0 ? <p className="text-sm text-slate-400">No audit events found.</p> : null}
            {!audit?.items?.length && warnings.some((warning) => warning === 'Audit unavailable in internal mode.') ? (
              <p className="text-sm text-amber-300">Audit unavailable in internal mode.</p>
            ) : null}
          </div>
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            Active alerts: {alerts.length}
          </div>
        </section>
      </div>
    </main>
  );
}
