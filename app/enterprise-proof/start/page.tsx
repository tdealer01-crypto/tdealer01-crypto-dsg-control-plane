import React from 'react';
import Link from "next/link";

const whyUse = [
  "Prevent replayed or duplicated execution",
  "Keep one runtime truth with visible lineage",
  "Make approvals terminal and auditable",
  "Recover from failures using checkpoints and replay visibility",
  "Enforce role-based control over runtime operations",
  "Turn governance from policy text into runtime behavior",
];

const proofCards = [
  {
    title: "Approval Integrity",
    body: "Runtime requests are expected to pass through approval logic before execution proceeds.",
  },
  {
    title: "Replay Resistance",
    body: "Consumed or terminal runtime requests should not be revived and reused.",
  },
  {
    title: "Ledger Lineage",
    body: "Runtime actions can be tied to ledger evidence for later inspection and review.",
  },
  {
    title: "Checkpoint Visibility",
    body: "Operators can inspect checkpoint and recovery lineage instead of guessing system state.",
  },
  {
    title: "Role-Based Governance",
    body: "Runtime, policy, and operational surfaces are governed by role-aware controls.",
  },
  {
    title: "Operational Trust",
    body: "The product is designed to help enterprises investigate, recover, and govern AI execution.",
  },
];

const flowSteps = [
  "Public proof narrative introduces the product and route boundary",
  "A runtime intent is submitted through the current execution flow",
  "Approval is created and validated",
  "Execution passes through the runtime decision path",
  "Runtime truth and ledger evidence are written",
  "Effects are reconciled through callback-safe handling",
  "Checkpoints preserve runtime lineage",
  "Authenticated operators inspect runtime state and governance evidence",
];

const businessImpact = [
  "Reduces operational risk from replayed or duplicated AI actions",
  "Improves audit and governance readiness",
  "Shortens incident investigation time",
  "Makes runtime behavior explainable to operators",
  "Helps enterprises evaluate AI systems with clearer operational boundaries",
];

const proofSnapshot = [
  "Enterprise proof narrative available",
  "Machine-readable JSON report available",
  "Public vs verified proof split made explicit",
  "Governance and checkpoint model visible in one flow",
];

export default function EnterpriseProofStartPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white" data-testid="enterprise-proof-start">
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="max-w-4xl">
          <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
            Enterprise Runtime Proof
          </div>

          <h1 className="mt-8 text-4xl font-bold leading-tight md:text-6xl">
            Public proof narrative for AI systems that need governed runtime behavior.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            DSG ONE presents a public proof-oriented narrative for enterprises evaluating runtime control, replay resistance, ledger-backed lineage, checkpoint visibility, and role-based governance. Verified runtime evidence stays inside authenticated workspace routes.
          </p>

          <div className="mt-8 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">
              AI Summary
            </p>
            <p className="mt-3 text-base leading-7 text-cyan-50">
              This public page is useful when an enterprise needs to understand why governed AI execution matters before entering authenticated runtime and operator flows.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-violet-400/30 bg-violet-400/10 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-violet-200">Proof Surface Split</p>
            <p className="mt-2 text-sm text-violet-50">
              Public narrative summary stays open and AI-readable. Verified runtime evidence is available in the authenticated workspace at
              <span className="font-semibold"> /enterprise-proof/verified</span>.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <button
              type="button"
              className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-6 py-4 font-semibold text-cyan-100"
            >
              Review Demo Narrative Context
            </button>
            <Link
              href="/enterprise-proof/report"
              data-testid="open-executive-report"
              className="rounded-2xl bg-emerald-400 px-6 py-4 font-semibold text-slate-950"
            >
              Open Enterprise Proof Report
            </Link>
            <Link
              href="/api/enterprise-proof/report"
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-semibold text-white"
            >
              View JSON Proof Report
            </Link>
            <Link
              href="/enterprise-proof/verified"
              className="rounded-2xl border border-violet-300/30 bg-violet-400/10 px-6 py-4 font-semibold text-violet-100"
            >
              Open Verified Runtime Evidence
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            What this page is
          </p>
          <h2 className="mt-4 text-3xl font-semibold">
            A public proof layer for enterprise AI runtime evaluation.
          </h2>
          <p className="mt-4 max-w-4xl leading-8 text-slate-300">
            DSG ONE is built for organizations that need AI execution to be auditable, replay-resistant, recoverable, and governed through enforceable runtime controls. This page explains that value publicly. Authenticated operator evidence lives deeper in the workspace.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Why enterprises need this app
            </p>
            <ul className="mt-6 space-y-3 text-slate-200">
              {whyUse.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Public proof snapshot
            </p>
            <div className="mt-6 grid gap-4">
              {proofSnapshot.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-emerald-100"
                >
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-7 text-slate-400">
              This page is intentionally proof-oriented. It helps humans and AI readers understand the operational and governance value of the product before entering protected operator flows.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div
          data-testid="demo-context"
          className="mb-6 rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 p-6 text-cyan-50"
        >
          Demo narrative context is prepared for walkthrough verification.
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            What problem it solves
          </p>
          <h2 className="mt-4 text-3xl font-semibold">
            Enterprises need more than model output.
          </h2>
          <p className="mt-4 max-w-5xl leading-8 text-slate-300">
            Most AI products can generate output, but they do not explain execution integrity. Enterprises need to know what was approved, what ran, what changed state, what can be replayed, and what can be verified after failure. This page explains that need; authenticated workspace routes provide deeper proof.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            What this public proof shows
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {proofCards.map((card) => (
              <div
                key={card.title}
                className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6"
              >
                <h3 className="text-xl font-semibold">{card.title}</h3>
                <p className="mt-3 leading-7 text-slate-300">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            End-to-end enterprise flow
          </p>
          <div className="mt-6 grid gap-4" data-testid="walkthrough-steps">
            {flowSteps.map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 font-semibold text-emerald-200">
                  {index + 1}
                </div>
                <p className="text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Business impact
            </p>
            <ul className="mt-6 space-y-3">
              {businessImpact.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4 text-slate-200"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Why this is not just another AI app
            </p>
            <p className="mt-6 leading-8 text-slate-300">
              This product does not stop at output generation. It adds runtime truth, execution lineage, governance controls, checkpoint visibility, and operational evidence. This public page explains why that matters; verified runtime proof remains authenticated and org-scoped.
            </p>

            <div className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">
                Final recommendation
              </p>
              <p className="mt-3 leading-7 text-emerald-50">
                Use DSG ONE when AI execution must be governed, inspectable, and operationally trustworthy, and use verified runtime routes when the evaluation needs workspace-scoped evidence.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/enterprise-proof/report"
                className="rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950"
              >
                Open Enterprise Report
              </Link>
              <Link
                href="/api/enterprise-proof/report"
                className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-white"
              >
                JSON for AI
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
