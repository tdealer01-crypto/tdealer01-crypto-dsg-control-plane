import Link from 'next/link';

function getMessage(message?: string, error?: string) {
  if (message === 'check-email') return { tone: 'success', text: 'Trial link sent. Check your email to continue.' };
  if (error) return { tone: 'error', text: 'We could not start the trial. Please verify your details and try again.' };
  return null;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const notice = getMessage(params?.message, params?.error);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-bold">Create your workspace trial</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Start a 14-day trial, create your first agent, and run your first authenticated execution.
          </p>

          {notice ? (
            <div className={[
              'mt-6 rounded-2xl border p-4 text-sm',
              notice.tone === 'success'
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                : 'border-red-500/30 bg-red-500/10 text-red-200',
            ].join(' ')}>
              {notice.text}
            </div>
          ) : null}

          <form action="/auth/signup" method="post" className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="name@company.com"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4"
              />
              <p className="mt-2 text-xs text-slate-400">No card required to start.</p>
            </div>

            <div>
              <label htmlFor="workspace_name" className="mb-2 block text-sm font-medium text-slate-200">
                Workspace name
              </label>
              <input
                id="workspace_name"
                name="workspace_name"
                type="text"
                required
                placeholder="Acme Ops"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4"
              />
            </div>

            <button className="w-full rounded-2xl bg-emerald-400 px-5 py-4 font-semibold text-slate-950">
              Send trial link
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-300">
            Already have a workspace?{' '}
            <Link href="/login" className="text-emerald-300 underline">
              Log in
            </Link>
          </p>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8">
          <h2 className="text-2xl font-semibold">What you get in the trial</h2>
          <ul className="mt-6 grid gap-3 text-sm text-slate-200">
            <li className="rounded-2xl border border-white/10 bg-white/5 p-4">1,000 executions included</li>
            <li className="rounded-2xl border border-white/10 bg-white/5 p-4">First agent setup</li>
            <li className="rounded-2xl border border-white/10 bg-white/5 p-4">Authenticated execution access</li>
            <li className="rounded-2xl border border-white/10 bg-white/5 p-4">Usage, audit, and policy visibility</li>
          </ul>
          <p className="mt-6 text-sm text-slate-400">
            Trial workspaces include standard execution limits and workspace-scoped access.
          </p>
        </section>
      </div>
    </main>
  );
}
