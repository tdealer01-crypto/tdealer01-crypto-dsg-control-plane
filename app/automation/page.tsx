'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ActionPathGraph } from '../../components/ActionPathGraph';
import { ConstraintChecklist } from '../../components/ConstraintChecklist';
import { EvidenceDrawer } from '../../components/EvidenceDrawer';
import { GateResultCard } from '../../components/GateResultCard';
import type { GateStatus } from '../../components/StatusBadge';

type DomainOption = 'ai_agent' | 'workflow_automation' | 'finance_action' | 'deployment_action' | 'connector_api_call';
type RiskOption = 'low' | 'medium' | 'high' | 'critical';
type ModeOption = 'monitor' | 'gateway' | 'dry_run';

const domainLabels: Record<DomainOption, string> = {
  ai_agent: 'AI agent',
  workflow_automation: 'workflow automation',
  finance_action: 'finance action',
  deployment_action: 'deployment action',
  connector_api_call: 'connector/API call',
};

const modeLabels: Record<ModeOption, string> = {
  monitor: 'Monitor Mode',
  gateway: 'Gateway Mode',
  dry_run: 'Dry Run',
};

function deriveGateStatus(risk: RiskOption, mode: ModeOption): GateStatus {
  if (mode === 'gateway' && risk === 'critical') return 'UNSUPPORTED';
  return 'REVIEW';
}

export default function AutomationPage() {
  const [goal, setGoal] = useState('Deploy AI agent to production with customer-data access');
  const [domain, setDomain] = useState<DomainOption>('deployment_action');
  const [plannerResult, setPlannerResult] = useState<any>(null);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [risk, setRisk] = useState<RiskOption>('high');
  const [mode, setMode] = useState<ModeOption>('dry_run');


  async function generatePlan() {
    setPlannerLoading(true);
    try {
      const response = await fetch('/api/dsg/v1/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, domain, riskLevel: risk, mode }),
      });
      const json = await response.json();
      setPlannerResult(json);
    } finally {
      setPlannerLoading(false);
    }
  }

  const gateStatus = useMemo(() => deriveGateStatus(risk, mode), [risk, mode]);
  const requiredApproval = risk === 'high' || risk === 'critical' || domain === 'deployment_action';

  const requestPreview = useMemo(() => {
    const nonce = 'draft-nonce-auto-mode';
    const idempotencyKey = 'draft-idempotency-auto-mode';
    return {
      actionId: 'act-auto-mode-draft-001',
      actionType: domain,
      actor: { userId: 'user-1', role: 'operator', workspaceId: 'org-1' },
      resource: {
        type: domain === 'deployment_action' ? 'deployment_pipeline' : 'workflow',
        id: 'resource-1',
        classification: risk === 'critical' ? 'top_secret' : risk === 'high' ? 'secret' : risk === 'medium' ? 'internal' : 'public',
      },
      connector: { id: 'connector-1', name: 'deployment pipeline', riskLevel: risk },
      evidence: [{ id: 'ev-1', title: 'Repo evidence', state: 'REPO_STATED' }],
      context: {
        requirement_clear: goal.trim().length > 10,
        tool_available: true,
        permission_granted: true,
        secret_bound: false,
        dependency_resolved: true,
        testable: true,
        audit_hook_available: true,
        approval_available: !requiredApproval,
      },
      nonce,
      idempotencyKey,
    };
  }, [domain, goal, requiredApproval, risk]);

  return (
    <main className="min-h-screen bg-[#07080a] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_12%,rgba(245,197,92,0.16),transparent_28%),linear-gradient(180deg,#090a0d_0%,#07080a_100%)]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">DSG ONE Auto Mode</p>
          <h1 className="mt-7 max-w-5xl text-5xl font-bold leading-tight md:text-7xl">Auto Mode for governed AI actions</h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">Describe the action you want. DSG ONE turns it into a governed plan, maps policy/evidence/approval, and evaluates the deterministic gate scaffold before execution.</p>
          <p className="mt-4 max-w-4xl rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">Hard boundary: this page is draft UI for planning/evaluation and does not execute real actions or prove production-readiness by itself.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button onClick={generatePlan} className="rounded-2xl bg-amber-300 px-6 py-4 font-semibold text-slate-950 hover:bg-amber-200">{plannerLoading ? 'Generating...' : 'Generate governed plan'}</button>
            <button className="rounded-2xl border border-white/15 bg-white/[0.03] px-6 py-4 font-semibold text-slate-100 hover:border-amber-300/30">View gate evidence</button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-12 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-2xl font-semibold">Goal input</h2>
          <p className="mt-2 text-sm text-slate-300">Sample/draft input state for Auto Mode generation.</p>
          <label className="mt-6 block text-sm font-medium">Goal</label>
          <textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-2 h-28 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm" />

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm">Action domain
              <select value={domain} onChange={(event) => setDomain(event.target.value as DomainOption)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 p-2">
                {Object.entries(domainLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-sm">Risk level
              <select value={risk} onChange={(event) => setRisk(event.target.value as RiskOption)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 p-2">
                {(['low', 'medium', 'high', 'critical'] as RiskOption[]).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm">Mode
              <select value={mode} onChange={(event) => setMode(event.target.value as ModeOption)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 p-2">
                {Object.entries(modeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-semibold">Generated plan</h2>
            <span className="rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-xs text-amber-100">Generated draft — not executed</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            <li><strong>requested action:</strong> {plannerResult?.plan?.requestedAction || domain}</li>
            <li><strong>actor:</strong> operator / workspace org-1</li>
            <li><strong>resource:</strong> {requestPreview.resource.type} ({requestPreview.resource.classification})</li>
            <li><strong>policyVersion:</strong> {plannerResult?.plan?.policyVersion || '1.0'} (draft mapping)</li>
            <li><strong>required approval:</strong> {plannerResult?.plan?.requiredApproval || (requiredApproval ? 'required' : 'not required')}</li>
            <li><strong>required evidence:</strong> policyVersion, inputHash, replayProtection</li>
            <li><strong>connector dependency:</strong> {plannerResult?.plan?.connectorDependency || 'deployment pipeline'}</li>
            <li><strong>risk reason:</strong> {plannerResult?.plan?.riskReason || `${risk} risk selected for ${domainLabels[domain]}`}</li>
            <li><strong>planner source:</strong> {plannerResult?.source || 'not_generated'}</li>
            <li><strong>mode:</strong> {modeLabels[mode]}</li>
          </ul>
        </article>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-8">
        <ActionPathGraph
          actor={{ id: 'actor-1', title: 'operator:user-1', subtitle: 'workspace org-1' }}
          action={{ id: 'action-1', title: domain, subtitle: goal }}
          policies={[{ id: 'p1', title: 'policy version', subtitle: '1.0' }, { id: 'p2', title: 'approval gate', subtitle: requiredApproval ? 'required' : 'optional' }]}
          gateResult={gateStatus}
          finalDecision={gateStatus === 'UNSUPPORTED' ? 'UNSUPPORTED — connector/policy path incomplete' : 'REVIEW — approval required before execution'}
          demoLabel="sample/draft"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <GateResultCard
              status={gateStatus}
              summary={gateStatus === 'UNSUPPORTED' ? 'UNSUPPORTED — backend wiring or connector capability is incomplete for this path.' : 'REVIEW — approval required before execution.'}
              reason={gateStatus === 'UNSUPPORTED' ? 'connector_or_policy_capability_unavailable' : 'required_approval_not_available'}
              nextReviewerOrAction="Security/ops approver"
              ruleRefs={['dsg.automation.controller', 'static_check gate scaffold']}
              demoLabel="sample/draft"
            />
          </div>
          <EvidenceDrawer
            title="Evidence drawer"
            demoLabel="sample/draft"
            fields={[
              { key: 'policyVersion', label: 'policyVersion', availability: 'present', detail: 'Mapped from deterministic policy scaffold.' },
              { key: 'inputHash', label: 'inputHash', availability: 'planned', detail: 'Present only after evaluation response.' },
              { key: 'constraintSetHash', label: 'constraintSetHash', availability: 'planned', detail: 'Present only after evaluation response.' },
              { key: 'proofHash', label: 'proofHash', availability: 'missing', detail: 'Missing until /evaluate is called.' },
              { key: 'nonce', label: 'replayProtection.nonce', availability: 'present', detail: requestPreview.nonce },
              { key: 'idempotencyKey', label: 'idempotencyKey', availability: 'present', detail: requestPreview.idempotencyKey },
              { key: 'requestHash', label: 'requestHash', availability: 'planned', detail: 'Derived after request evaluation.' },
              { key: 'export', label: 'evidence export', availability: 'unsupported', detail: 'Export pack button is UI-only in this draft page.' },
            ]}
          />
        </div>

        <ConstraintChecklist
          demoLabel="sample/draft"
          items={[
            { id: 'requirement', label: 'requirement clear', detail: 'Goal text is explicit and testable.', state: goal.trim().length > 10 ? 'pass' : 'review' },
            { id: 'tool', label: 'tool available', detail: 'Controller endpoint exists for evaluation.', state: 'pass' },
            { id: 'permission', label: 'permission granted', detail: 'Draft actor permission context supplied.', state: 'pass' },
            { id: 'secret', label: 'secret bound', detail: 'Secret binding still required for this sample.', state: 'fail' },
            { id: 'dependency', label: 'dependency resolved', detail: 'Connector dependency mapped to deployment pipeline.', state: 'pass' },
            { id: 'testable', label: 'testable', detail: 'Draft request preview can be submitted to evaluate endpoint.', state: 'pass' },
            { id: 'audit', label: 'audit hook available', detail: 'Audit hook field included in request context.', state: 'pass' },
            { id: 'replay', label: 'replay protection present', detail: 'Nonce + idempotency key included.', state: 'pass' },
          ]}
        />
      </section>

      <section className="border-y border-white/10 bg-[#0b0d10]">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-12 lg:grid-cols-2">
          <article>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Controller request preview</p>
            <h3 className="mt-4 text-3xl font-semibold">POST /api/dsg/v1/controller/evaluate</h3>
            <p className="mt-4 text-sm text-slate-300">JSON preview generated from current user selections. This is sample/draft state unless explicitly evaluated.</p>
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-slate-200"><code>{JSON.stringify(requestPreview, null, 2)}</code></pre>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="text-2xl font-semibold">Decision boundary</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li><strong>Dry Run:</strong> no execution, evaluation-only behavior.</li>
              <li><strong>Monitor Mode:</strong> customer runtime executes; DSG records decision/evidence.</li>
              <li><strong>Gateway Mode:</strong> DSG-controlled executor required before execution.</li>
              <li>This page does not prove production readiness by itself.</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/" className="rounded-xl border border-white/15 px-4 py-2 text-sm">Open Dashboard</Link>
              <Link href="/enterprise-proof/demo" className="rounded-xl border border-white/15 px-4 py-2 text-sm">Open Evidence Pack</Link>
              <Link href="/docs" className="rounded-xl border border-white/15 px-4 py-2 text-sm">Read Docs</Link>
              <Link href="/policies" className="rounded-xl border border-white/15 px-4 py-2 text-sm">Review Policies</Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
