import { REQUIREMENT_CATALOG } from '@/lib/ccvs/compliance-matrix';
import { EVIDENCE_SEVERITY } from '@/lib/ccvs/evidence-collector';

export const metadata = {
  title: 'Evidence Chain — DSG ONE ProofGate',
  description: 'CCVS L1–L5 evidence chain and compliance control status for DSG ONE governance platform.',
};

const LEVEL_LABEL: Record<number, string> = {
  1: 'L1 Unit',
  2: 'L2 Integration',
  3: 'L3 Adversarial',
  4: 'L4 Mutation/Oversight',
  5: 'L5 Provenance',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
  pass: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
  fail: 'text-red-300 bg-red-400/10 border-red-400/20',
  not_verified: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

export default function EvidencePage() {
  const byFramework = REQUIREMENT_CATALOG.reduce<Record<string, typeof REQUIREMENT_CATALOG>>((acc, r) => {
    (acc[r.framework] ??= []).push(r);
    return acc;
  }, {});

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">CCVS Evidence Chain</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Compliance evidence</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          L1–L5 evidence chain for DSG ONE runtime governance. Each control maps to a test file, evidence type, and minimum severity level.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm text-amber-200">
        <strong>Boundary:</strong> Pre-audit evidence mapping only. Not a legal certification or independent audit result.{' '}
        <code>certificationClaim=false</code> · <code>independentAuditClaim=false</code>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {Object.entries(EVIDENCE_SEVERITY).map(([type, level]) => (
          <div key={type} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{type}</p>
            <p className="mt-2 text-2xl font-bold text-white">{LEVEL_LABEL[level]}</p>
          </div>
        ))}
      </div>

      {Object.entries(byFramework).map(([framework, controls]) => (
        <section key={framework} className="mt-12">
          <h2 className="text-xl font-bold text-white">{framework}</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Requirement</th>
                  <th className="px-5 py-3 font-medium">Article</th>
                  <th className="px-5 py-3 font-medium">Control</th>
                  <th className="px-5 py-3 font-medium">Evidence type</th>
                  <th className="px-5 py-3 font-medium">Min level</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {controls.map((r) => (
                  <tr key={r.requirement_id} className="border-t border-white/10">
                    <td className="px-5 py-3 font-mono text-xs text-cyan-300">{r.requirement_id}</td>
                    <td className="px-5 py-3 text-slate-300">{r.article_or_section}</td>
                    <td className="px-5 py-3 text-white">{r.title}</td>
                    <td className="px-5 py-3 text-slate-400">{r.evidence_type}</td>
                    <td className="px-5 py-3 text-slate-400">{LEVEL_LABEL[r.min_severity_level]}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR['pending']}`}>
                        pending
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <div className="mt-12 flex flex-wrap gap-4">
        <a
          href="/compliance/export"
          className="rounded-2xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950"
        >
          Export compliance bundle
        </a>
        <a
          href="/api/compliance/export?format=evidence.json"
          className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white"
        >
          Download evidence.json
        </a>
      </div>
    </main>
  );
}
