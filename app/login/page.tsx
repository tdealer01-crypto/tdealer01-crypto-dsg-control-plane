import Link from 'next/link';
import { Suspense } from 'react';
import LoginForm from '../../components/LoginForm';
import { resolveLoginContext } from '../../lib/auth/login-context';
import { getSafeNext } from '../../lib/auth/safe-next';

function getMessage(message?: string, error?: string) {
  if (message === 'check-email') return { tone: 'success', text: 'Check your email for the recovery link.' };
  if (error) return { tone: 'error', text: 'Unable to complete login. Please try again.' };
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; message?: string; next?: string; org?: string }>;
}) {
  const params = await searchParams;
  const next = getSafeNext(params?.next);
  const notice = getMessage(params?.message, params?.error);
  const context = await resolveLoginContext({ orgSlug: params?.org });
  const passwordHref = `/password-login?next=${encodeURIComponent(next)}`;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-bold">Log in to your workspace</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">Use password login if your workspace already exists.</p>

          {notice ? <div className={['mt-6 rounded-2xl border p-4 text-sm', notice.tone === 'success' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-red-500/30 bg-red-500/10 text-red-200'].join(' ')}>{notice.text}</div> : null}

          <div className="mt-8 space-y-4">
            <label className="block text-sm text-slate-300">Work email</label>
            <input
              type="email"
              placeholder="name@company.com"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
              disabled
            />
            <Link href={passwordHref} className="block w-full rounded-2xl bg-emerald-400 px-5 py-4 text-center font-semibold text-slate-950">
              Continue with password
            </Link>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="text-sm text-slate-300">Need help accessing your workspace?</p>
            <h2 className="mt-2 text-xl font-semibold">Send a recovery link</h2>
            <p className="mt-2 text-sm text-slate-300">
              Enter your work email and we will send a secure recovery link if your workspace is active.
            </p>
            <Suspense fallback={null}>
              <LoginForm next={next} orgSlug={context.org?.slug} ssoFirst={false} />
            </Suspense>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8">
          <p className="text-sm text-slate-300">New to DSG?</p>
          <p className="mt-2 text-lg text-slate-100">Start a workspace trial to create your first authenticated environment.</p>
          <Link href="/signup" className="mt-5 inline-flex rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950">
            Start workspace trial
          </Link>

          <p className="mt-8 text-sm text-slate-400">
            Usage, audit, policy, capacity, and execution review are available inside authenticated workspaces.
          </p>
        </div>
      </div>
    </main>
  );
}
