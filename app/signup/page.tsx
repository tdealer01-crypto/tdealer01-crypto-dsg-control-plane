import Link from 'next/link';

function getMessage(message?: string, error?: string) {
  if (message === 'check-email') {
    return {
      tone: 'success',
      text: 'Trial link sent. Check your email to continue setup.',
    };
  }

  if (error === 'invalid-email') {
    return {
      tone: 'error',
      text: 'Use a valid work email address.',
    };
  }

  if (error === 'missing-workspace') {
    return {
      tone: 'error',
      text: 'Workspace name is required.',
    };
  }

  if (error === 'rate-limited') {
    return {
      tone: 'error',
      text: 'A signup was sent recently for this email. Wait a few minutes and try again.',
    };
  }

  if (error === 'already-started') {
    return {
      tone: 'error',
      text: 'A trial for this email already exists. Contact support if you need a reset.',
    };
  }

  if (error === 'send-failed') {
    return {
      tone: 'error',
      text: 'We could not send the trial link. Verify your email and try again.',
    };
  }

  if (error === 'missing-supabase-url') {
    return {
      tone: 'error',
      text: 'Server configuration error: Supabase URL is not configured. Contact your admin.',
    };
  }

  if (error === 'missing-anon-key') {
    return {
      tone: 'error',
      text: 'Server configuration error: Supabase API key is not configured. Contact your admin.',
    };
  }

  if (error === 'missing-service-key') {
    return {
      tone: 'error',
      text: 'Server configuration error: Supabase service key is not configured. Contact your admin.',
    };
  }

  if (error === 'missing-app-url') {
    return {
      tone: 'error',
      text: 'Server configuration error: Application URL is not configured. Contact your admin.',
    };
  }

  if (error === 'signup-failed') {
    return {
      tone: 'error',
      text: 'Signup failed unexpectedly. Please try again.',
    };
  }

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
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Start free trial</p>
          <h1 className="mt-4 text-4xl font-bold">Start your DSG free trial</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Create a workspace in minutes, generate your first agent, run a sample execution through the stable execution entry, and then continue into authenticated operator views for usage, audit, and policy review.
          </p>

          <p className="mt-4 text-sm text-slate-300">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-300 underline">
              Login here →
            </Link>
          </p>

          {notice ? (
            <div
              className={[
                'mt-6 rounded-2xl border p-4 text-sm',
                notice.tone === 'success'
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                  : 'border-red-500/30 bg-red-500/10 text-red-200',
              ].join(' ')}
            >
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
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-slate-100 outline-none"
              />
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
                placeholder="Jane Doe"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-slate-100 outline-none"
              />
            </div>

            <button className="w-full rounded-2xl bg-emerald-400 px-5 py-4 font-semibold text-slate-950 transition hover:scale-[1.01]">
              Send trial magic link
            </button>
          </form>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-slate-100">
              Operator login
            </Link>
            <Link href="/pricing" className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-slate-300">
              View plans
            </Link>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-emerald-950/20">
          <div className="rounded-[1.5rem] border border-emerald-400/20 bg-slate-950/90 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Trial includes</p>
            <div className="mt-6 grid gap-4 text-sm text-slate-200">
              {[
                '14-day free trial',
                '1,000 executions included',
                'Quickstart path to first agent and first sample execution',
                'Authenticated operator views for dashboard, mission, and audit context',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 leading-7">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm text-slate-300">
              <p className="font-semibold text-white">Quota note</p>
              <p className="mt-2 leading-7">
                Trial workspaces include limited executions with standard quota enforcement on the stable execution entry at <code>/api/execute</code>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
