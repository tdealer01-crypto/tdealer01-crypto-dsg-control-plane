'use client';

import Link from "next/link";
import { useEffect, useState } from "react";

const controls = [
  "Deterministic action gate before AI or workflow execution",
  "Policy, risk, approval, entitlement, and invariant checks",
  "Approval workflow queue for review-required actions",
  "Monitor Mode for customer-held runtime and API keys",
  "requestHash and recordHash audit proof",
  "Evidence export for reviewer and consultant workflows",
  "GitHub Marketplace Action for CI/CD deploy gating",
  "Reusable control templates for compliance and consult workflows",
];

const routes = [
  { href: "/iso-42001", title: "ISO/IEC 42001 Alignment", body: "AI Management System workflow support without certification claims." },
  { href: "/nist-ai-rmf", title: "NIST AI RMF Alignment", body: "Govern, Map, Measure, and Manage workflow support for AI risk management." },
  { href: "/controls", title: "Control Template Library", body: "Reusable DSG ONE controls for identity, runtime invariants, approvals, evidence, and CI/CD gates." },
  { href: "/approvals", title: "Approval Workflow", body: "Review queue and decision API for high-risk or approval-required AI actions." },
  { href: "/evidence-pack", title: "Evidence Pack", body: "Sample audit evidence, benchmark summary, signed bundle, requestHash, recordHash, and export structure." },
  { href: "/marketplace/production-evidence", title: "Production Evidence", body: "Gateway benchmark, SMT2 invariant evidence, and public baseline boundary." },
];

interface ComplianceStatus {
  ok: boolean;
  claim_pass_eligible: boolean | null;
  run_id: string | null;
  mutation_score: number | null;
  requirements_pass: number;
  requirements_total: number;
  last_ci_run: string | null;
  updated_at: string | null;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-slate-400">{sub}</p>
    </div>
  );
}

export default function AICompliancePage() {
  const [status, setStatus] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ccvs/compliance-status')
      .then((r) => r.json() as Promise<ComplianceStatus>)
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  const reqPass  = status?.requirements_pass  ?? 0;
  const reqTotal = status?.requirements_total ?? 0;
  const mutScore = status?.mutation_score != null ? `${status.mutation_score.toFixed(1)}%` : '—';
  const eligible = status?.claim_pass_eligible;
  const eligibleBadge =
    eligible === true  ? { text: 'EVIDENCE COMPLETE', cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' } :
    eligible === false ? { text: 'PRODUCTION BLOCKED', cls: 'border-red-400/30 bg-red-400/10 text-red-200' } :
    null;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">AI Compliance Control Layer</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
            Govern AI actions before they reach production systems
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            DSG ONE helps organizations turn AI-proposed actions into governed, auditable, deterministic state transitions. It sits between AI intent and real-world execution, checking policy, risk, approval, entitlement, and mathematical invariants before action or audit commit.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/marketplace/production-evidence" className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-black">
              View production evidence
            </Link>
            <Link href="/approvals" className="rounded-xl border border-emerald-400/40 px-5 py-3 font-bold text-emerald-100">
              View approval queue
            </Link>
            <Link href="/controls" className="rounded-xl border border-emerald-400/40 px-5 py-3 font-bold text-emerald-100">
              View control templates
            </Link>
            <Link href="/evidence-pack" className="rounded-xl border border-emerald-400/40 px-5 py-3 font-bold text-emerald-100">
              View evidence pack
            </Link>
            <Link href="/marketplace" className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200">
              View marketplace page
            </Link>
          </div>
        </section>

        {/* Live compliance stats */}
        <section className="mt-8">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-5 h-28" />
              ))}
            </div>
          ) : (
            <>
              {eligibleBadge && (
                <div className={`mb-4 inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-bold uppercase ${eligibleBadge.cls}`}>
                  {eligibleBadge.text}
                  {status?.run_id && (
                    <Link href={`/delivery-proof/report/${status.run_id}`} className="ml-2 underline opacity-70 hover:opacity-100">
                      view report
                    </Link>
                  )}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  label="Compliance Requirements"
                  value={reqTotal > 0 ? `${reqPass} / ${reqTotal}` : '— / —'}
                  sub="requirements passed in latest CI run"
                />
                <StatCard
                  label="Mutation Score"
                  value={mutScore}
                  sub="Stryker mutation test coverage"
                />
                <StatCard
                  label="Last CI Run"
                  value={status?.last_ci_run ? new Date(status.last_ci_run).toLocaleDateString() : '—'}
                  sub={status?.updated_at ? `updated ${new Date(status.updated_at).toLocaleTimeString()}` : 'not yet recorded'}
                />
              </div>
            </>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">What DSG ONE controls</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {controls.map((item) => (
              <div key={item} className="rounded-xl border border-emerald-400/20 bg-slate-950 p-4 font-semibold text-emerald-100">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {routes.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-emerald-400/50">
              <h2 className="text-2xl font-bold text-white">{item.title}</h2>
              <p className="mt-3 leading-7 text-slate-300">{item.body}</p>
              <p className="mt-4 font-semibold text-emerald-300">Open →</p>
            </Link>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
          <h2 className="text-2xl font-bold">Boundary</h2>
          <p className="mt-3 leading-7 text-slate-300">
            DSG ONE is positioned as a compliance-enabling control layer. It supports ISO/IEC 42001-aligned and NIST AI RMF-style workflows, but this page does not claim ISO certification, NIST certification, independent third-party audit, or guaranteed compliance.
          </p>
        </section>
      </div>
    </main>
  );
}
