import Link from 'next/link';
import { Suspense } from 'react';
import LoginForm from '../../components/LoginForm';
import { resolveLoginContext } from '../../lib/auth/login-context';
import { getSafeNext } from '../../lib/auth/safe-next';

function getMessage(message?: string, error?: string) {
  if (message === 'check-email') return { tone: 'success', text: 'Check your email for the magic link to continue.' };
  if (message === 'signed-out') return { tone: 'success', text: 'Signed out successfully. You can request a new magic link at any time.' };
  if (error === 'invalid-email') return { tone: 'error', text: 'Enter a valid email address before continuing.' };
  if (error === 'approval-required') return { tone: 'error', text: 'This domain requires admin approval. Request access and wait for review.' };
  if (error === 'missing-email') return { tone: 'error', text: 'Enter your email before continuing.' };
  if (error === 'missing-workspace') return { tone: 'error', text: 'If this email is new, add a workspace name to start a trial.' };
  if (error === 'not-allowed') return { tone: 'error', text: 'This email is not provisioned for operator access. Contact your organization admin or start a free trial.' };
  if (error === 'send-failed') return { tone: 'error', text: 'We could not send the magic link for this operator account. Check email auth delivery and try again.' };
  if (error === 'signup-failed') return { tone: 'error', text: 'We could not start the trial flow. Check your details and try again.' };
  if (error === 'not-provisioned') return { tone: 'error', text: 'This email is authenticated but not provisioned for an active DSG organization yet.' };
  if (error === 'invalid-link') return { tone: 'error', text: 'This login link is invalid or expired. Request a new one.' };
  if (error === 'sso-required') return { tone: 'error', text: 'Your company requires single sign-on.' };
  if (error === 'rate-limited') return { tone: 'error', text: 'Too many login attempts. Wait 1 minute, then try again.' };
  if (error === 'sso-unavailable') return { tone: 'error', text: 'Single sign-on is not available for this login right now.' };
  if (error === 'org-self-serve-disabled') return { tone: 'error', text: 'Your company does not allow self-serve access for this login path.' };
  if (error === 'missing-supabase-url') return { tone: 'error', text: 'Server configuration error: Supabase URL is not configured. Contact your admin.' };
  if (error === 'missing-anon-key') return { tone: 'error', text: 'Server configuration error: Supabase API key is not configured. Contact your admin.' };
  if (error === 'missing-service-key') return { tone: 'error', text: 'Server configuration error: Supabase service key is not configured. Contact your admin.' };
  if (error === 'missing-app-url') return { tone: 'error', text: 'Server configuration error: Application URL is not configured. Contact your admin.' };
  if (error === 'unexpected') return { tone: 'error', text: 'Unexpected auth error. Check server logs and auth configuration.' };
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
  const ssoHref = `/sso/start?next=${encodeURIComponent(next)}${context.org?.slug ? `&org=${encodeURIComponent(context.org.slug)}` : ''}`;
  const ssoOnly = context.mode === 'sso-only';
  const ssoFirst = context.mode === 'sso-first';

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">{context.org ? context.org.name : 'Continue with email'}</p>
          <h1 className="mt-4 text-4xl font-bold">Access DSG in one step</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            {ssoOnly || ssoFirst
              ? 'Continue with your company SSO to access your organization workspace.'
              : 'Login with your work email, or start a free trial if you are new.'}
          </p>

          {notice ? <div className={['mt-6 rounded-2xl border p-4 text-sm', notice.tone === 'success' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-red-500/30 bg-red-500/10 text-red-200'].join(' ')}>{notice.text}</div> : null}

          {(ssoOnly || ssoFirst) && (
            <div className="mt-6 space-y-3">
              <Link href={ssoHref} className="block w-full rounded-2xl bg-emerald-400 px-5 py-4 text-center font-semibold text-slate-950">
                Continue with your company SSO
              </Link>
              <p className="text-sm text-slate-300">Continue with SSO for organization-managed login.</p>
              {ssoOnly ? null : <p className="text-sm text-slate-300">Use email recovery link</p>}
            </div>
          )}

          {!ssoOnly && (
            <div className="mt-8">
              <Suspense fallback={null}>
                <LoginForm next={next} orgSlug={context.org?.slug} ssoFirst={ssoFirst} />
              </Suspense>
              <p className="mt-4 text-center text-sm text-slate-400">
                Prefer password login?{' '}
                <Link href={`/password-login?next=${encodeURIComponent(next)}`} className="text-emerald-300 underline">
                  Use password instead
                </Link>
              </p>
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-emerald-950/20">
          <div className="rounded-[1.5rem] border border-emerald-400/20 bg-slate-950/90 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">What happens next</p>
            <div className="mt-6 grid gap-4">
              {[
                'Use the Login tab to sign in with your existing work email.',
                'Use the Start Trial tab to create a new workspace with a 14-day free trial.',
                'We send a magic link to your email — click it to continue.',
                'Protected dashboard access requires a valid active organization.',
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-400/10 font-semibold text-emerald-200">{index + 1}</div>
                  <p className="text-sm leading-7">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pricing" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-slate-100">View plans</Link>
              <Link href="/request-access" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-slate-100">Request access</Link>
              <Link href="/" className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-slate-300">Back home</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
