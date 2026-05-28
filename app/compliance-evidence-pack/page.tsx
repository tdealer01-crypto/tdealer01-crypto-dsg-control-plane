import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Governance Compliance Evidence Pack — DSG ONE',
  description:
    'Downloadable pre-audit compliance evidence for EU AI Act Article 12/14, Annex IV, and ISO/IEC 42001. Includes formal Z3 proofs (24 theorems), 998 automated test results, mutation score 72.08%, CCVS v1.2 evidence chain, and control mapping. Not a third-party certification.',
};

const EVIDENCE_SECTIONS = [
  {
    icon: '⚡',
    title: 'Formal Verification',
    desc: '24 Z3 theorems proved UNSAT — policy invariants, revenue model, and billing logic. Every theorem verified by asserting its negation: UNSAT means no counterexample exists for any possible input.',
    badge: '24 theorems · 0 failed',
    color: 'blue',
  },
  {
    icon: '🔐',
    title: 'WORM Audit Trail',
    desc: 'Write-Once SHA-256 hash chain: requestHash → decisionHash → recordHash → bundleHash. Optional HMAC-SHA256 signing. Tamper-evident — any field change cascades to all downstream hashes.',
    badge: '998 assertions verified',
    color: 'emerald',
  },
  {
    icon: '🧪',
    title: 'Automated Test Evidence',
    desc: '998 tests across 133 files covering gateway invariants, WORM idempotency, evidence bundle signing, approval lifecycle, security primitives, and provider dispatch. Mutation score 72.08% (191/265 killed) verified by Stryker.',
    badge: '+59% vs baseline',
    color: 'violet',
  },
  {
    icon: '📋',
    title: 'EU AI Act Mapping',
    desc: 'Art. 9 (Risk Management), Art. 12 (Record Keeping), Art. 14 (Human Oversight), Annex IV (9-item technical documentation checklist) — each mapped to DSG ONE controls with test evidence. Live at GET /api/compliance-evidence-pack/annex4.',
    badge: 'Art. 9 · 12 · 14 · Annex IV',
    color: 'amber',
  },
  {
    icon: '🏛️',
    title: 'ISO/IEC 42001 Controls',
    desc: 'AI Management System alignment: A.6.1.1 (AI Policy), A.6.2.2 (Risk Assessment), A.6.2.3 (High-Risk Approval), A.9.1 (Monitoring), A.9.3 (Audit Logging), A.10.1 (Continual Improvement).',
    badge: '6 controls mapped',
    color: 'slate',
  },
  {
    icon: '⚠️',
    title: 'Evidence Boundary',
    desc: 'certificationClaim = false · independentAuditClaim = false. This pack is for internal pre-audit preparation only. All source code and tests are reproducible from the public repository.',
    badge: 'Required disclaimer',
    color: 'red',
  },
];

const colorMap: Record<string, string> = {
  blue: 'border-blue-500/30 bg-blue-500/5',
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
  violet: 'border-violet-500/30 bg-violet-500/5',
  amber: 'border-amber-500/30 bg-amber-500/5',
  slate: 'border-slate-500/30 bg-slate-500/5',
  red: 'border-red-500/30 bg-red-500/5',
};

const badgeMap: Record<string, string> = {
  blue: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  violet: 'bg-violet-500/20 text-violet-300 border-violet-400/30',
  amber: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  slate: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
  red: 'bg-red-500/20 text-red-300 border-red-400/30',
};

export default function ComplianceEvidencePackPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">

      {/* Hero */}
      <section className="border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-200">
            Pre-Audit Compliance Documentation
          </p>
          <h1 className="mt-6 text-5xl font-black leading-tight md:text-6xl">
            AI Governance<br />
            <span className="text-amber-300">Compliance Evidence Pack</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Formal proofs, WORM audit trail evidence, 998 automated test assertions,
            CCVS v1.2 evidence chain, EU AI Act Annex IV mapping, and ISO 42001 control
            references — structured for pre-audit submission to your board, compliance team,
            or procurement review.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/api/compliance-evidence-pack"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-amber-300 px-8 py-4 text-base font-bold text-slate-950 transition hover:bg-amber-200"
            >
              View Evidence Pack →
            </a>
            <a
              href="/api/compliance-evidence-pack?print=1"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-base font-bold text-slate-100 transition hover:border-amber-300/40"
            >
              Download as PDF
            </a>
            <Link
              href="/eu-ai-act"
              className="rounded-2xl border border-slate-700 px-8 py-4 text-base font-semibold text-slate-300 transition hover:border-slate-500"
            >
              EU AI Act controls
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            certificationClaim = false · independentAuditClaim = false · For pre-audit internal use only
          </p>
        </div>
      </section>

      {/* What's inside */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">What&apos;s Inside</p>
          <h2 className="mt-3 text-3xl font-black">Six sections of verifiable evidence</h2>
          <p className="mt-3 text-slate-400">Every claim references a specific source file and test. Nothing is hand-wavy.</p>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {EVIDENCE_SECTIONS.map((s) => (
              <div
                key={s.title}
                className={`rounded-2xl border p-6 ${colorMap[s.color]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-2xl">{s.icon}</span>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${badgeMap[s.color]}`}>
                    {s.badge}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who needs this */}
      <section className="border-t border-white/10 bg-slate-900 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Use Cases</p>
          <h2 className="mt-3 text-3xl font-black">Who uses this pack</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-amber-300">Procurement Teams</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Download and share with your InfoSec or compliance reviewers when evaluating AI governance tooling.
                Pack answers: &quot;How is policy enforced?&quot; and &quot;How is audit evidence produced?&quot;
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-amber-300">Compliance Officers</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Map DSG ONE controls against your EU AI Act Article 12/14 obligations or ISO 42001 implementation.
                Pack provides pre-mapped control references with test evidence citations.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-amber-300">Board / Audit Committee</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                One-page executive summary format: formal proofs, test pass rate, hash-chain architecture,
                and regulatory mapping — without requiring technical expertise to interpret.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical methodology */}
      <section className="border-t border-white/10 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Methodology</p>
          <h2 className="mt-3 text-3xl font-black">Why &quot;formally verified&quot; is specific here</h2>
          <p className="mt-4 text-slate-400 leading-7">
            Most tools use &quot;formally verified&quot; loosely. DSG ONE is specific:
          </p>
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
              <p className="font-bold text-white">SMT-LIB 2 / Z3 — structural policy invariants</p>
              <p className="mt-2 text-sm text-slate-400 leading-6">
                Gateway policy is encoded as a satisfiability problem in SMT-LIB 2 format and checked by the Z3 solver.
                Each of the 8 policy theorems is proved by asserting its negation — if Z3 returns UNSAT,
                no input combination can violate the invariant. This is not testing; it is exhaustive over all possible inputs.
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
              <p className="font-bold text-white">998 automated tests · 72.08% mutation score</p>
              <p className="mt-2 text-sm text-slate-400 leading-6">
                Tests cover the gap between what Z3 proves (structural properties) and what runs in production
                (database interactions, authentication, HTTP routing, hash chain construction).
                Every WORM transition, approval lifecycle step, and security primitive has explicit assertions.
                Stryker mutation testing verified 191/265 mutants killed (72.08%) — gate at ≥70%.
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
              <p className="font-bold text-white">WORM hash chain — tamper-evident by construction</p>
              <p className="mt-2 text-sm text-slate-400 leading-6">
                requestHash → decisionHash → recordHash is not a database flag — it is a cryptographic chain.
                Altering any input field changes the hash, which changes all downstream hashes, which invalidates
                the bundleHash. This structure satisfies EU AI Act Art. 12 logging requirements by construction,
                not by policy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 bg-slate-900 px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black">Ready to generate your evidence pack?</h2>
          <p className="mt-4 text-slate-400">
            Opens a printable HTML report with all six sections. Use browser &quot;Print → Save as PDF&quot; or click the PDF button.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="/api/compliance-evidence-pack"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-amber-300 px-8 py-4 font-bold text-slate-950 transition hover:bg-amber-200"
            >
              Open Evidence Pack →
            </a>
            <Link
              href="/trust"
              className="rounded-2xl border border-slate-700 px-8 py-4 font-semibold text-slate-300 transition hover:border-slate-500"
            >
              Back to Trust Hub
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            certificationClaim = false · independentAuditClaim = false
          </p>
        </div>
      </section>

    </main>
  );
}
