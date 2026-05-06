import Link from 'next/link';

export default function JobPage({ params }: { params: { jobId: string } }) {
  const jobId = params.jobId;
  const previewHref = '/generated-apps/2f3b20b0-824c-4d4a-ae6a-250bd18f3392';
  const phases = [
    ['Goal locked', 'User command is captured and hashed before execution.', 'ready'],
    ['PRD draft', 'Generate product requirements from the locked goal.', 'waiting'],
    ['Plan observer', 'Check feasibility, risk, allowed paths, and required secrets.', 'waiting'],
    ['Approval handoff', 'Human/operator approval before runtime execution.', 'waiting'],
    ['Engine run', 'DSG Native / Gemini adapter / coding-agent adapter runs only inside guardrails.', 'blocked'],
    ['Preview', 'Show the generated app beside the command workflow.', 'ready'],
    ['Evidence', 'Build, PR, database, audit, and deployment proof required before production claim.', 'blocked'],
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-8 shadow-2xl shadow-indigo-950/30">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-200">App Builder Job Timeline</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_0.7fr] lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">Job {jobId}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                This page explains what must happen before a generated app can be claimed as deployable or production verified. It is designed for users who need clear next steps, not raw logs.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Current claim</p>
              <p className="mt-2 text-2xl font-black text-white">IMPLEMENTED_UNVERIFIED / PLANNED_ONLY</p>
              <p className="mt-2 text-sm leading-6 text-amber-50">Production claim stays blocked until build, deploy, audit, and live proof are recorded.</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dsg/app-builder" className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-500">Back to builder</Link>
            <Link href={previewHref} className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-100">Open live preview</Link>
            <Link href="/product-ready" className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-5 py-3 text-sm font-black text-amber-100">Product-ready gate</Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Monitor</p>
            <h2 className="mt-2 text-2xl font-black text-white">User-readable workflow state</h2>
            <div className="mt-5 space-y-3">
              {phases.map(([title, detail, state]) => (
                <div key={title} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-white">{title}</p>
                    <span className={[
                      'rounded-full border px-2.5 py-1 text-xs font-bold uppercase',
                      state === 'ready' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100' : state === 'blocked' ? 'border-rose-400/40 bg-rose-500/10 text-rose-100' : 'border-slate-700 bg-slate-900 text-slate-300',
                    ].join(' ')}>{state}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-indigo-500/30 bg-slate-900">
            <div className="border-b border-slate-800 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-200">Side preview</p>
              <h2 className="mt-1 text-2xl font-black text-white">Generated app preview</h2>
            </div>
            <iframe title="Generated app preview" src={previewHref} className="h-[720px] w-full bg-slate-950" />
          </div>
        </section>
      </div>
    </main>
  );
}
