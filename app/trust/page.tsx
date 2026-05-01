import Link from "next/link";

const routes = [
  { href: "/case-studies", title: "Case Studies", body: "Pilot and buyer story structure for external proof." },
  { href: "/reproducibility", title: "Reproducibility", body: "How to reproduce benchmark, UX, and evidence checks." },
  { href: "/security-review", title: "Security Review", body: "Security review scope, evidence boundaries, and next trust steps." },
  { href: "/customer-reference", title: "Customer Reference", body: "Reference-pack structure for pilots, partners, and enterprise buyers." },
  { href: "/marketplace/production-evidence", title: "Production Evidence", body: "Current benchmark and runtime evidence already published." },
  { href: "/evidence-pack", title: "Evidence Pack", body: "Signed/hash evidence bundle for audit-ready review." },
];

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Phase 5 External Trust</p>
          <h1 className="mt-4 text-4xl font-black md:text-6xl">Buyer trust and external validation hub</h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            DSG trust assets help buyers, consultants, and reviewers verify what exists today, reproduce core evidence, and understand what still requires external validation.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/reproducibility" className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-black">Run reproducibility path</Link>
            <Link href="/case-studies" className="rounded-xl border border-emerald-300/40 px-5 py-3 font-bold text-emerald-100">Open case-study pack</Link>
            <Link href="/evidence-pack" className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200">Open evidence pack</Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {routes.map((route) => (
            <Link key={route.href} href={route.href} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-emerald-400/50">
              <h2 className="text-2xl font-bold text-white">{route.title}</h2>
              <p className="mt-3 leading-7 text-slate-300">{route.body}</p>
              <p className="mt-4 font-bold text-emerald-300">Open →</p>
            </Link>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
          <h2 className="text-2xl font-bold">Boundary</h2>
          <p className="mt-3 leading-7 text-slate-300">
            This hub organizes validation assets. It does not claim independent third-party certification, completed outside audit, or guaranteed compliance.
          </p>
        </section>
      </div>
    </main>
  );
}
