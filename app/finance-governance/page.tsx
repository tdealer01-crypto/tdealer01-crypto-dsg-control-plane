import Link from 'next/link';

const trustItems = [
  'Maker-checker enforcement',
  'Policy-based approval routing',
  'Exportable audit evidence',
  'Org-scoped access control',
  'Audit timeline per case',
];

const painCards = [
  {
    title: 'Policies exist, but they are not enforced at runtime',
    text: 'Thresholds, role rules, and separation-of-duties controls are often documented but easy to bypass when approvals happen across email, chat, and spreadsheets.',
  },
  {
    title: 'Audit evidence is scattered',
    text: 'When someone asks who approved a transaction, why they approved it, and what evidence they used, teams end up stitching together screenshots, attachments, and chat history manually.',
  },
  {
    title: 'Exceptions are hard to trace',
    text: 'Overrides, missing documents, escalations, and re-opened cases are often tracked informally, which makes audit readiness and operational confidence worse over time.',
  },
];

const pillars = [
  {
    title: 'Policy-enforced routing',
    text: 'Define thresholds, role rules, and workflow paths so approvals follow the right route automatically.',
  },
  {
    title: 'Maker-checker controls',
    text: 'Block self-approval and reduce the risk of unauthorized or weakly reviewed decisions.',
  },
  {
    title: 'Case-level audit trail',
    text: 'Track every submission, review, approval, escalation, override, and export with actor, role, timestamp, and reason.',
  },
  {
    title: 'Exportable evidence bundles',
    text: 'Package transactions, policy context, approval decisions, and document references into a usable export for internal or external review.',
  },
];

const useCases = [
  'Invoice approval governance',
  'Payment release approval',
  'Expense exception review',
  'Vendor onboarding approval',
  'Manual journal entry review',
];

const buyerBullets = [
  'Finance managers who need approvals out of inboxes',
  'Controllers who need stronger policy enforcement',
  'Compliance leads who need separation of duties',
  'Auditors who need evidence without manual reconstruction',
  'Governance teams who need visibility into exceptions and overrides',
];

export default function FinanceGovernancePage() {
  return (
    <main className="min-h-screen bg-hero-radial text-white">
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-20">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 shadow-glow">
            Finance Governance Control Plane
          </div>
          <h1 className="mt-8 text-5xl font-bold leading-tight md:text-7xl">
            Control financial approvals with policy, proof, and audit-ready evidence.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-100">
            DSG helps finance, compliance, and audit teams govern how transactions and supporting documents are submitted, reviewed, approved, escalated, and exported for audit without replacing the ERP.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-2xl bg-emerald-400 px-6 py-4 text-base font-semibold text-slate-950 transition hover:scale-[1.01]"
            >
              Start Trial
            </Link>
            <Link
              href="/finance-governance/pricing"
              className="rounded-2xl border border-white/30 bg-white/10 px-6 py-4 text-base font-semibold text-white transition hover:border-emerald-300/70 hover:bg-emerald-300/15"
            >
              View Pricing
            </Link>
            <Link
              href="/docs"
              className="rounded-2xl border border-white/25 bg-slate-900/30 px-6 py-4 text-base font-semibold text-slate-100 transition hover:border-white/40 hover:text-white"
            >
              Read Docs
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-3 text-sm">
          {trustItems.map((item) => (
            <div
              key={item}
              className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-4 py-2 font-medium text-cyan-100"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Why teams buy</p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">Why teams outgrow spreadsheet and email approvals</h2>
          <p className="mt-4 text-slate-300">
            Most finance workflows are still governed across disconnected tools. Approval decisions happen in email threads, evidence lives in shared drives, and audit teams have to reconstruct what happened after the fact.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {painCards.map((card) => (
            <div key={card.title} className="rounded-[1.75rem] border border-white/20 bg-slate-900/75 p-7 backdrop-blur-sm">
              <p className="text-lg font-semibold text-white">{card.title}</p>
              <p className="mt-3 leading-7 text-slate-100">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Solution</p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">A governance layer for finance workflows</h2>
          <p className="mt-4 text-slate-300">
            DSG sits between your team and your existing systems to enforce approval policy, maker-checker rules, and evidence-backed decisions. Your ERP stays the financial system of record. DSG becomes the governance system of record for approvals, exceptions, and audit exports.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
              <div className="inline-flex rounded-2xl bg-emerald-300/20 px-3 py-2 text-sm font-semibold text-emerald-100">
                {pillar.title}
              </div>
              <p className="mt-5 leading-7 text-slate-100">{pillar.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-violet-200">Use cases</p>
            <h3 className="mt-3 text-2xl font-bold">Start with one workflow. Expand from there.</h3>
            <div className="mt-6 grid gap-3">
              {useCases.map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Built for</p>
            <h3 className="mt-3 text-2xl font-bold">Finance, compliance, and audit teams</h3>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-200">
              {buyerBullets.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 pt-8">
        <div className="rounded-[2rem] border border-emerald-400/20 bg-gradient-to-r from-emerald-400/15 via-cyan-400/10 to-transparent p-8 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Pilot motion</p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">Start with one governed workflow and prove the value fast.</h2>
              <p className="mt-4 max-w-2xl text-slate-300">
                Launch a pilot for invoice or payment approval governance, bring the right approvers into the workflow, and generate evidence your audit team can actually use.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-4 text-base font-semibold text-slate-950"
              >
                Start Trial
              </Link>
              <Link
                href="/finance-governance/pricing"
                className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-6 py-4 text-base font-semibold text-white"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
