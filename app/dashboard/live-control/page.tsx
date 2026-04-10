'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type HealthPayload = {
  ok?: boolean;
  service?: string;
  timestamp?: string;
  core_ok?: boolean;
  db_ok?: boolean;
  error?: string | null;
  core?: {
    ok?: boolean;
    status?: string | null;
    version?: string | null;
    timestamp?: string | null;
    error?: string | null;
  };
};

type UsagePayload = {
  plan?: string;
  subscription_status?: string;
  billing_period?: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  trial_end?: string | null;
  executions?: number;
  included_executions?: number;
  overage_executions?: number;
  projected_amount_usd?: number;
};

type Execution = {
  id: string;
  org_id?: string;
  agent_id: string;
  decision: 'ALLOW' | 'STABILIZE' | 'BLOCK' | string;
  latency_ms: number;
  policy_version: string | null;
  reason: string | null;
  created_at: string;
};

type IntegrationPayload = {
  ok?: boolean;
  service?: string;
  timestamp?: string;
  verified_formal_core?: unknown;
  source_of_truth?: unknown;
  integration_status?: {
    control_plane_ready?: boolean;
    core_health_ok?: boolean;
  };
  known_gaps?: unknown;
};

type AuditItem = {
  id?: number;
  gate_result?: string;
  entropy?: number;
  created_at?: string;
  state_hash?: string;
  sequence?: number;
  region_id?: string;
};

type AuditPayload = {
  ok?: boolean;
  error?: string | null;
  items?: AuditItem[];
};

type DashboardState = {
  health: HealthPayload | null;
  usage: UsagePayload | null;
  executions: Execution[];
  integration: IntegrationPayload | null;
  audit: AuditPayload | null;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatMoney(value?: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function decisionTone(decision?: string) {
  const normalized = String(decision || '').toUpperCase();
  if (normalized === 'ALLOW') return 'text-[#00fe66] border-[#00fe66]/30 bg-[#00fe66]/10';
  if (normalized === 'STABILIZE') return 'text-[#81ecff] border-[#81ecff]/30 bg-[#81ecff]/10';
  if (normalized === 'BLOCK' || normalized === 'FREEZE') return 'text-[#ff6e85] border-[#ff6e85]/30 bg-[#ff6e85]/10';
  return 'text-slate-200 border-slate-700 bg-slate-800/60';
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || `Request failed: ${url}`);
  }
  return json as T;
}

export default function LiveControlPage() {
  const [data, setData] = useState<DashboardState>({
    health: null,
    usage: null,
    executions: [],
    integration: null,
    audit: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setError('');

    try {
      const results = await Promise.allSettled([
        fetchJson<HealthPayload>('/api/health'),
        fetchJson<UsagePayload>('/api/usage'),
        fetchJson<{ executions?: Execution[] }>('/api/executions?limit=8'),
        fetchJson<IntegrationPayload>('/api/integration'),
        fetchJson<AuditPayload>('/api/audit?limit=8'),
      ]);

      const [healthRes, usageRes, executionsRes, integrationRes, auditRes] = results;
      const warnings: string[] = [];

      setData({
        health: healthRes.status === 'fulfilled' ? healthRes.value : null,
        usage: usageRes.status === 'fulfilled' ? usageRes.value : null,
        executions:
          executionsRes.status === 'fulfilled' ? executionsRes.value.executions || [] : [],
        integration: integrationRes.status === 'fulfilled' ? integrationRes.value : null,
        audit: auditRes.status === 'fulfilled' ? auditRes.value : null,
      });

      if (healthRes.status === 'rejected') warnings.push(healthRes.reason?.message || 'health failed');
      if (usageRes.status === 'rejected') warnings.push(usageRes.reason?.message || 'usage failed');
      if (executionsRes.status === 'rejected') warnings.push(executionsRes.reason?.message || 'executions failed');
      if (integrationRes.status === 'rejected') warnings.push(integrationRes.reason?.message || 'integration failed');
      if (auditRes.status === 'rejected') warnings.push(auditRes.reason?.message || 'audit failed');

      if (warnings.length > 0) {
        setError(warnings.join(' | '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live control page');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const uptimeLabel = useMemo(() => {
    if (!data.health) return 'CHECKING';
    if (data.health.ok && data.health.core_ok && data.health.db_ok) return 'LIVE';
    if (data.health.core_ok || data.health.db_ok) return 'DEGRADED';
    return 'DOWN';
  }, [data.health]);

  const integrityScore = useMemo(() => {
    let score = 0;
    if (data.health?.core_ok) score += 35;
    if (data.health?.db_ok) score += 25;
    if ((data.integration?.integration_status?.control_plane_ready ?? false)) score += 20;
    if ((data.usage?.overage_executions ?? 0) === 0) score += 10;
    if ((data.audit?.items?.length ?? 0) > 0) score += 10;
    return Math.min(score, 100);
  }, [data.health, data.integration, data.usage, data.audit]);

  const alertCount = useMemo(() => {
    return (data.audit?.items || []).filter((item) => {
      const gate = String(item.gate_result || '').toUpperCase();
      return gate === 'BLOCK' || gate === 'FREEZE';
    }).length;
  }, [data.audit]);

  return (
    <main className="min-h-screen bg-[#0d0e11] text-[#f7f6f9]">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-cyan-400/20 bg-[#0d0e11] px-6 shadow-[0_0_8px_rgba(0,229,255,0.15)]">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xl font-bold tracking-tight text-[#00E5FF]">DSG ONE</span>
          <span className="hidden text-xs uppercase tracking-[0.3em] text-[#00fe66] md:inline-block">
            Live Control Plane
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="border border-slate-700 px-3 py-2 font-mono text-xs uppercase tracking-wider text-slate-200 hover:border-[#81ecff]">
            Dashboard
          </Link>
          <Link href="/dashboard/command-center" className="border border-slate-700 px-3 py-2 font-mono text-xs uppercase tracking-wider text-slate-200 hover:border-[#81ecff]">
            Command Center
          </Link>
          <button
            type="button"
            onClick={() => void load('refresh')}
            disabled={refreshing}
            className="bg-[#81ecff] px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 pb-12 pt-8">
        {error ? (
          <div className="mb-6 border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <section className="relative overflow-hidden bg-[#1e2023] p-8 md:col-span-8">
            <div className="relative z-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-mono text-xs uppercase tracking-[0.3em] text-[#00E5FF]">
                    Production Health Matrix
                  </h1>
                  <p className="mt-3 text-3xl font-bold uppercase tracking-tight text-[#81ecff]">
                    Real Runtime Visibility
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    Wired to live repo APIs for health, usage, executions, integration, and audit.
                  </p>
                </div>
                <span className="border border-[#00fe66]/30 bg-[#00fe66]/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-[#00fe66]">
                  {uptimeLabel}
                </span>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Core" value={data.health?.core_ok ? 'ONLINE' : loading ? '…' : 'OFFLINE'} accent="border-[#00E5FF]" sublabel={data.health?.core?.status || 'runtime status'} />
                <MetricCard label="Database" value={data.health?.db_ok ? 'OK' : loading ? '…' : 'DOWN'} accent="border-[#00E5FF]" sublabel={data.health?.service || 'service'} />
                <MetricCard label="Executions" value={String(data.usage?.executions ?? data.executions.length ?? 0)} accent="border-[#ff6e85]" sublabel={data.usage?.billing_period || 'billing period'} />
                <MetricCard label="Projected Billing" value={formatMoney(data.usage?.projected_amount_usd)} accent="border-[#00E5FF]" sublabel={data.usage?.plan || 'plan'} />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,227,253,0.18),transparent_60%)]" />
          </section>

          <section className="bg-[#181a1d] p-6 md:col-span-4">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-[#81ecff]">Production Integrity</h2>
            <div className="mt-4 space-y-3">
              <ScoreRow label="Control Plane Ready" value={data.integration?.integration_status?.control_plane_ready ? 'YES' : loading ? '…' : 'NO'} tone="green" />
              <ScoreRow label="Core Health" value={data.integration?.integration_status?.core_health_ok ? 'PASS' : loading ? '…' : 'FAIL'} tone={data.integration?.integration_status?.core_health_ok ? 'green' : 'red'} />
              <ScoreRow label="Security Alerts" value={String(alertCount)} tone={alertCount === 0 ? 'green' : 'red'} />
            </div>

            <div className="mt-8 border-t border-slate-700/50 pt-4">
              <div className="flex items-end justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-slate-400">Integrity Score</span>
                <span className="font-mono text-xl text-[#81ecff]">{integrityScore}%</span>
              </div>
              <div className="mt-3 h-1 w-full bg-slate-800">
                <div className="h-full bg-[#81ecff]" style={{ width: `${integrityScore}%` }} />
              </div>
            </div>
          </section>

          <section className="border border-slate-800 bg-black/30 p-6 md:col-span-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-[#81ecff]">Live Execution Loops</h2>
                <p className="mt-2 text-sm text-slate-400">Recent executions and audit stream from real endpoints.</p>
              </div>
              <div className="flex gap-2">
                <Link href="/dashboard/executions" className="border border-slate-700 px-3 py-2 font-mono text-xs uppercase tracking-wider text-slate-200 hover:border-[#81ecff]">
                  Open Executions
                </Link>
                <Link href="/dashboard/audit" className="border border-slate-700 px-3 py-2 font-mono text-xs uppercase tracking-wider text-slate-200 hover:border-[#81ecff]">
                  Open Audit
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-slate-400">Executions</p>
                <div className="space-y-2">
                  {loading ? <EmptyBlock label="Loading executions…" /> : null}
                  {!loading && data.executions.length === 0 ? <EmptyBlock label="No executions found" /> : null}
                  {data.executions.map((execution) => (
                    <div key={execution.id} className={`border p-3 text-sm ${decisionTone(execution.decision)}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold uppercase">{execution.decision}</p>
                        <span className="font-mono text-xs">{execution.latency_ms} ms</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300">Agent: {execution.agent_id}</p>
                      <p className="mt-1 text-xs text-slate-400">{execution.reason || '-'}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(execution.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-slate-400">Audit Feed</p>
                <div className="space-y-2">
                  {loading ? <EmptyBlock label="Loading audit…" /> : null}
                  {!loading && (data.audit?.items?.length ?? 0) === 0 ? <EmptyBlock label={data.audit?.error || 'No audit events found'} /> : null}
                  {(data.audit?.items || []).map((item, index) => (
                    <div key={`${item.id || index}-${item.created_at || index}`} className={`border p-3 text-sm ${decisionTone(item.gate_result)}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold uppercase">{item.gate_result || 'UNKNOWN'}</p>
                        <span className="font-mono text-xs">SEQ {item.sequence ?? '-'}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300">Region: {item.region_id || '-'}</p>
                      <p className="mt-1 text-xs text-slate-400">Entropy: {typeof item.entropy === 'number' ? item.entropy.toFixed(4) : '-'}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">State hash: {item.state_hash || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value, sublabel, accent }: { label: string; value: string; sublabel: string; accent: string }) {
  return (
    <div className={`border-l-2 bg-[#121316] p-4 ${accent}`}>
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-2xl">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">{sublabel}</p>
    </div>
  );
}

function ScoreRow({ label, value, tone }: { label: string; value: string; tone: 'green' | 'red' }) {
  const border = tone === 'green' ? 'border-[#00fe66]' : 'border-[#ff6e85]';
  const text = tone === 'green' ? 'text-[#00fe66]' : 'text-[#ff6e85]';
  return (
    <div className={`flex items-center justify-between border-l-4 bg-[#121316] p-4 ${border}`}>
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`font-mono text-lg ${text}`}>{value}</p>
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return <div className="border border-slate-800 bg-[#121316] p-4 text-sm text-slate-500">{label}</div>;
}
