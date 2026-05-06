import {assessProductReadiness} from '@/lib/dsg/product-ready/readiness';

function badgeClass(status: string) {
  if (status === 'PASS') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
  if (status === 'WARN') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
}

export default function ProductReadyPage() {
  const report = assessProductReadiness();
  const ready = report.level !== 'BLOCKED';

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/30">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-300">DSG ONE V1</p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">Product Ready Fullstack Gate</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Visible fail-closed readiness check for DSG ONE V1. The UI checks environment and evidence gates before allowing any production-ready claim.
              </p>
            </div>
            <div className={`rounded-2xl border px-5 py-4 text-center ${ready ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'}`}>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current Level</p>
              <p className={`mt-2 text-2xl font-black ${ready ? 'text-emerald-200' : 'text-rose-200'}`}>{report.level}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(report.decisionFrame.statistics.stats).map(([key, value]) => (
            <div key={key} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-500">Parami statistic</p>
              <p className="mt-1 truncate font-mono text-sm text-slate-200">{key}</p>
              <p className="mt-2 text-2xl font-black text-indigo-200">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Production readiness checks</h2>
            <div className="mt-5 space-y-3">
              {report.checks.map((check) => (
                <div key={check.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-bold text-slate-100">{check.label}</p>
                      <p className="mt-1 text-xs font-mono text-slate-500">{check.evidence}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${badgeClass(check.status)}`}>{check.status}</span>
                  </div>
                  {check.requiredForProduction && <p className="mt-3 text-xs text-slate-500">Required before production claim.</p>}
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-5">
              <h2 className="text-xl font-bold text-indigo-100">Decision frame</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div><dt className="text-slate-400">verify(data)</dt><dd className="font-mono text-indigo-100">{report.decisionFrame.verification.status}</dd></div>
                <div><dt className="text-slate-400">samadhi(target)</dt><dd className="font-mono text-indigo-100">{report.decisionFrame.targetLock.state}</dd></div>
                <div><dt className="text-slate-400">kilesa(risk)</dt><dd className="font-mono text-indigo-100">{report.decisionFrame.unverifiedRisk.state}</dd></div>
              </dl>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-bold">Next actions</h2>
              <ol className="mt-4 space-y-3 text-sm text-slate-300">
                {report.nextActions.map((action) => <li key={action} className="rounded-xl bg-slate-950/70 p-3">{action}</li>)}
              </ol>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
