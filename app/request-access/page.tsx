export default async function RequestAccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ email?: string; workspace_name?: string; success?: string }>;
}) {
  const params = await searchParams;
  const email = String(params?.email || '').trim().toLowerCase();
  const workspaceName = String(params?.workspace_name || '').trim();
  const success = params?.success === '1';

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Request access</p>
        <h1 className="mt-4 text-4xl font-bold">Your organization requires approval</h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          Submit this short request and an admin can review access for your workspace.
        </p>

        {success ? (
          <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Thanks — your request was received. We’ll email you after review.
          </div>
        ) : null}

        <form action="/api/access/request" method="post" className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={email}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-slate-100 outline-none"
            />
          </div>

          <div>
            <label htmlFor="workspace_name" className="mb-2 block text-sm font-medium text-slate-200">
              Workspace name (optional)
            </label>
            <input
              id="workspace_name"
              name="workspace_name"
              type="text"
              defaultValue={workspaceName}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-slate-100 outline-none"
            />
          </div>

          <div>
            <label htmlFor="full_name" className="mb-2 block text-sm font-medium text-slate-200">
              Full name (optional)
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-slate-100 outline-none"
            />
          </div>

          <div>
            <label htmlFor="reason" className="mb-2 block text-sm font-medium text-slate-200">
              Reason (optional)
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-slate-100 outline-none"
            />
          </div>

          <button className="w-full rounded-2xl bg-emerald-400 px-5 py-4 font-semibold text-slate-950 transition hover:scale-[1.01]">
            Submit request
          </button>
        </form>
      </div>
    </main>
  );
}
