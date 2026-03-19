export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="mb-4 text-sm uppercase tracking-[0.25em] text-emerald-400">
          DSG
        </p>
        <h1 className="mb-6 text-4xl font-bold md:text-6xl">
          Deterministic Control Plane for Enterprise AI Agents
        </h1>
        <p className="max-w-2xl text-lg text-slate-300">
          Policy-bound execution, audit-ready workflows, Stripe billing, Supabase
          state, and webhook automation in one system.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="/dashboard"
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black"
          >
            Open Dashboard
          </a>
          <a
            href="/api/health"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200"
          >
            Health Check
          </a>
        </div>
      </div>
    </main>
  );
}
