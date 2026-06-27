import Link from "next/link";

const assets = [
  { href: "/docs/consult-toolkit/audit-readiness-checklist", title: "Audit Readiness Checklist", body: "Structured consultant checklist for pilot, buyer, and governance review." },
  { href: "/evidence-pack", title: "Evidence Pack", body: "Exportable evidence bundle with hashes and portable proof." },
  { href: "/controls", title: "Control Templates", body: "Reusable governance controls mapped to operational risk." },
  { href: "/approvals?orgId=org-smoke", title: "Approval Workflow", body: "Review queue and reviewer-decision governance flow." },
  { href: "/marketplace/production-evidence", title: "Production Evidence", body: "Benchmark, baseline, and deterministic production claims boundary." },
];

export default function ConsultPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-violet-500/30 bg-violet-500/10 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.25em] text-violet-300">Consult & Audit Toolkit</p>
          <h1 className="mt-4 text-4xl font-black md:text-6xl">Operational governance toolkit for consultants, auditors, and enterprise buyers</h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            DSG provides working governance flows, evidence exports, deterministic controls, and audit-readiness frameworks for AI action deployment reviews.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/evidence-pack" className="rounded-xl bg-violet-400 px-5 py-3 font-bold text-black">Open evidence pack</Link>
            <Link href="/controls" className="rounded-xl border border-violet-300/40 px-5 py-3 font-bold text-violet-100">Open controls</Link>
            <Link href="/approvals?orgId=org-smoke" className="rounded-xl border border-violet-300/40 px-5 py-3 font-bold text-violet-100">Open approval queue</Link>
          </div>
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {assets.map((asset) => (
            <Link key={asset.href} href={asset.href} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-violet-400/50">
              <h2 className="text-2xl font-bold">{asset.title}</h2>
              <p className="mt-3 leading-7 text-slate-300">{asset.body}</p>
              <p className="mt-4 font-bold text-violet-300">Open →</p>
            </Link>
          ))}
        </section>
        <section className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
          <h2 className="text-2xl font-bold">Boundary</h2>
          <p className="mt-3 leading-7 text-slate-300">
            DSG consult and audit assets support governance and readiness assessment. They are not independent certification or legal compliance guarantees.
          </p>
        </section>
      </div>
    </main>
  );
}
