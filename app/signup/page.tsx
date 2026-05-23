import Link from 'next/link';

type PlanKey = 'trial' | 'pro' | 'business' | 'enterprise';
type Interval = 'monthly' | 'yearly';

const PLAN_LABEL: Record<PlanKey, string> = {
  trial: 'Trial',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

function getMessage(message?: string, error?: string) {
  if (message === 'check-email') return { tone: 'success', text: 'Trial link sent. Check your email to continue.' };
  if (error) return { tone: 'error', text: 'We could not start the trial. Please verify your details and try again.' };
  return null;
}

function normalizePlan(value?: string): PlanKey {
  const plan = String(value || 'trial').toLowerCase();
  if (plan === 'pro') return 'pro';
  if (plan === 'business') return 'business';
  if (plan === 'enterprise') return 'enterprise';
  return 'trial';
}

function normalizeInterval(value?: string): Interval {
  const interval = String(value || 'monthly').toLowerCase();
  return interval === 'yearly' || interval === 'year' ? 'yearly' : 'monthly';
}

function buildPostSignupNext(plan: PlanKey, interval: Interval): string {
  if (plan === 'trial') return '/dashboard/welcome';
  return `/dashboard/billing?plan=${plan}&interval=${interval}`;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; message?: string; plan?: string; interval?: string }>;
}) {
  const params = await searchParams;
  const notice = getMessage(params?.message, params?.error);
  const selectedPlan = normalizePlan(params?.plan);
  const selectedInterval = normalizeInterval(params?.interval);
  const next = buildPostSignupNext(selectedPlan, selectedInterval);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-bold">Create your workspace trial</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Start a workspace first. After email confirmation, you can activate {PLAN_LABEL[selectedPlan]} billing from the dashboard.
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

          {selectedPlan !== 'trial' ? (
            <div className="mt-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              Selected plan: <strong>{PLAN_LABEL[selectedPlan]}</strong> · {selectedInterval === 'yearly' ? 'Yearly' : 'Monthly'}.
              Create your workspace first; checkout resumes after sign-in.
            </div>
          ) : null}

          <form action="/auth/signup" method="post" className="mt-8 space-y-4">
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="plan" value={selectedPlan} />
            <input type="hidden" name="interval" value={selectedInterval} />

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
            Trial workspaces include standard execution limits and workspace-scoped access. Paid checkout requires an authenticated workspace so billing attaches to the correct organization.
          </p>
        </section>
      </div>
    </main>
  );
}
