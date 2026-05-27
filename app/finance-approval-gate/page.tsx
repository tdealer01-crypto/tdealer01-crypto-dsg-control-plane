import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Finance Approval Gate — DSG ONE',
  description:
    'A focused Finance Approval Gate workflow for AI and automation requests: policy, risk, entitlement, evidence, decision, and pre-audit evidence boundary.',
};

const workflowSteps = [
  {
    title: '1. AI or automation requests a finance action',
    body:
      'A bot, workflow, or agent asks to pay an invoice, approve a vendor, change payment details, or run another finance operation before execution.',
  },
  {
    title: '2. DSG evaluates the request boundary',
    body:
      'DSG checks policy, risk, entitlement, and submitted evidence against the action, actor, amount, vendor, invoice, and approval context available at decision time.',
  },
  {
    title: '3. DSG returns a bounded decision',
    body:
      'The gate returns ALLOW, BLOCK, REVIEW, or UNSUPPORTED so the calling system knows whether to proceed, stop, escalate, or route outside the supported workflow.',
  },
  {
    title: '4. DSG records decision-time evidence',
    body:
      'The evidence record is for pre-audit review: request fields, evaluated controls, decision, reason, policy references, and missing-evidence notes where applicable.',
  },
];

const outcomes = [
  'ALLOW',
  'BLOCK',
  'REVIEW',
  'UNSUPPORTED',
] as const;

const demoScenarios = [
  {
    name: 'Low-risk payment allowed',
    request: 'Pay approved invoice INV-1042 for $850 to an existing vendor.',
    decision: 'ALLOW',
    reason: 'Amount is below threshold, vendor entitlement matches, invoice evidence is present, and policy allows automatic release.',
  },
  {
    name: 'High-value payment requires review',
    request: 'Pay invoice INV-4471 for $48,500 to an existing vendor.',
    decision: 'REVIEW',
    reason: 'Value exceeds the configured approval threshold, so DSG routes the request to a human finance approver before execution.',
  },
  {
    name: 'Missing invoice evidence requires review',
    request: 'Pay $3,200 to a known vendor without the invoice attachment or invoice ID.',
    decision: 'REVIEW',
    reason: 'The action may be legitimate, but the invoice evidence is missing at decision time, so the request needs evidence remediation or human review.',
  },
  {
    name: 'Destructive action blocked',
    request: 'Delete vendor payment history and overwrite approval records.',
    decision: 'BLOCK',
    reason: 'The request is destructive to finance evidence and approval history, so DSG blocks it rather than allowing an automated override.',
  },
  {
    name: 'Unsupported action returned as unsupported',
    request: 'Open a new bank account and change treasury policy limits.',
    decision: 'UNSUPPORTED',
    reason: 'The requested operation is outside the Finance Approval Gate pilot workflow and should be handled by a separate governed process.',
  },
] as const;

const evidenceFields = [
  'requestId and timestamp',
  'actor, role, and entitlement context',
  'requested action, amount, vendor, and invoice identifiers',
  'policy and risk checks evaluated for the decision',
  'evidence present, evidence missing, and review reason',
  'final gate decision and decision rationale',
];

const decisionTone: Record<(typeof demoScenarios)[number]['decision'], string> = {
  ALLOW: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
  BLOCK: 'border-red-400/40 bg-red-400/10 text-red-100',
  REVIEW: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
  UNSUPPORTED: 'border-slate-400/40 bg-slate-400/10 text-slate-100',
};

export default function FinanceApprovalGatePage() {
  return (
    <main className="min-h-screen bg-[#07080a] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(245,158,11,0.16),transparent_34%),linear-gradient(180deg,#090a0d_0%,#0b0d10_58%,#07080a_100%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
              Finance Approval Gate
            </p>
            <h1 className="mt-7 max-w-4xl text-5xl font-bold leading-[1.02] md:text-7xl">
              Gate AI payment requests before money moves.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              DSG ONE turns one finance workflow into a bounded SaaS pilot: an AI or automation request is evaluated for policy, risk, entitlement, and evidence before a payment, invoice, or vendor action can proceed.
            </p>
            <div className="mt-8 rounded-3xl border border-amber-300/30 bg-amber-300/10 p-5 text-amber-50">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">Evidence boundary</p>
              <p className="mt-3 text-base font-semibold">
                Pre-audit evidence only. No independent certification claimed.
              </p>
            </div>
            <div className="mt-8">
              <Link
                href="/request-access?pilot=finance-approval-gate"
                className="inline-flex rounded-2xl bg-emerald-300 px-7 py-4 text-base font-bold text-slate-950 transition hover:bg-emerald-200"
              >
                Request Finance Gate Pilot
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/30 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Concrete workflow</p>
            <div className="mt-5 space-y-4">
              {workflowSteps.map((step) => (
                <article key={step.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h2 className="text-lg font-semibold text-white">{step.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0b0d10]">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Gate decisions</p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Four outcomes the caller can act on immediately.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {outcomes.map((outcome) => (
              <div key={outcome} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-2xl font-black">{outcome}</p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {outcome === 'ALLOW' && 'Proceed inside the approved policy and evidence boundary.'}
                  {outcome === 'BLOCK' && 'Stop the action because it violates a hard control.'}
                  {outcome === 'REVIEW' && 'Escalate to a finance reviewer with evidence context.'}
                  {outcome === 'UNSUPPORTED' && 'Route outside this pilot because the action is not covered.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-300">Pilot demo scenarios</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight">Five finance requests, five bounded decisions.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            These are demonstration scenarios for the Finance Approval Gate pilot. They show how the workflow handles low-risk release, escalation, missing evidence, destructive requests, and out-of-scope actions.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {demoScenarios.map((scenario) => (
            <article key={scenario.name} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-2xl font-semibold text-white">{scenario.name}</h3>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${decisionTone[scenario.decision]}`}>
                  {scenario.decision}
                </span>
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Request</p>
              <p className="mt-2 text-sm leading-7 text-slate-200">{scenario.request}</p>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Decision reason</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">{scenario.reason}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b0d10]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Decision-time evidence</p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight">Record what was known when the gate decided.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              The pilot evidence pack is designed to reduce after-the-fact reconstruction. It captures the information used by the gate, plus what was missing when DSG returned REVIEW or UNSUPPORTED.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {evidenceFields.map((field) => (
              <div key={field} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm font-semibold text-slate-100">
                {field}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6 text-sm leading-7 text-amber-50">
          <p className="text-[11px] uppercase tracking-[0.3em] text-amber-200">Claim boundary</p>
          <p className="mt-3">
            This page describes a high-touch Finance Approval Gate pilot workflow and demo scenarios. It does not claim independent certification, WORM-certified storage, external Z3 production invocation, or enterprise readiness.
          </p>
        </div>
      </section>
    </main>
  );
}
