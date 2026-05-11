export type ProofPanelItem = {
  id: string;
  title: string;
  status: 'PASS' | 'REVIEW' | 'BLOCKED';
  evidence: string[];
  missingEvidence: string[];
  nextAction: string;
};

const tone = {
  PASS: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  REVIEW: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  BLOCKED: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
} as const;

export function AppBuilderProofPanel({ items, productionReadyClaim }: { items: ProofPanelItem[]; productionReadyClaim: boolean }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#0f151f]/85 p-5 shadow-[0_0_44px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-200">Proof panel</p>
          <h2 className="mt-2 text-2xl font-black text-white">Marketplace proof stays fail-closed</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">Every gate is PASS, REVIEW, or BLOCKED. REVIEW/BLOCKED always includes missing evidence and next action.</p>
        </div>
        <span className={`rounded-full border px-4 py-2 font-mono text-xs font-black uppercase tracking-[0.16em] ${productionReadyClaim ? tone.PASS : tone.REVIEW}`}>
          productionReadyClaim={String(productionReadyClaim)}
        </span>
      </div>
      {!productionReadyClaim ? (
        <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-100">No production-ready claim is displayed because deployment proof, enforcement tests, smoke outputs, and owner approvals are not all attached.</p>
      ) : null}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.id}</p>
                <h3 className="mt-1 font-bold text-white">{item.title}</h3>
              </div>
              <span className={`rounded-full border px-3 py-1 font-mono text-[11px] font-black ${tone[item.status]}`}>{item.status}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-bold text-emerald-200">Evidence</h4>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-300">{(item.evidence.length ? item.evidence : ['No evidence attached']).map((entry) => <li key={entry}>• {entry}</li>)}</ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-200">Missing proof</h4>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-300">{(item.missingEvidence.length ? item.missingEvidence : ['No missing proof listed']).map((entry) => <li key={entry}>• {entry}</li>)}</ul>
              </div>
            </div>
            <p className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3 text-xs leading-5 text-cyan-100">Next: {item.nextAction}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
