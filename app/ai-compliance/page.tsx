import Link from "next/link";

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
  { href: "/controls", title: "Control Template Library", body: "Reusable DSG controls for identity, runtime invariants, approvals, evidence, and CI/CD gates." },
  { href: "/approvals", title: "Approval Workflow", body: "Review queue and decision API for high-risk or approval-required AI actions." },
  { href: "/evidence-pack", title: "Evidence Pack", body: "Sample audit evidence, benchmark summary, signed bundle, requestHash, recordHash, and export structure." },
  { href: "/marketplace/production-evidence", title: "Production Evidence", body: "Gateway benchmark, SMT2 invariant evidence, and public baseline boundary." },
];

export default function AICompliancePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">AI Compliance Control Layer</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
            Govern AI actions before they reach production systems
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            DSG helps organizations turn AI-proposed actions into governed, auditable, deterministic state transitions. It sits between AI intent and real-world execution, checking policy, risk, approval, entitlement, and mathematical invariants before action or audit commit.
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

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Production Gateway</p>
            <p className="mt-2 text-3xl font-bold text-white">6 / 6</p>
            <p className="mt-2 text-slate-400">latest observed benchmark checks passed</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">SMT2 Runtime Invariants</p>
            <p className="mt-2 text-3xl font-bold text-white">6 / 6</p>
            <p className="mt-2 text-slate-400">deterministic invariant cases passed</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Comparison Rubric</p>
            <p className="mt-2 text-3xl font-bold text-white">190 / 200</p>
            <p className="mt-2 text-slate-400">internal public-baseline rubric score</p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">What DSG controls</h2>
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
            DSG is positioned as a compliance-enabling control layer. It supports ISO/IEC 42001-aligned and NIST AI RMF-style workflows, but this page does not claim ISO certification, NIST certification, independent third-party audit, or guaranteed compliance.
          </p>
        </section>
      </div>
    </main>
  );
}
