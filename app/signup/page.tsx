import Link from 'next/link';

function getSafeNext(value?: string) {
  if (!value || !value.startsWith('/')) return '/quickstart';
  return value;
}

function getMessage(message?: string, error?: string) {
  if (message === 'check-email') {
    return {
      tone: 'success',
      text: 'Trial magic link sent. Open the email you entered to finish creating your workspace.',
    };
  }

  if (error === 'missing-email') {
    return {
      tone: 'error',
      text: 'Enter your email before starting the free trial.',
    };
  }

  if (error === 'missing-workspace') {
    return {
      tone: 'error',
      text: 'Enter a workspace name so DSG can create your trial organization.',
    };
  }

  if (error === 'signup-failed') {
    return {
      tone: 'error',
      text: 'We could not start the free trial. Try again or check signup provisioning settings.',
    };
  }

  if (error === 'already-provisioned') {
    return {
      tone: 'success',
      text: 'This email already has access. Sign in instead and continue in the control plane.',
    };
  }

  return null;
}

export default function SignupPage({
  searchParams,
}: {
  searchParams?: { error?: string; message?: string; next?: string };
}) {
  const next = getSafeNext(searchParams?.next);
  const notice = getMessage(searchParams?.message, searchParams?.error);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.95fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Start Free Trial</p>
          <h1 className="mt-4 text-4xl font-bold">Try DSG before you commit</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Create a trial workspace, generate your first agent, run a real execution, and open the live mission monitor in minutes.
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
            <input type="hidden" name="next" value={next} />

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
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-slate-100 outline-none placeholder:text-slate-500"
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
                placeholder="Acme Security Lab"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label htmlFor="full_name" className="mb-2 block text-sm font-medium text-slate-200">
                Full name <span className="text-slate-500">(optional)</span>
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Thanawat Suparongsuwan"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>

            <button className="w-full rounded-2xl bg-emerald-400 px-5 py-4 font-semibold text-slate-950 transition hover:scale-[1.01]">
              Start free trial
            </button>
          </form>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Trial</p>
              <p className="mt-3 text-2xl font-semibold">14 days</p>
              <p className="mt-2 text-sm text-slate-300">Start with a real workspace instead of a fake demo account.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Included</p>
              <p className="mt-3 text-2xl font-semibold">1000 exec</p>
              <p className="mt-2 text-sm text-slate-300">Enough to create an agent, test policies, and validate monitor flows.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Outcome</p>
              <p className="mt-3 text-2xl font-semibold">Quickstart</p>
              <p className="mt-2 text-sm text-slate-300">Create your first agent and open the live entropy monitor right away.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-emerald-950/20">
          <div className="rounded-[1.5rem] border border-emerald-400/20 bg-slate-950/90 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">What you get</p>
            <div className="mt-6 grid gap-4">
              {[
                'Trial workspace auto-provisioned after email confirmation.',
                'Starter agent generation and first execution walkthrough.',
                'Live command workspace with monitor, readiness, and alerts.',
                'Trial quota and billing state visible from day one.',
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-400/10 font-semibold text-emerald-200">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-7">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
              <p className="font-semibold text-white">Already provisioned?</p>
              <p className="mt-2 leading-7">
                If your team already set up your DSG operator account, use the existing login flow instead of creating a new trial workspace.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex rounded-2xl border border-white/10 px-4 py-3 font-semibold text-slate-100"
              >
                Sign in instead
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
