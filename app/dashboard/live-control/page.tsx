'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState, EvidenceRow, MetricTile, RuntimeWorkflowPage, WorkflowPanel } from '../_components/runtime-workflow';

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
  executions?: number;
  included_executions?: number;
  overage_executions?: number;
  projected_amount_usd?: number;
};

type Execution = {
  id: string;
  agent_id: string;
  decision: string;
  latency_ms: number;
  policy_version: string | null;
  reason: string | null;
  created_at: string;
};

type IntegrationPayload = {
  ok?: boolean;
  service?: string;
  integration_status?: {
    control_plane_ready?: boolean;
    core_health_ok?: boolean;
  };
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

const steps = [
  { label: '1', title: 'Watch runtime', body: 'Load health, usage, executions, and audit from real endpoints simultaneously' },
  { label: '2', title: 'Choose mode', body: 'Determine whether the agent should be in Audit Only or Enforce Gate based on the current risk level' },
  { label: '3', title: 'Act safely', body: 'When BLOCK or FREEZE is encountered, go to audit/executions before deciding to change policy' },
  { label: '4', title: 'Prove result', body: 'Record runtime status to use as smoke evidence and buyer proof' },
];

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatMoney(value?: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function decisionTone(decision?: string): 'green' | 'blue' | 'red' | 'slate' {
  const normalized = String(decision || '').toUpperCase();
  if (normalized === 'ALLOW') return 'green';
  if (normalized === 'STABILIZE') return 'blue';
  if (normalized === 'BLOCK' || normalized === 'FREEZE') return 'red';
  return 'slate';
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || `Request failed: ${url}`);
  return json as T;
}

export default function LiveControlPage() {
  const [data, setData] = useState<DashboardState>({ health: null, usage: null, executions: [], integration: null, audit: null });
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
        executions: executionsRes.status === 'fulfilled' ? executionsRes.value.executions || [] : [],
        integration: integrationRes.status === 'fulfilled' ? integrationRes.value : null,
        audit: auditRes.status === 'fulfilled' ? auditRes.value : null,
      });

      if (healthRes.status === 'rejected') warnings.push(healthRes.reason?.message || 'health failed');
      if (usageRes.status === 'rejected') warnings.push(usageRes.reason?.message || 'usage failed');
      if (executionsRes.status === 'rejected') warnings.push(executionsRes.reason?.message || 'executions failed');
      if (integrationRes.status === 'rejected') warnings.push(integrationRes.reason?.message || 'integration failed');
      if (auditRes.status === 'rejected') warnings.push(auditRes.reason?.message || 'audit failed');
      if (warnings.length > 0) setError(warnings.join(' | '));
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

  const runtimeStatus = useMemo(() => {
    if (loading) return 'Checking';
    if (data.health?.ok && data.health.core_ok && data.health.db_ok) return 'Live';
    if (data.health?.core_ok || data.health?.db_ok) return 'Degraded';
    return 'Needs review';
  }, [loading, data.health]);

  const integrityScore = useMemo(() => {
    let score = 0;
    if (data.health?.core_ok) score += 35;
    if (data.health?.db_ok) score += 25;
    if (data.integration?.integration_status?.control_plane_ready) score += 20;
    if ((data.usage?.overage_executions ?? 0) === 0) score += 10;
    if ((data.audit?.items?.length ?? 0) > 0) score += 10;
    return Math.min(score, 100);
  }, [data]);

  const alertCount = useMemo(() => {
    return (data.audit?.items || []).filter((item) => ['BLOCK', 'FREEZE'].includes(String(item.gate_result || '').toUpperCase())).length;
  }, [data.audit]);

  return (
    <RuntimeWorkflowPage
      active="/dashboard/live-control"
      eyebrow="DSG Live Runtime Control"
      title="Live Control Flow"
      description="Live runtime control for real users: see the system live, see the latest decisions, know whether to audit or enforce, and navigate directly to evidence review"
      status={runtimeStatus}
      statusTone={runtimeStatus === 'Live' ? 'green' : runtimeStatus === 'Degraded' ? 'gold' : 'red'}
      actions={[{ href: '/dashboard/executions', label: 'Open executions', tone: 'gold' }, { href: '/dashboard/audit', label: 'Open audit', tone: 'slate' }]}
      steps={steps}
    >
      {error ? <div className="mt-6 border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">{error}</div> : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile label="Core" value={loading ? '…' : data.health?.core_ok ? 'ONLINE' : 'OFFLINE'} helper={data.health?.core?.status || 'runtime core'} tone={data.health?.core_ok ? 'green' : 'red'} />
            <MetricTile label="Database" value={loading ? '…' : data.health?.db_ok ? 'OK' : 'DOWN'} helper={data.health?.service || 'service'} tone={data.health?.db_ok ? 'green' : 'red'} />
            <MetricTile label="Executions" value={String(data.usage?.executions ?? data.executions.length ?? 0)} helper={data.usage?.billing_period || 'billing period'} tone="blue" />
            <MetricTile label="Projected billing" value={formatMoney(data.usage?.projected_amount_usd)} helper={data.usage?.plan || 'plan'} tone="gold" />
          </div>

          <WorkflowPanel eyebrow="Control score" title={`${integrityScore}% runtime integrity`} body="This score gives users an immediate overview of how ready core/db/control-plane/audit are before deciding to enable enforce gate" tone={integrityScore >= 80 ? 'green' : 'gold'}>
            <div className="h-2 w-full bg-black/30">
              <div className="h-full bg-amber-300" style={{ width: `${integrityScore}%` }} />
            </div>
          </WorkflowPanel>
        </div>

        <div className="space-y-6">
          <WorkflowPanel eyebrow="Current state" title="Operator decision panel">
            <div className="space-y-3">
              <EvidenceRow label="Control plane" value={data.integration?.integration_status?.control_plane_ready ? 'READY' : loading ? '…' : 'NOT READY'} tone={data.integration?.integration_status?.control_plane_ready ? 'green' : 'red'} />
              <EvidenceRow label="Core health" value={data.integration?.integration_status?.core_health_ok ? 'PASS' : loading ? '…' : 'CHECK'} tone={data.integration?.integration_status?.core_health_ok ? 'green' : 'gold'} />
              <EvidenceRow label="Open alerts" value={String(alertCount)} tone={alertCount === 0 ? 'green' : 'red'} />
            </div>
            <button type="button" onClick={() => void load('refresh')} disabled={refreshing} className="mt-4 rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60">
              {refreshing ? 'Refreshing…' : 'Refresh runtime'}
            </button>
          </WorkflowPanel>

          <WorkflowPanel eyebrow="Recent execution loop" title="Latest decisions">
            <div className="space-y-2">
              {loading ? <EmptyState title="Loading runtime" body="Loading execution and audit feed from backend" /> : null}
              {!loading && data.executions.length === 0 ? <EmptyState title="No executions found" body="No executions to review yet. Run Auto-Setup or connect an agent to create the first evidence." href="/dashboard/skills" action="Run setup" /> : null}
              {data.executions.slice(0, 5).map((execution) => (
                <EvidenceRow key={execution.id} label={execution.decision} value={`${execution.latency_ms}ms · ${formatDate(execution.created_at)}`} tone={decisionTone(execution.decision)} />
              ))}
            </div>
            <Link href="/dashboard/executions" className="mt-4 inline-flex rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">
              Review execution evidence
            </Link>
          </WorkflowPanel>
        </div>
      </section>
    </RuntimeWorkflowPage>
  );
}
