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
  period: string;
};

type UsagePayload = {
  summary?: {
    billing_period?: string;
    execution_count?: number;
    monthly_executions?: number;
    subscription?: {
      plan?: string;
      status?: string;
    } | null;
  };
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

type MonitorHistoryPayload = {
  snapshot_history?: Array<{
    id?: number;
    snapshot_at?: string;
    readiness_status?: string;
    readiness_score?: number;
    determinism_ok?: boolean;
    alerts_count?: number;
  }>;
  readiness_history?: Array<{
    id?: number;
    recorded_at?: string;
    status?: string;
    score?: number;
    reason_codes?: string[];
  }>;
  alert_persistence?: {
    total_recent?: number;
    open_recent?: number;
    critical_open?: number;
    items?: Array<{
      id?: number;
      code?: string;
      level?: string;
      status?: string;
      message?: string;
      occurrence_count?: number;
      last_seen_at?: string;
    }>;
  };
  trends?: Array<{
    timestamp: string;
    utilization: number;
    alerts_count: number;
    block_rate: number;
    avg_latency_ms: number;
    requests_count: number;
  }>;
  forecast?: {
    next_hour_utilization?: number | null;
    next_hour_alerts?: number | null;
    slope_utilization_per_hour?: number;
    slope_alerts_per_hour?: number;
  };
  governance_proof?: {
    concept_to_runtime?: {
      determinism?: { runtime_signal?: boolean | null; evidence_table?: string };
      auditability?: { runtime_signal?: number | null; evidence_table?: string };
      zero_trust?: { runtime_signal?: boolean | null; evidence_table?: string };
      formal_reasoning?: { runtime_signal?: boolean | null; evidence_table?: string };
    };
    narrative?: string[];
  };
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
  const [monitor, setMonitor] = useState<MonitorHistoryPayload | null>(null);
  const [command, setCommand] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    Promise.all([
      fetch('/api/health', { cache: 'no-store' }).then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
      fetch('/api/capacity', { cache: 'no-store' }).then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
      fetch('/api/usage', { cache: 'no-store' }).then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
      fetch('/api/audit?limit=8', { cache: 'no-store' }).then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
      fetch('/api/monitor/history', { cache: 'no-store' }).then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
    ])
      .then(([healthRes, capacityRes, usageRes, auditRes, monitorRes]) => {
        if (!alive) return;

        if (!healthRes.ok) throw new Error(healthRes.json.error || 'Failed to load health');
        if (!capacityRes.ok) throw new Error(capacityRes.json.error || 'Failed to load capacity');
        if (!usageRes.ok) throw new Error(usageRes.json.error || 'Failed to load usage');
        if (!auditRes.ok) throw new Error(auditRes.json.error || 'Failed to load audit');
        if (!monitorRes.ok) throw new Error(monitorRes.json.error || 'Failed to load monitor history');

        setHealth(healthRes.json);
        setCapacity(capacityRes.json);
        setUsage(usageRes.json);
        setAudit(auditRes.json);
        setMonitor(monitorRes.json);
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
              <p className="text-2xl font-semibold">{capacity?.period || usage?.summary?.billing_period || '-'}</p>
            </div>
          </div>
        </header>

        {error ? <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Chat / Agent Console</h2>
            <p className="mt-2 text-sm text-slate-400">Use this pane for command prompts, summaries, and action planning.</p>
            <label className="mt-4 block text-sm text-slate-300">Command</label>
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. triage latest BLOCK alerts and summarize root cause"
              className="mt-2 h-28 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none ring-emerald-400 focus:ring-1"
            />
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="font-semibold text-slate-200">Suggested Actions</p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-300">
                {suggestedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
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
                <p className="mt-1 text-2xl font-semibold">{usage?.summary?.subscription?.plan || '-'}</p>
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
          </div>
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            Active alerts: {alerts.length}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Snapshot History / Readiness History</h2>
            <p className="mt-2 text-sm text-slate-400">Persistent monitor snapshots and readiness transitions for governance replay.</p>
            <div className="mt-4 space-y-3 text-sm">
              {(monitor?.snapshot_history || []).slice(0, 6).map((item) => (
                <div key={`snapshot-${item.id}`} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-slate-300">
                  <p className="font-semibold text-slate-100">{(item.readiness_status || 'unknown').toUpperCase()} • Score {item.readiness_score ?? 0}</p>
                  <p>Determinism ok: {String(item.determinism_ok ?? '-')}</p>
                  <p>Alerts: {item.alerts_count ?? 0}</p>
                  <p>At: {formatDate(item.snapshot_at)}</p>
                </div>
              ))}
              {(monitor?.snapshot_history || []).length === 0 ? <p className="text-slate-400">No snapshot history found.</p> : null}
            </div>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
              <p className="font-semibold text-slate-100">Readiness transitions</p>
              <ul className="mt-2 space-y-2">
                {(monitor?.readiness_history || []).slice(0, 6).map((item) => (
                  <li key={`readiness-${item.id}`}>
                    {formatDate(item.recorded_at)} — {(item.status || 'unknown').toUpperCase()} ({item.score ?? 0})
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Alert Persistence / Trend / Forecast</h2>
            <p className="mt-2 text-sm text-slate-400">Open alerts survive sessions; trend and forecast summarize near-term risk.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs text-slate-400">Recent Alerts</p>
                <p className="text-xl font-semibold">{monitor?.alert_persistence?.total_recent ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs text-slate-400">Open Alerts</p>
                <p className="text-xl font-semibold">{monitor?.alert_persistence?.open_recent ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs text-slate-400">Critical Open</p>
                <p className="text-xl font-semibold">{monitor?.alert_persistence?.critical_open ?? 0}</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
              <p>Forecast next-hour utilization: {monitor?.forecast?.next_hour_utilization ?? '-'}</p>
              <p>Forecast next-hour alerts: {monitor?.forecast?.next_hour_alerts ?? '-'}</p>
              <p>Utilization slope/hour: {monitor?.forecast?.slope_utilization_per_hour ?? 0}</p>
              <p>Alert slope/hour: {monitor?.forecast?.slope_alerts_per_hour ?? 0}</p>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              {(monitor?.trends || []).slice(0, 6).map((item, idx) => (
                <div key={`trend-${idx}`} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <p>{formatDate(item.timestamp)}</p>
                  <p>Requests: {item.requests_count} • Utilization: {Math.round(item.utilization * 100)}% • Alerts: {item.alerts_count}</p>
                  <p>Block rate: {Math.round(item.block_rate * 100)}% • Avg latency: {item.avg_latency_ms.toFixed(2)}ms</p>
                </div>
              ))}
              {(monitor?.trends || []).length === 0 ? <p className="text-slate-400">No trend points found.</p> : null}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Governance Proof (Concept → Runtime)</h2>
          <p className="mt-2 text-sm text-slate-400">Narrative bridge for determinism, auditability, zero-trust, and formal reasoning.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="font-semibold text-slate-100">Determinism</p>
              <p>Runtime signal: {String(monitor?.governance_proof?.concept_to_runtime?.determinism?.runtime_signal ?? '-')}</p>
              <p className="text-slate-400">Evidence: {monitor?.governance_proof?.concept_to_runtime?.determinism?.evidence_table || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="font-semibold text-slate-100">Auditability</p>
              <p>Runtime signal: {String(monitor?.governance_proof?.concept_to_runtime?.auditability?.runtime_signal ?? '-')}</p>
              <p className="text-slate-400">Evidence: {monitor?.governance_proof?.concept_to_runtime?.auditability?.evidence_table || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="font-semibold text-slate-100">Zero-Trust</p>
              <p>Runtime signal: {String(monitor?.governance_proof?.concept_to_runtime?.zero_trust?.runtime_signal ?? '-')}</p>
              <p className="text-slate-400">Evidence: {monitor?.governance_proof?.concept_to_runtime?.zero_trust?.evidence_table || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="font-semibold text-slate-100">Formal Reasoning</p>
              <p>Runtime signal: {String(monitor?.governance_proof?.concept_to_runtime?.formal_reasoning?.runtime_signal ?? '-')}</p>
              <p className="text-slate-400">Evidence: {monitor?.governance_proof?.concept_to_runtime?.formal_reasoning?.evidence_table || '-'}</p>
            </div>
          </div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-300">
            {(monitor?.governance_proof?.narrative || []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
