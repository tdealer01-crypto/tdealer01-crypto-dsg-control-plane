import { getAccessibilityQaReport } from '@/lib/dsg/marketplace/accessibility-qa';
import { ACCESSIBILITY_REVIEW_CHECKLIST } from '@/lib/dsg/marketplace/accessibility-checklist';

const tone = {
  PASS: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  REVIEW: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  BLOCKED: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
} as const;

export const dynamic = 'force-dynamic';

export default function EnterpriseAccessibilityPage() {
  const report = getAccessibilityQaReport();

  return (
    <main className="min-h-screen bg-[#090b0f] px-5 py-8 text-slate-100 md:px-10">
      <section className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-200">Enterprise Accessibility QA</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="font-serif text-4xl font-black tracking-tight md:text-6xl">Accessibility and QA Evidence</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">Evidence checklist for accessibility and QA review. PASS requires attached review notes or smoke output.</p>
            </div>
            <span className={`w-fit rounded-full border px-4 py-2 font-mono text-xs font-black uppercase tracking-[0.18em] ${tone[report.verdict]}`}>{report.verdict}</span>
          </div>
          <p className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 font-mono text-xs leading-6 text-slate-400">{report.noMockPolicy.rule}</p>
        </header>


        <section className="mt-6 rounded-[2rem] border border-white/10 bg-[#111827] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">Manual review checklist</p>
          <h2 className="mt-2 text-2xl font-black text-white">Accessibility Review Notes must be filled by a reviewer</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">This checklist stays REVIEW until real notes are attached. It does not mark WCAG PASS automatically.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {ACCESSIBILITY_REVIEW_CHECKLIST.map((item) => (
              <article key={`${item.section}-${item.label}`} className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber-200">{item.section} · {item.status}</p>
                <h3 className="mt-2 font-bold text-white">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">Next: {item.nextAction}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {report.checks.map((check) => (
            <article key={check.id} className="rounded-[2rem] border border-white/10 bg-[#111827] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">{check.id}</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{check.title}</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold ${tone[check.status]}`}>{check.status}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">{check.userBenefit}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                  <h3 className="font-bold text-emerald-200">Evidence</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                    {(check.evidence.length ? check.evidence : ['No attached evidence yet']).map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                  <h3 className="font-bold text-amber-200">Required</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                    {check.requiredBeforePass.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
              </div>
              <p className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4 text-sm leading-6 text-slate-300">Next: {check.nextAction}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
