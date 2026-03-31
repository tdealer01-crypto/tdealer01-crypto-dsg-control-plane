import Link from 'next/link';

function getSafeNext(value?: string) {
  if (!value || !value.startsWith('/')) return '/dashboard/executions';
  return value;
}

function getMessage(message?: string, error?: string) {
  if (message === 'check-email') {
    return {
      tone: 'success',
      text: 'Check your email for the magic link to continue.',
    };
  }

  if (message === 'signed-out') {
    return {
      tone: 'success',
      text: 'Signed out successfully. You can request a new magic link at any time.',
    };
  }

  if (error === 'missing-email') {
    return {
      tone: 'error',
      text: 'Enter your email before continuing.',
    };
  }

  if (error === 'missing-workspace') {
    return {
      tone: 'error',
      text: 'If this email is new, add a workspace name to start a trial.',
    };
  }

  if (error === 'not-allowed') {
    return {
      tone: 'error',
      text: 'This email is not provisioned for operator access. Contact your organization admin or start a free trial.',
    };
  }

  if (error === 'send-failed') {
    return {
      tone: 'error',
      text: 'We could not send the magic link for this operator account. Check email auth delivery and try again.',
    };
  }

  if (error === 'signup-failed') {
    return {
      tone: 'error',
      text: 'We could not start the trial flow. Check your details and try again.',
    };
  }

  if (error === 'not-provisioned') {
    return {
      tone: 'error',
      text: 'This email is authenticated but not provisioned for an active DSG organization yet.',
    };
  }

  if (error === 'invalid-link') {
    return {
      tone: 'error',
      text: 'This login link is invalid or expired. Request a new one.',
    };
  }

  if (error === 'unexpected') {
    return {
      tone: 'error',
      text: 'Unexpected auth error. Check server logs and auth configuration.',
    };
  }

  return null;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; message?: string; next?: string };
}) {
  const next = getSafeNext(searchParams?.next);
  const notice = getMessage(searchParams?.message, searchParams?.error);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Continue with email</p>
          <h1 className="mt-4 text-4xl font-bold">Access DSG in one step</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Enter your work email once. If your account already has operator access, we will send a login link.
            If you are new, add a workspace name and we will start a trial setup flow.
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

          <form action="/auth/continue" method="post" className="mt-8 space-y-4">
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
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-slate-100 outline-none"
              />
            </div>

            <div>
              <label htmlFor="workspace_name" className="mb-2 block text-sm font-medium text-slate-200">
                Workspace name (only for new trial users)
              </label>
              <input
                id="workspace_name"
                name="workspace_name"
                type="text"
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
              Continue with email
            </button>
          </form>

          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-5 text-sm text-slate-300">
            <p className="font-semibold text-white">How it works</p>
            <p className="mt-2 leading-7">
              If your email already maps to an active operator row, workspace details are ignored and you get a login link.
              If not, workspace details are used to start a trial signup flow.
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-emerald-950/20">
          <div className="rounded-[1.5rem] border border-emerald-400/20 bg-slate-950/90 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">What happens next</p>
            <div className="mt-6 grid gap-4">
              {[
                'Existing operator emails receive a magic link for login.',
                'New emails can start a trial when workspace details are included.',
                'The callback verifies the link and creates the session.',
                'Protected dashboard access still requires a valid active org mapping.',
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-400/10 font-semibold text-emerald-200">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-7">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pricing" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-slate-100">
                View plans
              </Link>
              <Link href="/" className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-slate-300">
                Back home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
