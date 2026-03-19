export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold">DSG Dashboard</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Billing</p>
            <p className="mt-2 text-xl font-semibold">Stripe Ready</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Database</p>
            <p className="mt-2 text-xl font-semibold">Supabase Ready</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Email</p>
            <p className="mt-2 text-xl font-semibold">Resend Ready</p>
          </div>
        </div>
      </div>
    </main>
  );
}
