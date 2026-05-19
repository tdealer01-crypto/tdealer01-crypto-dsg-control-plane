'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState, EvidenceRow, MetricTile, RuntimeWorkflowPage, WorkflowPanel } from '../_components/runtime-workflow';
import { UserJourneyFlow } from '../../../components/UserJourneyFlow';

type VerificationState = {
  executionCount: number;
  auditCount: number;
  deterministicCount: number;
  freezeCount: number;
  healthOk: boolean | null;
  loading: boolean;
  error: string;
};

const verificationSteps = [
  {
    label: '1',
    title: 'Collect evidence',
    body: 'Aggregate executions, checkpoints, policies, and audit events from the live runtime before summarising status',
  },
  {
    label: '2',
    title: 'Verify chain',
    body: 'Verify the ledger sequence, truth state, and checkpoint hash for completeness and continuity',
  },
  {
    label: '3',
    title: 'Review exceptions',
    body: 'Surface warnings and failures so users know whether to fix policy, runtime, or environment',
  },
  {
    label: '4',
    title: 'Package proof',
    body: 'Package evidence for customers, audits, Marketplace, or Cloud Run smoke evidence',
  },
];

export default function VerificationPage() {
  const [state, setState] = useState<VerificationState>({
    executionCount: 0,
    auditCount: 0,
    deterministicCount: 0,
    freezeCount: 0,
    healthOk: null,
    loading: true,
    error: '',
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const [auditRes, execRes, healthRes] = await Promise.allSettled([
          fetch('/api/audit?limit=100', { cache: 'no-store' }),
          fetch('/api/executions?limit=100', { cache: 'no-store' }),
          fetch('/api/health', { cache: 'no-store' }),
        ]);

        if (!alive) return;

        let auditCount = 0;
        let deterministicCount = 0;
        let freezeCount = 0;
        if (auditRes.status === 'fulfilled' && auditRes.value.ok) {
          const json = await auditRes.value.json().catch(() => ({}));
          auditCount = (json.items ?? []).length;
          deterministicCount = (json.determinism ?? []).filter(
            (d: { ok: boolean; data?: { deterministic: boolean } }) => d.ok && d.data?.deterministic,
          ).length;
          freezeCount = (json.determinism ?? []).filter(
            (d: { ok: boolean; data?: { gate_action: string } }) => d.ok && d.data?.gate_action === 'FREEZE',
          ).length;
        }

        let executionCount = 0;
        if (execRes.status === 'fulfilled' && execRes.value.ok) {
          const json = await execRes.value.json().catch(() => ({}));
          executionCount = (json.items ?? []).length;
        }

        let healthOk: boolean | null = null;
        if (healthRes.status === 'fulfilled') {
          healthOk = healthRes.value.ok;
        }

        if (alive) {
          setState({ executionCount, auditCount, deterministicCount, freezeCount, healthOk, loading: false, error: '' });
        }
      } catch (err) {
        if (alive) {
          setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Failed to load verification data' }));
        }
      }
    }

    void load();
    return () => { alive = false; };
  }, []);

  const readiness = useMemo(() => {
    if (state.loading) return 'Loading';
    if (state.healthOk === false) return 'Degraded';
    if (state.auditCount > 0 && state.executionCount > 0 && state.freezeCount === 0) return 'Ready';
    if (state.auditCount > 0 || state.executionCount > 0) return 'Partial';
    return 'Pending';
  }, [state]);

  const readinessTone = readiness === 'Ready' ? 'green' : readiness === 'Partial' ? 'gold' : readiness === 'Degraded' ? 'red' : 'slate';

  const proofItems: Array<[string, string, 'green' | 'gold' | 'red' | 'slate' | 'blue']> = [
    ['Executions', state.loading ? '…' : `${state.executionCount} recorded`, state.executionCount > 0 ? 'green' : 'slate'],
    ['Audit events', state.loading ? '…' : `${state.auditCount} events`, state.auditCount > 0 ? 'green' : 'slate'],
    ['Deterministic sequences', state.loading ? '…' : `${state.deterministicCount} verified`, state.deterministicCount > 0 ? 'green' : 'gold'],
    ['Freeze flags', state.loading ? '…' : `${state.freezeCount} active`, state.freezeCount > 0 ? 'red' : 'green'],
    ['Runtime health', state.loading ? '…' : state.healthOk === true ? 'OK' : state.healthOk === false ? 'Degraded' : 'Unknown', state.healthOk === true ? 'green' : state.healthOk === false ? 'red' : 'slate'],
  ];

  return (
    <RuntimeWorkflowPage
      active="/dashboard/verification"
      eyebrow="DSG Evidence Verification"
      title="Verification Flow"
      description="Live view of execution count, audit chain integrity, determinism, and runtime health — the evidence needed before sharing proof with customers or compliance reviewers"
      status={state.loading ? 'Loading' : readiness}
      statusTone={readinessTone}
      actions={[
        { href: '/dashboard/live-control', label: 'Open live control', tone: 'gold' },
        { href: '/dashboard/audit', label: 'Audit trail', tone: 'slate' },
      ]}
      steps={verificationSteps}
    >
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Your journey</p>
        <UserJourneyFlow currentPath="/dashboard/audit" />
      </div>

      {state.error ? <div className="mt-6 border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">{state.error}</div> : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile label="Proof readiness" value={state.loading ? '…' : readiness} helper="Based on live executions + audit events" tone={readinessTone} />
            <MetricTile label="Executions" value={state.loading ? '…' : String(state.executionCount)} helper="Recorded in audit log" tone={state.executionCount > 0 ? 'green' : 'slate'} />
            <MetricTile label="Audit events" value={state.loading ? '…' : String(state.auditCount)} helper="Signed audit trail entries" tone={state.auditCount > 0 ? 'green' : 'slate'} />
            <MetricTile label="Freeze flags" value={state.loading ? '…' : String(state.freezeCount)} helper="Gate actions requiring review" tone={state.freezeCount > 0 ? 'red' : 'green'} />
          </div>

          <WorkflowPanel
            eyebrow="What user gets"
            title="Live evidence summary"
            body="Executions, audit events, and health checks are fetched live. Readiness shows Ready when both executions and audit events exist and no freeze flags are active."
            tone="green"
          />
        </div>

        <div className="space-y-6">
          <WorkflowPanel eyebrow="Verification checklist" title="Proof chain status">
            <div className="space-y-3">
              {proofItems.map(([label, value, tone]) => (
                <EvidenceRow key={label} label={label} value={value} tone={tone} />
              ))}
            </div>
          </WorkflowPanel>

          <WorkflowPanel eyebrow="Next action" title="What to do next">
            {readiness === 'Ready' ? (
              <div className="space-y-3">
                <EvidenceRow label="Status" value="Proof package ready" tone="green" />
                <p className="text-xs text-slate-400">Go to Audit to download the full JSON/CSV evidence package for compliance review.</p>
              </div>
            ) : (
              <EmptyState
                title={state.executionCount === 0 ? 'No executions recorded yet' : 'Audit evidence incomplete'}
                body={
                  state.executionCount === 0
                    ? 'Run the Auto Setup on the Welcome page, or call /api/try/gate to record your first execution'
                    : 'Executions found but audit chain needs more events. Run more executions or check runtime health.'
                }
                href={state.executionCount === 0 ? '/dashboard/welcome' : '/dashboard/live-control'}
                action={state.executionCount === 0 ? 'Go to setup' : 'Open live control'}
              />
            )}
          </WorkflowPanel>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/dashboard/audit" className="rounded-xl bg-amber-300 px-4 py-3 text-center text-sm font-semibold text-slate-950">
              Download proof package
            </Link>
            <Link href="/dashboard/executions" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold text-slate-100">
              Review executions
            </Link>
          </div>
        </div>
      </section>
    </RuntimeWorkflowPage>
  );
}
