import Link from 'next/link';

function getSafeNext(value?: string) {
  if (!value || !value.startsWith('/')) return '/dashboard/executions';
  return value;
}

function getMessage(message?: string, error?: string) {
  if (message === 'check-email') {
    return {
      tone: 'success',
      text: 'Check your email to continue.',
    };
  }

  if (message === 'signed-out') {
    return {
      tone: 'success',
      text: 'You’ve been signed out. Request a new link anytime.',
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

  if (error === 'invalid-email') {
    return {
      tone: 'error',
      text: 'Please enter a valid work email.',
    };
  }


  if (error === 'approval-required') {
    return {
      tone: 'error',
      text: 'Your company requires admin approval before access can be granted.',
    };
  }

  if (error === 'sso-required') {
    return {
      tone: 'error',
      text: 'Your company requires single sign-on.',
    };
  }

  if (error === 'not-allowed') {
    return {
      tone: 'error',
      text: 'This account can’t access DSG yet. Contact your company admin for access.',
    };
  }

  if (error === 'send-failed') {
    return {
      tone: 'error',
      text: 'We couldn’t send your sign-in link. Please try again.',
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
      text: 'This account is not yet ready for access. Contact your admin or request an invitation.',
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
      text: 'Something went wrong. Please try again.',
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
          <h1 className="mt-4 text-4xl font-bold">One login for every access path</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Enter your work email once. Existing accounts get a sign-in link. New teams can start a trial by adding a workspace name.
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
              If your account already exists, we email a sign-in link. If you’re new, add a workspace name and we’ll start your trial setup.
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-emerald-950/20">
          <div className="rounded-[1.5rem] border border-emerald-400/20 bg-slate-950/90 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">What happens next</p>
            <div className="mt-6 grid gap-4">
              {[
                'Existing members receive a secure sign-in link.',
                'New teams can start a trial by adding a workspace name.',
                'The link confirms your session when opened.',
                'Access rules are enforced for your organization after sign-in.',
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
              {searchParams?.error === 'approval-required' ? (
                <Link href="/enterprise-proof/start" className="rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950">
                  Request access
                </Link>
              ) : null}
              {searchParams?.error === 'sso-required' ? (
                <Link href="/enterprise-proof/start" className="rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950">
                  Continue with SSO
                </Link>
              ) : null}
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
