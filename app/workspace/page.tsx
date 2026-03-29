import Link from 'next/link';

export default function WorkspacePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Workspace</p>
        <h1 className="mt-4 text-4xl font-bold">DSG Operator Workspace</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          Authentication is complete and this account is provisioned. Continue into mission dashboards
          or run the quickstart execution path.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/quickstart"
            className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-center font-semibold text-emerald-100"
          >
            Open Quickstart
          </Link>
          <Link
            href="/dashboard/executions"
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 text-center font-semibold text-slate-100"
          >
            Go to Executions Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
