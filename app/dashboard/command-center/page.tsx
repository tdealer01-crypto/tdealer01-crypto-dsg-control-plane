'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { parseSseData, formatAgentEventMessage } from '../../../lib/agent/chat-event';

type GateStatus = 'PASS' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED';
type EvidenceState = 'present' | 'missing' | 'planned' | 'unsupported';
type RuntimeStatus =
  | 'GOAL_LOCKED'
  | 'INSPECTING'
  | 'GRAPH_BUILDING'
  | 'GRAPH_READY'
  | 'PLANNING'
  | 'WAITING_APPROVAL'
  | 'RUNNING'
  | 'VERIFYING'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'RESET'
  | 'CHECKING'
  | 'DEGRADED';
type ClaimStatus = 'BUILDABLE' | 'IMPLEMENTED' | 'VERIFIED' | 'DEPLOYABLE' | 'PRODUCTION' | 'BLOCKED' | 'REVIEW' | 'UNSUPPORTED';

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

type Blocker = {
  status: GateStatus;
  reason: string;
  affected: string;
  nextAction: string;
  evidenceRequired: string;
};

type TimelineAction = {
  name: string;
  status: RuntimeStatus | GateStatus;
  actor: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence: string;
};

type EvidenceItem = {
  label: string;
  state: EvidenceState;
  detail: string;
  source: string;
};

type ClaimRow = {
  claim: ClaimStatus;
  status: GateStatus;
  reason: string;
  evidencePresent: string;
  evidenceRequired: string;
};

type ApprovalItem = {
  id: string;
  requestedAction: string;
  risk: 'HIGH' | 'CRITICAL';
  approverRole: string;
  reason: string;
  evidence: string;
  routeStatus: 'wired' | 'not_wired';
};

type OperatorControl = {
  label: string;
  status: 'wired' | 'not_wired';
  reason: string;
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
  if (normalized.includes('WARN') || normalized.includes('STABILIZE') || normalized.includes('REVIEW')) return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
}

function statusTone(status: GateStatus | RuntimeStatus | ClaimStatus | EvidenceState) {
  const normalized = status.toUpperCase();
  if (['PASS', 'PRESENT', 'GRAPH_READY', 'COMPLETED', 'VERIFIED', 'IMPLEMENTED', 'BUILDABLE'].includes(normalized)) return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
  if (['BLOCK', 'BLOCKED', 'MISSING', 'DEGRADED'].includes(normalized)) return 'border-red-400/30 bg-red-500/10 text-red-100';
  if (['REVIEW', 'PLANNED', 'WAITING_APPROVAL', 'VERIFYING', 'PLANNING', 'GRAPH_BUILDING', 'CHECKING'].includes(normalized)) return 'border-amber-300/30 bg-amber-300/10 text-amber-100';
  return 'border-slate-500/30 bg-slate-800/70 text-slate-200';
}

function StatusPill({ status }: { status: GateStatus | RuntimeStatus | ClaimStatus | EvidenceState }) {
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

const sampleBlockers: Blocker[] = [
  {
    status: 'BLOCK',
    reason: 'Production claim is blocked because production flow proof is not present on this page.',
    affected: 'production-claim-gate',
    nextAction: 'Run and attach production flow proof before claiming PRODUCTION.',
    evidenceRequired: 'deployment proof + production flow proof + auth/RBAC proof + audit/replay proof',
  },
  {
    status: 'REVIEW',
    reason: 'High-risk runtime actions require explicit human approval before execution.',
    affected: 'approval-gate',
    nextAction: 'Open approval queue and approve/reject with rationale.',
    evidenceRequired: 'approval record with actor, decision, reason, and approvalHash',
  },
  {
    status: 'UNSUPPORTED',
    reason: 'Context graph build route is a proposed route unless backend API is verified.',
    affected: 'context-graph-gate',
    nextAction: 'Implement or connect context graph API before treating graph output as live state.',
    evidenceRequired: 'graph.json + GRAPH_REPORT.md + graph hash + secret/privacy gate record',
  },
];

const graphWorkflow: TimelineAction[] = [
  { name: 'Goal lock', status: 'GOAL_LOCKED', actor: 'operator', risk: 'LOW', evidence: 'User goal frozen before planning.' },
  { name: 'Repository inspection', status: 'INSPECTING', actor: 'context agent', risk: 'MEDIUM', evidence: 'Read repo files before planning.' },
  { name: 'Privacy + secret gate', status: 'REVIEW', actor: 'policy gate', risk: 'HIGH', evidence: 'No external extraction without decision.' },
  { name: 'Context graph build', status: 'GRAPH_BUILDING', actor: 'Graphify context layer', risk: 'MEDIUM', evidence: 'graph.json / GRAPH_REPORT.md required.' },
  { name: 'Plan gate', status: 'PLANNING', actor: 'DSG planner', risk: 'HIGH', evidence: 'Plan must use graph-backed context only.' },
  { name: 'Approval gate', status: 'WAITING_APPROVAL', actor: 'approver', risk: 'HIGH', evidence: 'Approval required before runtime handoff.' },
  { name: 'Execution handoff', status: 'BLOCKED', actor: 'controlled executor', risk: 'CRITICAL', evidence: 'Blocked until Step 16 runtime evidence exists.' },
];

const proofFields: EvidenceItem[] = [
  { label: 'policyVersion', state: 'present', detail: 'Observed scaffold field: 1.0.', source: 'live deterministic gate scaffold evidence' },
  { label: 'inputHash', state: 'present', detail: 'Hash field present in scaffold response.', source: 'proof/gate scaffold' },
  { label: 'constraintSetHash', state: 'present', detail: 'Constraint set hash field present.', source: 'proof/gate scaffold' },
  { label: 'proofHash', state: 'present', detail: 'Proof hash field present.', source: 'proof/gate scaffold' },
  { label: 'structured constraint results', state: 'present', detail: 'Per-constraint result shape is present.', source: 'proof/gate scaffold' },
  { label: 'replayProtection.nonce', state: 'present', detail: 'Replay nonce field present.', source: 'replay-protection evidence' },
  { label: 'replayProtection.idempotencyKey', state: 'present', detail: 'Idempotency key field present.', source: 'replay-protection evidence' },
  { label: 'replayProtection.requestHash', state: 'present', detail: 'Request hash field present.', source: 'replay-protection evidence' },
  { label: 'external Z3 production invocation', state: 'unsupported', detail: 'Not claimed. Current solver boundary is static_check.', source: 'truth boundary' },
];

const claimRows: ClaimRow[] = [
  { claim: 'BUILDABLE', status: 'PASS', reason: 'Command Center and Graphify workflow are defined as an operator surface.', evidencePresent: 'route + UI contract', evidenceRequired: 'repo inspection and implementation plan' },
  { claim: 'IMPLEMENTED', status: 'PASS', reason: 'This route exists in code and renders live health/capacity/audit surfaces.', evidencePresent: 'app/dashboard/command-center/page.tsx', evidenceRequired: 'merged code' },
  { claim: 'VERIFIED', status: 'REVIEW', reason: 'Verification depends on test/build output and evidence manifests.', evidencePresent: 'deterministic scaffold fields are disclosed', evidenceRequired: 'test output + evidence manifest + replay proof' },
  { claim: 'DEPLOYABLE', status: 'BLOCK', reason: 'Deployment proof is not shown as present on this page.', evidencePresent: 'none on this surface', evidenceRequired: 'Vercel ready state + deployment proof + build pass' },
  { claim: 'PRODUCTION', status: 'BLOCK', reason: 'Production user-flow proof is missing.', evidencePresent: 'none on this surface', evidenceRequired: 'production flow proof + auth/RBAC proof + audit/replay/evidence proof' },
];

const approvalItems: ApprovalItem[] = [
  {
    id: 'sample-high-risk-approval',
    requestedAction: 'Runtime handoff for graph-backed implementation plan',
    risk: 'HIGH',
    approverRole: 'approver / owner',
    reason: 'High-risk code/runtime changes require human approval before controlled execution.',
    evidence: 'graph report + plan gate result + approval record required',
    routeStatus: 'not_wired',
  },
  {
    id: 'sample-production-claim-review',
    requestedAction: 'Upgrade claim from REVIEW to PRODUCTION',
    risk: 'CRITICAL',
    approverRole: 'owner + compliance reviewer',
    reason: 'Production claim requires real production-flow proof and cannot be auto-approved.',
    evidence: 'deployment proof + production flow proof + audit/replay/evidence proof required',
    routeStatus: 'not_wired',
  },
];

const operatorControls: OperatorControl[] = [
  { label: 'Pause runtime', status: 'not_wired', reason: 'Runtime control route not wired on this page.' },
  { label: 'Resume runtime', status: 'not_wired', reason: 'Runtime control route not wired on this page.' },
  { label: 'Kill runtime', status: 'not_wired', reason: 'Runtime control route not wired on this page.' },
  { label: 'Approve action', status: 'not_wired', reason: 'Approval mutation route is not invoked from this surface.' },
  { label: 'Reject action', status: 'not_wired', reason: 'Approval mutation route is not invoked from this surface.' },
  { label: 'Request changes', status: 'not_wired', reason: 'Reviewer feedback route is not wired on this page.' },
];

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

  const overallStatus = useMemo<RuntimeStatus>(() => {
    if (!health) return 'CHECKING';
    return health.core_ok ? 'GRAPH_READY' : 'DEGRADED';
  }, [health]);

  const alerts = useMemo(() => {
    const events = audit?.items || [];
    return events.filter((item) => ['BLOCK', 'FREEZE'].includes((item.gate_result || '').toUpperCase()));
  }, [audit]);

  const evidenceItems = useMemo<EvidenceItem[]>(
    () => [
      { label: 'Context graph JSON', state: 'planned', detail: 'Required by Graphify skill. Not treated as live until generated.', source: 'proposed /api/dsg/context-graph/build' },
      { label: 'GRAPH_REPORT.md', state: 'planned', detail: 'Must list inspected files, inferred edges, missing evidence, and risks.', source: 'Graphify context evidence layer' },
      { label: 'Evidence manifest', state: 'missing', detail: 'Required before upgrading claim beyond review surface.', source: 'evidence gate' },
      { label: 'Audit ledger entries', state: audit?.items?.length ? 'present' : 'missing', detail: audit?.items?.length ? `${audit.items.length} latest audit item(s) loaded.` : 'No audit items loaded for this page.', source: '/api/audit?limit=8' },
      { label: 'Replay proof', state: 'missing', detail: 'Required for VERIFIED/DEPLOYABLE claim upgrades.', source: 'replay gate' },
      { label: 'Deployment proof', state: 'missing', detail: 'Required before DEPLOYABLE claim.', source: 'deployment gate' },
      { label: 'Production flow proof', state: 'missing', detail: 'Required before PRODUCTION claim.', source: 'production claim gate' },
    ],
    [audit?.items],
  );

  const auditUnavailableInInternalMode = useMemo(() => {
    const message = (audit?.error || '').toLowerCase();
    return message.includes('internal dsg core mode');
  }, [audit?.error]);

  const suggestedActions = useMemo(() => {
    const actions: string[] = [];
    if (!health?.core_ok) actions.push('Verify DSG core connectivity and runtime credentials.');
    if ((capacity?.utilization ?? 0) > 0.8) actions.push('Reduce execution load or expand plan capacity before quota pressure becomes operational risk.');
    if (alerts.length > 0) actions.push('Review the latest BLOCK or FREEZE events before releasing more approvals.');
    actions.push('Build or attach a context graph before planning risky repository changes.');
    actions.push('Keep production claim BLOCKED until deployment and production-flow proofs exist.');
    return actions;
  }, [alerts.length, capacity?.utilization, health?.core_ok]);

  const metrics = useMemo(
    () => [
      { label: 'Runtime status', value: overallStatus, helper: health?.core?.version || 'Graph-backed review surface' },
      { label: 'Current claim', value: 'REVIEW', helper: 'Verification evidence still required' },
      { label: 'Production claim', value: 'BLOCKED', helper: 'No production flow proof on this surface' },
      { label: 'Active blockers', value: String(sampleBlockers.length + alerts.length), helper: `${alerts.length} live audit alert(s)` },
    ],
    [alerts.length, health?.core?.version, overallStatus],
  );

  const hasNoRuntimeJobs = !audit?.items?.length && (capacity?.executions ?? 0) === 0;

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
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">DSG ONE Command Center</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white md:text-5xl">Runtime control surface with Graphify context evidence.</h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Command Center shows what DSG ONE is doing, what it blocked, what needs approval, and what evidence supports each claim. The Graphify context layer reduces blind code navigation by requiring repo inspection, privacy gates, extracted/inferred edge labels, graph evidence, and claim gates before runtime execution.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <StatusPill status={overallStatus} />
              <StatusPill status="REVIEW" />
              <StatusPill status="BLOCKED" />
            </div>
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

        {hasNoRuntimeJobs ? (
          <Panel eyebrow="Empty state" title="No active runtime job found">
            <p className="text-sm leading-7 text-slate-300">No live job or audit stream is available on this page yet. Start from a safe planning surface or inspect public evidence before claiming runtime completion.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950" href="/automation">Create governed draft in Auto Mode</Link>
              <Link className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-100" href="/enterprise-proof/demo">View live gate evidence</Link>
              <Link className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-100" href="/evidence-pack">Open evidence pack</Link>
            </div>
          </Panel>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-6">
            <Panel eyebrow="Claim gate summary" title="What can be claimed now">
              <div className="space-y-3">
                <div className="border border-amber-300/20 bg-amber-300/10 p-4">
                  <div className="flex items-center justify-between gap-3"><span className="font-semibold text-amber-100">Current Claim</span><StatusPill status="REVIEW" /></div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Runtime UI and deterministic scaffold evidence exist, but VERIFIED requires current test/build evidence, evidence manifest, and replay proof.</p>
                </div>
                <div className="border border-red-400/20 bg-red-500/10 p-4">
                  <div className="flex items-center justify-between gap-3"><span className="font-semibold text-red-100">Production Claim</span><StatusPill status="BLOCKED" /></div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Production claim is blocked until real production user-flow proof, deployment proof, auth/RBAC proof, audit proof, evidence proof, and replay proof are present.</p>
                </div>
              </div>
            </Panel>

            <Panel eyebrow="Gate & blockers" title="Why execution/claims are stopped">
              <div className="mb-3 rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs leading-5 text-slate-400">Sample blocker model — replace with live job blockers when backend data is available. Sample state is not production truth.</div>
              <div className="space-y-3">
                {sampleBlockers.map((blocker) => (
                  <article key={blocker.affected} className="border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-white">{blocker.affected}</h3><StatusPill status={blocker.status} /></div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{blocker.reason}</p>
                    <p className="mt-2 text-xs text-amber-100">Next action: {blocker.nextAction}</p>
                    <p className="mt-1 text-xs text-slate-500">Evidence required: {blocker.evidenceRequired}</p>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Approval queue" title="High-risk actions need human review">
              <div className="mb-3 rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs leading-5 text-slate-400">Sample approval queue — buttons stay disabled until approval routes are wired into this page.</div>
              <div className="space-y-3">
                {approvalItems.map((item) => (
                  <article key={item.id} className="border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-white">{item.requestedAction}</h3><StatusPill status="REVIEW" /></div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.reason}</p>
                    <p className="mt-2 text-xs text-slate-500">Risk: {item.risk} · Required role: {item.approverRole}</p>
                    <p className="mt-1 text-xs text-slate-500">Evidence: {item.evidence}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['Approve', 'Reject', 'Request changes'].map((label) => (
                        <button key={label} type="button" disabled className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 disabled:cursor-not-allowed disabled:opacity-60">{label} — route not wired</button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Runtime controls" title="Control routes are explicit">
              <div className="grid gap-3 sm:grid-cols-2">
                {operatorControls.map((control) => (
                  <button key={control.label} type="button" disabled className="rounded-xl border border-slate-700 bg-black/20 p-4 text-left disabled:cursor-not-allowed disabled:opacity-70">
                    <span className="block text-sm font-semibold text-slate-200">{control.label}</span>
                    <span className="mt-2 block text-xs leading-5 text-slate-500">{control.reason}</span>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Operator next actions" title="Do the next useful thing">
              <div className="grid gap-3">
                <Link className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950" href="/automation">Open Auto Mode</Link>
                <Link className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-100" href="/evidence-pack">Export evidence pack</Link>
                <Link className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-100" href="/docs">Read deterministic gate docs</Link>
                <Link className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-100" href="/dashboard/policies">Review policies</Link>
              </div>
            </Panel>
          </div>

          <div className="grid gap-6">
            <Panel eyebrow="Graphify context evidence layer" title="Inspect → graph → plan → gate">
              <div className="grid gap-3 md:grid-cols-2">
                {graphWorkflow.map((step, index) => (
                  <div key={step.name} className="border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3"><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Step {index + 1}</p><StatusPill status={step.status} /></div>
                    <h3 className="mt-3 font-semibold text-white">{step.name}</h3>
                    <p className="mt-2 text-xs text-slate-400">Actor: {step.actor} · Risk: {step.risk}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{step.evidence}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
                Graphify-style context graphs are a context evidence layer. They do not replace tests, audits, permissions, deployment proof, or production flow proof.
              </div>
            </Panel>

            <Panel eyebrow="Evidence / audit / replay" title="Evidence availability">
              <div className="grid gap-3 md:grid-cols-2">
                {evidenceItems.map((item) => (
                  <div key={item.label} className="border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-white">{item.label}</h3><StatusPill status={item.state} /></div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
                    <p className="mt-2 text-xs text-slate-500">Source: {item.source}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Deterministic proof / gate" title="Verified scaffold fields">
              <div className="grid gap-3 md:grid-cols-3">
                {proofFields.map((item) => (
                  <div key={item.label} className="border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold text-white">{item.label}</h3><StatusPill status={item.state} /></div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{item.detail}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm leading-6 text-slate-300">Boundary: this is a deterministic TypeScript static_check scaffold. This page does not claim external Z3 production invocation.</p>
            </Panel>

            <Panel eyebrow="Live action monitor" title="Agent console and audit stream">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-white">Run diagnostics</h3>
                    <button type="button" onClick={submitCommand} disabled={chatBusy} className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300">{chatBusy ? 'Running…' : 'Run'}</button>
                  </div>
                  <textarea value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Ask readiness, audit, graph, capacity, or recovery questions..." className="mt-4 h-32 w-full border border-white/10 bg-black/30 p-4 text-sm text-slate-100 outline-none transition focus:border-amber-300/40" />
                  {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
                  <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                    {chatOutput.length === 0 ? <p className="text-sm text-slate-500">No output yet.</p> : null}
                    {chatOutput.map((line, index) => (<pre key={`${index}-${line.slice(0, 8)}`} className="overflow-x-auto border border-white/10 bg-black/20 p-3 text-xs leading-6 text-slate-200">{line}</pre>))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-white">Latest audit</h3><span className="text-xs text-slate-500">{formatDate(health?.timestamp)}</span></div>
                  <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
                    {(audit?.items || []).map((item) => (
                      <div key={`${item.id}-${item.created_at}`} className={`border p-4 ${resultTone(item.gate_result)}`}>
                        <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold uppercase tracking-[0.18em]">{item.gate_result || '-'}</p><p className="text-xs text-slate-400">{formatDate(item.created_at)}</p></div>
                        <p className="mt-3 text-xs text-slate-300">Entropy: {typeof item.entropy === 'number' ? item.entropy.toFixed(4) : '-'}</p>
                        <p className="mt-2 break-all text-xs text-slate-500">State hash: {item.state_hash || '-'}</p>
                      </div>
                    ))}
                    {auditUnavailableInInternalMode ? <p className="text-sm text-slate-500">Audit unavailable in internal mode.</p> : null}
                    {!auditUnavailableInInternalMode && audit?.items?.length === 0 ? <p className="text-sm text-slate-500">No audit events found.</p> : null}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel eyebrow="Claim gate matrix" title="Allowed claim status">
              <div className="overflow-x-auto">
                <div className="min-w-[760px] divide-y divide-white/10 border border-white/10">
                  {claimRows.map((row) => (
                    <div key={row.claim} className="grid grid-cols-[140px_130px_1fr_1fr] gap-3 p-4 text-sm">
                      <div className="font-semibold text-white">{row.claim}</div>
                      <div><StatusPill status={row.status} /></div>
                      <div className="text-slate-300">{row.reason}</div>
                      <div className="text-slate-400">Need: {row.evidenceRequired}<br />Have: {row.evidencePresent}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </section>

        <section className="border border-amber-300/25 bg-amber-300/10 p-5 text-sm leading-7 text-amber-50">
          <p className="font-semibold">Command Center boundary</p>
          <p className="mt-2">Command Center is an operator review surface. It shows live state when backend data is available and clearly labeled sample/planned state otherwise. It does not execute production actions by itself and does not prove production readiness without deployment and production-flow evidence.</p>
        </section>
      </div>
    </main>
  );
}
