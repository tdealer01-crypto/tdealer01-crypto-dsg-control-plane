import { evaluateManusLevelGate } from '@/lib/dsg/manus-level/capability-gate';

function badge(status: string) {
  if (status === 'PASS') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'PARTIAL') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-red-500/30 bg-red-500/10 text-red-200';
}

export default function ManusLevelPage() {
  const gate = evaluateManusLevelGate();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">DSG Manus-level Gate</p>
          <h1 className="mt-3 text-3xl font-black md:text-5xl">{gate.claim}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
            This page reports the evidence boundary for Manus-style capability. It does not promote the claim until all required runtime proofs exist.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><p className="text-xs text-slate-500">score</p><p className="text-2xl font-black">{Math.round(gate.score * 100)}%</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><p className="text-xs text-slate-500">passed</p><p className="text-2xl font-black">{gate.passed}/{gate.totalRequired}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><p className="text-xs text-slate-500">complete</p><p className="text-2xl font-black">{gate.complete ? 'YES' : 'NO'}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><p className="text-xs text-slate-500">proof hash</p><p className="break-all font-mono text-xs">{gate.proofHash}</p></div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {gate.capabilities.map((capability) => (
            <article key={capability.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-slate-500">{capability.id}</p>
                  <h2 className="mt-1 text-lg font-bold">{capability.label}</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${badge(capability.status)}`}>{capability.status}</span>
              </div>
              {capability.blockedReason && <p className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">{capability.blockedReason}</p>}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Evidence</p>
                {capability.evidence.map((item) => <p key={item} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">{item}</p>)}
              </div>
              <p className="mt-4 text-sm text-indigo-200">Next: {capability.nextAction}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
