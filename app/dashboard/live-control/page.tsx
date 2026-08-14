'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient as createSupabaseBrowserClient } from '../../../lib/supabase/client';
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

type IntegrationPayload = {
  ok?: boolean;
  service?: string;
  integration_status?: {
    control_plane_ready?: boolean;
    core_health_ok?: boolean;
  };
};

type DashboardKpis = {
  org_id: string;
  total_agents: number;
  configured_active_agents: number;
  executions_today: number;
  executions_this_month: number;
  allow_today: number;
  block_today: number;
  avg_latency_ms_today: number | null;
  configured_monthly_limit: number;
  latest_billing_period: string | null;
  metered_executions: number;
  metered_amount_usd: number;
  monthly_revenue_usd: number | null;
  monthly_revenue_verified: boolean;
  monthly_revenue_verification_note: string | null;
};

type AgentStatus = {
  org_id: string;
  agent_id: string;
  name: string;
  configured_status: string;
  last_used_at: string | null;
  last_execution_at: string | null;
  actions_today: number;
  actions_this_month: number;
  monthly_limit: number;
  avg_latency_ms_24h: number | null;
};

type PolicyDecision = {
  org_id: string;
  id: string;
  decision_at: string;
  agent_id: string | null;
  source: string | null;
  provider: string | null;
  policy: string | null;
  decision: string;
  latency_ms: number | null;
  proof_id: string | null;
  reason: string | null;
};

type ActivityFeedItem = {
  org_id: string;
  id: string;
  created_at: string;
  agent_id: string | null;
  agent: string | null;
  action: string | null;
  result: string | null;
  duration_ms: string | null;
  detail: string | null;
  evidence_hash: string | null;
  policy_version: string | null;
};

type LiveDataPayload = {
  ok?: boolean;
  org_id?: string;
  generated_at?: string;
  kpis?: DashboardKpis | null;
  agents?: AgentStatus[];
  decisions?: PolicyDecision[];
  activities?: ActivityFeedItem[];
};

type DashboardState = {
  health: HealthPayload | null;
  integration: IntegrationPayload | null;
  live: LiveDataPayload | null;
};

const steps = [
  { label: '1', title: 'Watch runtime', body: 'Load health and org-scoped dashboard evidence from verified Supabase views' },
  { label: '2', title: 'Choose mode', body: 'Determine whether the agent should be in Audit Only or Enforce Gate based on the current risk level' },
  { label: '3', title: 'Act safely', body: 'When BLOCK or FREEZE is encountered, go to audit/executions before deciding to change policy' },
  { label: '4', title: 'Prove result', body: 'Record runtime status to use as smoke evidence and buyer proof' },
];

const REALTIME_TABLES = ['agents', 'executions', 'audit_logs', 'usage_counters'] as const;

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return 'Not verified';
  return `$${Number(value).toFixed(2)}`;
}

function decisionTone(decision?: string): 'green' | 'blue' | 'red' | 'slate' {
  const normalized = String(decision || '').toUpperCase();
  if (normalized === 'ALLOW' || normalized === 'PASS') return 'green';
  if (normalized === 'STABILIZE' || normalized === 'REVIEW') return 'blue';
  if (normalized === 'BLOCK' || normalized === 'FREEZE') return 'red';
  return 'slate';
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || `Request failed: ${url}`);
  return json as T;
}

export default function LiveControlPage() {
  const [data, setData] = useState<DashboardState>({ health: null, integration: null, live: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setError('');

    try {
      const results = await Promise.allSettled([
        fetchJson<HealthPayload>('/api/health'),
        fetchJson<IntegrationPayload>('/api/integration'),
        fetchJson<LiveDataPayload>('/api/dashboard/live-data?limit=8'),
      ]);

      const [healthRes, integrationRes, liveRes] = results;
      const warnings: string[] = [];

      setData({
        health: healthRes.status === 'fulfilled' ? healthRes.value : null,
        integration: integrationRes.status === 'fulfilled' ? integrationRes.value : null,
        live: liveRes.status === 'fulfilled' ? liveRes.value : null,
      });

      if (healthRes.status === 'rejected') warnings.push(healthRes.reason?.message || 'health failed');
      if (integrationRes.status === 'rejected') warnings.push(integrationRes.reason?.message || 'integration failed');
      if (liveRes.status === 'rejected') warnings.push(liveRes.reason?.message || 'Supabase dashboard contract failed');
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

  useEffect(() => {
    const orgId = data.live?.org_id;
    if (!orgId) return;

    const scheduleReload = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => void load('refresh'), 250);
    };

    const polling = setInterval(scheduleReload, 30_000);
    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null;
    let channel: ReturnType<ReturnType<typeof createSupabaseBrowserClient>['channel']> | null = null;

    try {
      supabase = createSupabaseBrowserClient();
      channel = supabase.channel(`dashboard-live-${orgId}`);

      for (const table of REALTIME_TABLES) {
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `org_id=eq.${orgId}` },
          scheduleReload,
        );
      }

      channel.subscribe();
    } catch {
      // Realtime is an acceleration path only; authenticated API polling remains authoritative.
    }

    return () => {
      clearInterval(polling);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [data.live?.org_id, load]);

  const decisions = data.live?.decisions ?? [];
  const activities = data.live?.activities ?? [];
  const agents = data.live?.agents ?? [];
  const kpis = data.live?.kpis ?? null;

  const runtimeStatus = useMemo(() => {
    if (loading) return 'Checking';
    if (data.health?.ok && data.health.core_ok && data.health.db_ok && data.live?.ok) return 'Live';
    if (data.health?.core_ok || data.health?.db_ok || data.live?.ok) return 'Degraded';
    return 'Needs review';
  }, [loading, data.health, data.live?.ok]);

  const integrityScore = useMemo(() => {
    let score = 0;
    if (data.health?.core_ok) score += 30;
    if (data.health?.db_ok) score += 25;
    if (data.integration?.integration_status?.control_plane_ready) score += 20;
    if (data.live?.ok) score += 15;
    if (activities.length > 0 || decisions.length > 0) score += 10;
    return Math.min(score, 100);
  }, [data, activities.length, decisions.length]);

  const alertCount = useMemo(() => {
    return decisions.filter((item) => ['BLOCK', 'FREEZE'].includes(String(item.decision || '').toUpperCase())).length;
  }, [decisions]);

  const revenueLabel = kpis?.monthly_revenue_verified
    ? formatMoney(kpis.monthly_revenue_usd)
    : 'Not verified';

  return (
    <RuntimeWorkflowPage
      active="/dashboard/live-control"
      eyebrow="DSG Live Runtime Control"
      title="Live Control Flow"
      description="Org-scoped runtime control backed by Supabase evidence views. No sample dashboard rows are used for the live metrics below."
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
            <MetricTile label="Database" value={loading ? '…' : data.health?.db_ok ? 'OK' : 'DOWN'} helper={data.live?.ok ? 'Supabase live contract ready' : data.health?.service || 'service'} tone={data.health?.db_ok && data.live?.ok ? 'green' : 'red'} />
            <MetricTile label="Executions this month" value={loading ? '…' : String(kpis?.executions_this_month ?? 0)} helper={kpis?.latest_billing_period || 'current billing period'} tone="blue" />
            <MetricTile label="Monthly revenue" value={loading ? '…' : revenueLabel} helper={kpis?.monthly_revenue_verified ? 'verified authoritative source' : kpis?.monthly_revenue_verification_note || 'authoritative revenue source not wired'} tone={kpis?.monthly_revenue_verified ? 'green' : 'gold'} />
          </div>

          <WorkflowPanel eyebrow="Control score" title={`${integrityScore}% runtime integrity`} body="This score summarizes core, database, control-plane readiness, live dashboard evidence, and recent evidence presence." tone={integrityScore >= 80 ? 'green' : 'gold'}>
            <div className="h-2 w-full bg-black/30">
              <div className="h-full bg-amber-300" style={{ width: `${integrityScore}%` }} />
            </div>
          </WorkflowPanel>

          <WorkflowPanel eyebrow="Agent state" title={`${agents.length} agents in live contract`}>
            <div className="space-y-2">
              {agents.slice(0, 4).map((agent) => (
                <EvidenceRow
                  key={agent.agent_id}
                  label={agent.name}
                  value={`${agent.configured_status} · ${agent.actions_this_month} actions`}
                  tone={agent.configured_status === 'active' ? 'green' : 'slate'}
                />
              ))}
              {!loading && agents.length === 0 ? <EmptyState title="No agents found" body="The current organization has no agent rows exposed by dashboard_agent_status." href="/dashboard/agents" action="Open agents" /> : null}
            </div>
          </WorkflowPanel>
        </div>

        <div className="space-y-6">
          <WorkflowPanel eyebrow="Current state" title="Operator decision panel">
            <div className="space-y-3">
              <EvidenceRow label="Control plane" value={data.integration?.integration_status?.control_plane_ready ? 'READY' : loading ? '…' : 'NOT READY'} tone={data.integration?.integration_status?.control_plane_ready ? 'green' : 'red'} />
              <EvidenceRow label="Core health" value={data.integration?.integration_status?.core_health_ok ? 'PASS' : loading ? '…' : 'CHECK'} tone={data.integration?.integration_status?.core_health_ok ? 'green' : 'gold'} />
              <EvidenceRow label="Open decision alerts" value={String(alertCount)} tone={alertCount === 0 ? 'green' : 'red'} />
              <EvidenceRow label="ALLOW today" value={String(kpis?.allow_today ?? 0)} tone="green" />
              <EvidenceRow label="BLOCK today" value={String(kpis?.block_today ?? 0)} tone={(kpis?.block_today ?? 0) === 0 ? 'green' : 'red'} />
            </div>
            <button type="button" onClick={() => void load('refresh')} disabled={refreshing} className="mt-4 rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60">
              {refreshing ? 'Refreshing…' : 'Refresh runtime'}
            </button>
          </WorkflowPanel>

          <WorkflowPanel eyebrow="Recent execution loop" title="Latest policy decisions">
            <div className="space-y-2">
              {loading ? <EmptyState title="Loading runtime" body="Loading policy decisions from dashboard_policy_decisions" /> : null}
              {!loading && decisions.length === 0 ? <EmptyState title="No decisions found" body="No org-scoped policy decisions are available yet." href="/dashboard/agents" action="Open agents" /> : null}
              {decisions.slice(0, 5).map((decision) => (
                <EvidenceRow
                  key={decision.id}
                  label={decision.decision}
                  value={`${decision.latency_ms ?? 0}ms · ${formatDate(decision.decision_at)}${decision.policy ? ` · ${decision.policy}` : ''}`}
                  tone={decisionTone(decision.decision)}
                />
              ))}
            </div>
            <Link href="/dashboard/executions" className="mt-4 inline-flex rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">
              Review execution evidence
            </Link>
          </WorkflowPanel>

          <WorkflowPanel eyebrow="Audit feed" title="Latest evidence-backed activity">
            <div className="space-y-2">
              {!loading && activities.length === 0 ? <EmptyState title="No audit activity" body="No org-scoped audit_logs rows are available in dashboard_activity_feed." href="/dashboard/audit" action="Open audit" /> : null}
              {activities.slice(0, 4).map((item) => (
                <EvidenceRow
                  key={item.id}
                  label={item.result || 'EVENT'}
                  value={`${item.agent || 'system'} · ${item.action || item.detail || 'audit event'} · ${formatDate(item.created_at)}`}
                  tone={decisionTone(item.result || '')}
                />
              ))}
            </div>
            <Link href="/dashboard/audit" className="mt-4 inline-flex rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">
              Open audit evidence
            </Link>
          </WorkflowPanel>
        </div>
      </section>
    </RuntimeWorkflowPage>
  );
}
