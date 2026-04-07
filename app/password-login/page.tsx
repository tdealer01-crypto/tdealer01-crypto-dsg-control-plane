import Link from 'next/link';
import { getSafeNext } from '../../lib/auth/safe-next';

function getErrorMessage(error?: string) {
  if (error === 'missing-email') return 'Please enter your email address.';
  if (error === 'missing-password') return 'Please enter your password.';
  if (error === 'invalid-credentials') return 'Invalid email or password. Please try again.';
  if (error === 'unexpected') return 'Something went wrong. Please try again.';
  return null;
}

export default function PasswordLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; next?: string };
}) {
  const next = getSafeNext(searchParams?.next || '/dashboard');
  const errorMessage = getErrorMessage(searchParams?.error);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Operator access</p>
          <h1 className="mt-4 text-4xl font-bold">Sign in with password</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">Use your existing operator account credentials to continue.</p>

          {errorMessage ? (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{errorMessage}</div>
          ) : null}

          <form action="/auth/password-login" method="post" className="mt-8 space-y-4">
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
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Enter your password"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-slate-100 outline-none"
              />
            </div>

            <button className="w-full rounded-2xl bg-emerald-400 px-5 py-4 font-semibold text-slate-950 transition hover:scale-[1.01]">
              Sign in
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-400">
            Prefer a magic link?{' '}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-emerald-300 underline">
              Back to email login
            </Link>
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-emerald-950/20">
          <div className="rounded-[1.5rem] border border-emerald-400/20 bg-slate-950/90 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Need access help?</p>
            <div className="mt-6 grid gap-4">
              {[
                'Use the same operator email registered in DSG control plane.',
                'If your password is invalid, ask your admin to reset it in Supabase.',
                'Magic-link sign-in remains available from the regular login page.',
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-400/10 font-semibold text-emerald-200">{index + 1}</div>
                  <p className="text-sm leading-7">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
