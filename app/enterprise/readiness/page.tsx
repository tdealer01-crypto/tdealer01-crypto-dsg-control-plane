import { getEnterpriseMarketplaceReadinessReport } from '@/lib/dsg/marketplace/readiness';

const statusTone = {
  PASS: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  REVIEW: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  BLOCKED: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
} as const;

export const dynamic = 'force-dynamic';

export default function EnterpriseReadinessPage() {
  const report = getEnterpriseMarketplaceReadinessReport();

  return (
    <main className="min-h-screen bg-[#090b0f] px-5 py-8 text-slate-100 md:px-10">
      <section className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-amber-200">Enterprise Marketplace Audit Kit</p>
              <h1 className="mt-3 font-serif text-4xl font-black tracking-tight md:text-6xl">DSG ONE V1 readiness review</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{report.summary}</p>
            </div>
            <span className={`w-fit rounded-full border px-4 py-2 font-mono text-xs font-black uppercase tracking-[0.18em] ${statusTone[report.verdict]}`}>
              {report.verdict}
            </span>
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 font-mono text-xs leading-6 text-slate-400">
            <p>kit: {report.kit}</p>
            <p>generatedAt: {report.generatedAt}</p>
            <p>policy: {report.noMockPolicy.rule}</p>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {report.gates.map((gate) => (
            <article key={gate.id} className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 backdrop-blur-xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">{gate.id}</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{gate.title}</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold ${statusTone[gate.status]}`}>{gate.status}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">{gate.userBenefit}</p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                  <h3 className="font-bold text-emerald-200">Verified evidence</h3>
                  {gate.verifiedEvidence.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                      {gate.verifiedEvidence.map((item) => <li key={item}>✓ {item}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No attached proof yet.</p>
                  )}
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                  <h3 className="font-bold text-amber-200">Required evidence</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                    {gate.requiredEvidence.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                <h3 className="font-bold text-cyan-200">Next action</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{gate.nextAction}</p>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
