import { REQUIREMENT_CATALOG } from '@/lib/ccvs/compliance-matrix';

export const metadata = {
  title: 'EU AI Act Compliance — DSG ONE ProofGate',
  description: 'EU AI Act Article 9, 12, 14 compliance mapping for DSG ONE runtime governance platform.',
};

const EU_ARTICLES: Record<string, { title: string; description: string; dsgResponse: string }> = {
  'Article 9': {
    title: 'Risk management system',
    description: 'High-risk AI systems must have a continuous risk management system throughout lifecycle.',
    dsgResponse: 'DSG runtime gate evaluates risk scores on every action. STABILIZE and BLOCK decisions prevent high-risk execution. Evidence recorded on each decision.',
  },
  'Article 12': {
    title: 'Record-keeping and logging',
    description: 'Logs must be automatically generated, tamper-evident, and retained for the defined period.',
    dsgResponse: 'WORM audit trail with SHA-256 hash chain: requestHash → decisionHash → recordHash. Immutable evidence envelopes with integrity verification.',
  },
  'Article 14': {
    title: 'Human oversight',
    description: 'Appropriate human oversight measures must be built into high-risk AI systems.',
    dsgResponse: 'Owner approval required before device execution on Android agent. Finance governance requires human approve/reject/escalate for every action.',
  },
};

export default function EuAiActPage() {
  const euControls = REQUIREMENT_CATALOG.filter((r) => r.framework === 'EU AI Act');

  const byArticle = euControls.reduce<Record<string, typeof euControls>>((acc, r) => {
    (acc[r.article_or_section] ??= []).push(r);
    return acc;
  }, {});

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Regulatory Mapping</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">EU AI Act</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          DSG ONE control mapping to EU AI Act requirements for high-risk AI system governance.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm text-amber-200">
        <strong>Boundary:</strong> Pre-audit evidence mapping only. Not a legal certification. No independent audit certification claimed.
        Consult qualified legal counsel for compliance determinations.
      </div>

      <div className="mt-10 space-y-8">
        {Object.entries(EU_ARTICLES).map(([article, info]) => {
          const controls = byArticle[article] ?? [];
          return (
            <div key={article} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">{article}</p>
                  <h2 className="mt-1 text-xl font-bold text-white">{info.title}</h2>
                  <p className="mt-2 text-sm text-slate-400">{info.description}</p>
                </div>
                <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs text-amber-300">
                  {controls.length} control{controls.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-200">
                <strong>DSG response:</strong> {info.dsgResponse}
              </div>

              {controls.length > 0 && (
                <div className="mt-5 space-y-3">
                  {controls.map((c) => (
                    <div key={c.requirement_id} className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
                      <div className="flex items-center justify-between">
                        <code className="text-xs text-cyan-300">{c.requirement_id}</code>
                        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">
                          pending
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-white">{c.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{c.control_description}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>Evidence: <span className="text-slate-300">{c.evidence_type}</span></span>
                        <span>·</span>
                        <span>Min L{c.min_severity_level}</span>
                        <span>·</span>
                        <span>Test: <code className="text-slate-300">{c.test_file}</code></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-12 flex flex-wrap gap-4">
        <a
          href="/compliance/evidence"
          className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white"
        >
          View full evidence chain
        </a>
        <a
          href="/api/compliance/export?format=audit-log.json&framework=EU+AI+Act"
          className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-6 py-3 font-semibold text-cyan-100"
        >
          Export EU AI Act audit log
        </a>
      </div>
    </main>
  );
}
