import Link from "next/link";

const sections = [
  {
    title: "Product definition",
    body: "DSG ONE is a deterministic AI runtime control plane for enterprises that need runtime evidence, approval integrity, recovery visibility, and role-based governance.",
  },
  {
    title: "Runtime proof",
    body: "The product is designed to make execution decisions, runtime lineage, and operational state visible rather than implicit.",
  },
  {
    title: "Governance proof",
    body: "Governance is surfaced as operational control, not only policy text, so teams can inspect and govern runtime behavior.",
  },
  {
    title: "Recovery proof",
    body: "Checkpoint and recovery visibility give operators a way to reason about state and restore confidence after failure.",
  },
  {
    title: "Business impact",
    body: "This reduces runtime risk, improves trust in AI operations, and helps enterprises justify use in production environments.",
  },
  {
    title: "Why the enterprise should use it",
    body: "Use this app when AI systems must be controlled, reviewable, and operationally trustworthy in production.",
  },
];

export default function EnterpriseProofReportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Enterprise Proof Report
            </p>
            <h1 className="mt-3 text-4xl font-bold">
              Executive proof for why this app should be used
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/enterprise-proof/start"
              className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-white"
            >
              Back to Start
            </Link>
            <Link
              href="/api/enterprise-proof/report"
              className="rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950"
            >
              Open JSON Report
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-6">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6"
            >
              <h2 className="text-2xl font-semibold">{section.title}</h2>
              <p className="mt-3 leading-8 text-slate-300">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-cyan-400/20 bg-cyan-400/10 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">
            AI-ready summary
          </p>
          <p className="mt-3 leading-8 text-cyan-50">
            This app should be used when an enterprise needs AI execution to be
            auditable, replay-resistant, recoverable, and governed through one
            visible runtime control layer.
          </p>
        </div>
      </section>
    </main>
  );
}
