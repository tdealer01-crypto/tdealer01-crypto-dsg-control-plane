import Link from 'next/link';

export default function EnterpriseProofReportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white" data-testid="enterprise-proof-report">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-bold">Why governed runtime matters</h1>
        <p className="mt-4 max-w-4xl text-lg text-slate-300">
          DSG is built for teams that need AI execution to be controlled, reviewable, and operationally trustworthy.
        </p>

        <div className="mt-10 grid gap-5">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">The control model</h2>
            <p className="mt-3 leading-8 text-slate-300">
              DSG evaluates runtime risk before actions continue. Instead of treating execution as a blind pass-through,
              the system returns a visible decision state: ALLOW, STABILIZE, or BLOCK.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">Why teams use it</h2>
            <p className="mt-3 leading-8 text-slate-300">
              Teams use governed runtime when they need clearer execution boundaries, more reviewable outcomes, and a
              more operational path from model output to real action.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">Verification boundary</h2>
            <p className="mt-3 leading-8 text-slate-300">
              This page is a public summary. Verified runtime evidence remains workspace-scoped and available through
              authenticated organizational routes.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">Next step</h2>
            <p className="mt-3 leading-8 text-slate-300">
              Use the Playground to test the gate publicly, or create a workspace trial to validate authenticated
              execution.
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/playground" className="rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950">
            Try the Playground
          </Link>
          <Link href="/signup" className="rounded-2xl border border-white/20 bg-white/5 px-5 py-3 font-semibold text-white">
            Start workspace trial
          </Link>
        </div>
      </section>
    </main>
  );
}
