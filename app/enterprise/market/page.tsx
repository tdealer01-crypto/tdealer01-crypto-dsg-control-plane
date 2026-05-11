import { getAgentAppBuilderMarketReport } from '@/lib/dsg/market/agent-app-builder-market';

const tone = {
  PASS: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  REVIEW: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  BLOCKED: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
} as const;

export const dynamic = 'force-dynamic';

export default function EnterpriseMarketPage() {
  const report = getAgentAppBuilderMarketReport();

  return (
    <main className="min-h-screen bg-[#090b0f] px-5 py-8 text-slate-100 md:px-10">
      <section className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#f2ca50]">Market intelligence registry</p>
          <h1 className="mt-3 font-serif text-4xl font-black tracking-tight md:text-6xl">Evidence-first AI app builder market map</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">{report.positioning}</p>
          <p className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 font-mono text-xs leading-6 text-slate-400">{report.noMockPolicy.rule}</p>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {report.competitors.map((competitor) => (
            <article key={competitor.id} className="rounded-[2rem] border border-white/10 bg-[#111827] p-5">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">{competitor.category}</p>
              <h2 className="mt-2 text-2xl font-black text-white">{competitor.name}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{competitor.positioning}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                  <h3 className="font-bold text-emerald-200">Strengths</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">{competitor.strengths.map((item) => <li key={item}>• {item}</li>)}</ul>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                  <h3 className="font-bold text-amber-200">DSG opportunity</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{competitor.dsgOpportunity}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                <h3 className="font-bold text-cyan-200">Source notes</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">{competitor.sourceNotes.map((item) => <li key={item}>• {item}</li>)}</ul>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          {report.directions.map((direction) => (
            <article key={direction.id} className="rounded-[2rem] border border-white/10 bg-[#111827] p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-black text-white">{direction.title}</h2>
                <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold ${tone[direction.status]}`}>{direction.status}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">{direction.customerNeed}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300"><strong className="text-white">Capability:</strong> {direction.requiredProductCapability}</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">{direction.evidenceRequired.map((item) => <li key={item}>• {item}</li>)}</ul>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
