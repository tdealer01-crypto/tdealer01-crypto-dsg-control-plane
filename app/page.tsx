import Link from 'next/link';
import { Suspense } from 'react';
import { ActionPathGraph } from '../components/ActionPathGraph';
import { ConstraintChecklist } from '../components/ConstraintChecklist';
import { EvidenceDrawer } from '../components/EvidenceDrawer';
import { GateResultCard } from '../components/GateResultCard';
import RefTracker from '../components/RefTracker';

const trustBar = [
  'Deterministic Security Gateway — SMT Solver-verified policy invariants (8 Z3 theorems: 5 core + 3 DeFi)',
  'WORM audit trail — SHA-256 requestHash → recordHash → bundleHash · tamper-evident by construction',
  'EU AI Act Art. 12/14 · Annex IV · ISO 42001 — CCVS v1.2 live evidence chain · 2173 tests · mutation score 72.08%',
];

const painCards = [
  {
    title: 'Approvals are scattered',
    body: 'Finance decisions still happen across email, chat, spreadsheets, ERP notes, and shared folders. That makes policy enforcement inconsistent and hard to prove.',
  },
  {
    title: 'Audit evidence is rebuilt by hand',
    body: 'When audit asks who approved a payment, why it was approved, and what evidence was reviewed, teams often reconstruct the story after the fact.',
  },
  {
    title: 'Exceptions are risky and invisible',
    body: 'Urgent payments, missing documents, high-risk vendors, and threshold overrides need controlled escalation before money moves.',
  },
];

const howSteps = [
  'Submit a high-risk AI, workflow, finance, or deployment action.',
  'DSG ONE resolves policy, entitlement, risk, and approval context.',
  'The deterministic gate returns PASS, BLOCK, REVIEW, or UNSUPPORTED.',
  'The system records proof/gate evidence for audit review.',
];

const launchLinks = [
  {
    title: 'AI Delivery Proof',
    body: 'ออก Proof Report ให้ลูกค้าก่อนส่งงาน — ยืนยันว่าโค้ด/AI agent ผ่านอะไรแล้ว สำหรับ agency, SaaS, dev team.',
    cta: 'ดู Delivery Proof →',
    href: '/delivery-proof',
    highlight: true,
  },
  {
    title: 'Finance Governance Workspace',
    body: 'See the approval queue, case detail, exception posture, and evidence bundle path.',
    cta: 'Open finance workspace',
    href: '/finance-governance/app',
  },
  {
    title: 'Enterprise Pilot',
    body: 'Start with one invoice or payment approval workflow and prove audit readiness before broad rollout.',
    cta: 'Request access',
    href: '/request-access',
  },
];

const DEMO_LABEL = 'Sample action context (homepage proof rail demo)';

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07080a] text-white">
      <Suspense fallback={null}><RefTracker /></Suspense>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(181,18,27,0.3),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(245,197,92,0.17),transparent_30%),linear-gradient(180deg,#090a0d_0%,#0b0d10_55%,#0a0c0f_100%)]" />
        <div className="absolute inset-y-0 right-0 hidden w-[44%] border-l border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] lg:block" />

        <div className="relative mx-auto grid min-h-[calc(100svh-73px)] max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">
              Deterministic Security Gateway · SMT-Verified · WORM Audit
            </p>
            <h1 className="mt-7 max-w-5xl text-5xl font-bold leading-[1.02] text-white md:text-7xl">
              Govern AI actions before they reach production.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              DSG ONE is a runtime governance gateway driven by a Deterministic Security Gateway — policy invariants verified by SMT Solver, every action gated before execution, every decision recorded as a tamper-evident WORM hash chain. EU AI Act Art. 12/14 evidence pack included.
            </p>

            <div className="mt-8 rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-5 shadow-2xl shadow-emerald-950/30">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Try before login</p>
              <p className="mt-2 text-sm leading-7 text-emerald-50">
                Had AI break things before? See proof/demo and ask DSG first — public mode does not execute actions and you don&apos;t need to migrate any data.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/demo"
                  className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
                >
                  Try demo now →
                </Link>
                <Link
                  href="#public-chat"
                  className="rounded-2xl border border-emerald-200/40 bg-black/20 px-5 py-3 text-sm font-bold text-emerald-100 transition hover:border-emerald-100"
                >
                  Ask DSG
                </Link>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/delivery-proof" className="rounded-2xl bg-emerald-400 px-6 py-4 text-base font-bold text-slate-950 transition hover:bg-emerald-300">
                Delivery Proof →
              </Link>
              <Link href="/demo" className="rounded-2xl bg-amber-300 px-6 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-200">
                Try demo
              </Link>
              <Link href="/pricing" className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-6 py-4 text-base font-semibold text-amber-100 transition hover:border-amber-300/60">
                Pricing
              </Link>
              <Link href="/login" className="rounded-2xl border border-white/15 bg-white/[0.03] px-6 py-4 font-semibold text-slate-100 transition hover:border-emerald-300/40">
                Continue with email
              </Link>
            </div>

            <div className="mt-12 grid gap-3 md:grid-cols-3">
              {trustBar.map((item) => (
                <div key={item} className="border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="border border-amber-300/20 bg-black/30 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Runtime Control Room</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Governed Action Stack</h2>
                </div>
                <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-200">
                  Ready
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {howSteps.map((step, index) => (
                  <div key={step} className="grid grid-cols-[42px_1fr] gap-4 border-l border-amber-300/25 bg-white/[0.02] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/10 text-sm font-semibold text-amber-100">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-7 text-slate-200">{step}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="border border-white/10 bg-[#111317] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Policy</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">Route by policy</p>
                </div>
                <div className="border border-white/10 bg-[#111317] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Evidence</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">Evidence at decision time</p>
                </div>
                <div className="border border-white/10 bg-[#111317] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Exceptions</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">Review with controls</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="public-chat" className="border-b border-emerald-300/15 bg-[#07110f]">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-300">Public DSG Assistant</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Ask before logging in — no actions executed</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Use the chat button at the bottom right or start from the demo page to check whether DSG fits your workflow before requesting access or migrating any data.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/demo" className="rounded-2xl bg-emerald-300 px-6 py-4 font-bold text-slate-950 hover:bg-emerald-200">
              View demo now
            </Link>
            <Link href="/request-access" className="rounded-2xl border border-emerald-300/40 px-6 py-4 font-bold text-emerald-100 hover:bg-emerald-300/10">
              Request trial access
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-5 lg:grid-cols-3">
          {painCards.map((card) => (
            <article key={card.title} className="border-t border-red-400/30 bg-white/[0.02] px-0 py-0">
              <div className="p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Risk Signal</p>
                <h2 className="mt-4 text-2xl font-semibold text-amber-50">{card.title}</h2>
                <p className="mt-4 text-sm leading-7 text-slate-300">{card.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b0d10]">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Launch Paths</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-white">Move from one governed workflow to a real operating surface.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Finance Governance is one governed workflow under DSG ONE. Start with a single invoice or payment path, prove control quality in a bounded pilot, then expand into the daily approval workspace with shared evidence and runtime checks.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {launchLinks.map((item) => (
              <article key={item.title} className={'highlight' in item && item.highlight ? 'border border-emerald-400/30 bg-emerald-400/5 p-6' : 'border border-white/10 bg-white/[0.03] p-6'}>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  {'highlight' in item && item.highlight ? '🆕 New' : 'Path'}
                </p>
                <h3 className="mt-4 text-2xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 min-h-[110px] text-sm leading-7 text-slate-300">{item.body}</p>
                <Link href={item.href} className={'highlight' in item && item.highlight ? 'mt-5 inline-flex border-b border-emerald-300 pb-1 text-sm font-semibold text-emerald-200' : 'mt-5 inline-flex border-b border-amber-300 pb-1 text-sm font-semibold text-amber-100'}>
                  {item.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-300">Homepage proof rail</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Live deterministic gate evidence</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          Sample action context demonstrating the policy engine decision path. Fields reflect the live production policy engine output format.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <GateResultCard
            status="PASS"
            summary="policyVersion 1.0 loaded and all 8 configured deterministic constraints evaluated as pass for this sample request."
            reason="No threshold, actor-role, or replay-protection violations were detected in the sample action context."
            ruleRefs={['policyVersion:1.0', 'solver:static_check@dsg-deterministic-ts-0.0.0', 'constraintsChecked:8']}
            demoLabel={DEMO_LABEL}
          />
          <ActionPathGraph
            actor={{ id: 'actor-1', title: 'AP Maker (sample)', subtitle: 'role: finance_maker' }}
            action={{ id: 'action-1', title: 'Submit invoice approval request', subtitle: 'sample amount within configured threshold' }}
            policies={[
              { id: 'p-1', title: 'Policy version', subtitle: '1.0 observed' },
              { id: 'p-2', title: 'Replay protection', subtitle: 'nonce/idempotency/request hash present' },
              { id: 'p-3', title: 'Constraint engine', subtitle: 'static_check deterministic evaluation' },
            ]}
            gateResult="PASS"
            finalDecision="ALLOW in sample action context"
            demoLabel={DEMO_LABEL}
          />
          <ConstraintChecklist
            demoLabel={DEMO_LABEL}
            items={[
              { id: 'c1', label: 'Policy version resolved', detail: 'policyVersion observed as 1.0.', state: 'pass' },
              { id: 'c2', label: 'Input hash recorded', detail: 'inputHash present in policy engine output.', state: 'pass' },
              { id: 'c3', label: 'Constraint set hash recorded', detail: 'constraintSetHash present in policy engine output.', state: 'pass' },
              { id: 'c4', label: 'Proof hash recorded', detail: 'proofHash present in policy engine output.', state: 'pass' },
              { id: 'c5', label: 'Structured constraint results', detail: 'Per-constraint deterministic pass/fail structure present.', state: 'pass' },
              { id: 'c6', label: 'Replay nonce present', detail: 'replayProtection.nonce present.', state: 'pass' },
              { id: 'c7', label: 'Idempotency key present', detail: 'replayProtection.idempotencyKey present.', state: 'pass' },
              { id: 'c8', label: 'Request hash present', detail: 'replayProtection.requestHash present.', state: 'pass' },
            ]}
          />
          <EvidenceDrawer
            title="Evidence availability"
            demoLabel={DEMO_LABEL}
            fields={[
              { key: 'policyVersion', label: 'policyVersion', availability: 'present', detail: 'Observed value: 1.0.' },
              { key: 'inputHash', label: 'inputHash', availability: 'present', detail: 'Hash value present in policy engine response.' },
              { key: 'constraintSetHash', label: 'constraintSetHash', availability: 'present', detail: 'Hash value present in policy engine response.' },
              { key: 'proofHash', label: 'proofHash', availability: 'present', detail: 'Hash value present in policy engine response.' },
              { key: 'constraintResults', label: 'structured constraint results', availability: 'present', detail: 'Per-constraint structured outcomes are present.' },
              { key: 'nonce', label: 'replayProtection.nonce', availability: 'present', detail: 'Replay nonce present.' },
              { key: 'idempotency', label: 'replayProtection.idempotencyKey', availability: 'present', detail: 'Idempotency key present.' },
              { key: 'requestHash', label: 'replayProtection.requestHash', availability: 'present', detail: 'Request hash present.' },
              { key: 'solverName', label: 'solver.name', availability: 'present', detail: 'Observed solver.name: static_check.' },
              { key: 'solverVersion', label: 'solver.version', availability: 'present', detail: 'Observed solver.version: dsg-deterministic-ts-0.0.0.' },
              { key: 'constraintsChecked', label: 'constraintsChecked', availability: 'present', detail: 'Observed constraintsChecked: 8.' },
              { key: 'externalZ3', label: 'External Z3 production invocation', availability: 'unsupported', detail: 'Z3 runs at design time (8 theorems: 5 core policy + 3 DeFi, proved UNSAT); not invoked per-request in production.' },
              { key: 'jwtJwks', label: 'JWT/JWKS auth completion', availability: 'planned', detail: 'Supabase session auth is live; full JWT/JWKS standalone completion not yet claimed.' },
              { key: 'worm', label: 'WORM-certified storage', availability: 'planned', detail: 'SHA-256 hash chain is tamper-evident by construction; WORM-certified external storage not yet claimed.' },
            ]}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="border border-amber-300/30 bg-amber-300/10 p-6 text-sm leading-7 text-amber-50">
          <p className="text-[11px] uppercase tracking-[0.3em] text-amber-200">Claim Boundary</p>
          <p className="mt-3">Production runtime: live policy engine, CCVS v1.2 evidence chain (L1–L5), 2173 tests (229 files), mutation score 72.08%, EU AI Act Annex IV mapping at <code className="text-amber-200">/api/compliance-evidence-pack/annex4</code>, and compliance-status API at <code className="text-amber-200">/api/ccvs/compliance-status</code>. Not claimed: external Z3 per-request invocation, JWT/JWKS standalone auth completion, WORM-certified external storage, third-party certification, or ISO/NIST independent audit.</p>
        </div>
      </section>

    </main>
  );
}
