import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import AutoSetupButton from './AutoSetupButton';

export const dynamic = 'force-dynamic';

async function getWelcomeData(authUserId: string) {
  const admin = getSupabaseAdmin();

  const { data: userRow } = await admin
    .from('users')
    .select('org_id, role')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (!userRow?.org_id) return null;

  const [{ data: org }, { data: billing }] = await Promise.all([
    admin
      .from('organizations')
      .select('name, plan')
      .eq('id', userRow.org_id)
      .maybeSingle(),
    admin
      .from('billing_subscriptions')
      .select('trial_end, plan_key')
      .eq('org_id', userRow.org_id)
      .maybeSingle(),
  ]);

  const trialDaysLeft = billing?.trial_end
    ? Math.max(0, Math.ceil((new Date(billing.trial_end).getTime() - Date.now()) / 86_400_000))
    : null;

  return {
    orgName: org?.name ?? 'Your workspace',
    plan: billing?.plan_key ?? org?.plan ?? 'trial',
    trialDaysLeft,
  };
}

const STEPS = [
  {
    num: '01',
    title: 'Create your API key',
    description:
      'Generate a scoped API key for your first integration. The raw key is shown once — save it securely.',
    href: '/dashboard/api-keys',
    cta: 'Go to API Keys →',
    color: 'border-amber-300/30 bg-amber-300/5',
    ctaColor: 'bg-amber-300 text-slate-950 hover:bg-amber-200',
  },
  {
    num: '02',
    title: 'Follow the Quickstart',
    description:
      'Three REST API calls — declare your session, gate every action, handle ALLOW/BLOCK. No SDK needed.',
    href: '/quickstart',
    cta: 'Open Quickstart →',
    color: 'border-emerald-400/30 bg-emerald-400/5',
    ctaColor: 'bg-emerald-400 text-slate-950 hover:bg-emerald-300',
  },
  {
    num: '03',
    title: 'Watch it work',
    description:
      'Go to your dashboard to see gated actions, audit stamps, and real-time session state.',
    href: '/dashboard',
    cta: 'Open Dashboard →',
    color: 'border-blue-400/30 bg-blue-400/5',
    ctaColor: 'bg-blue-400 text-slate-950 hover:bg-blue-300',
  },
];

export default async function WelcomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const welcome = user?.id ? await getWelcomeData(user.id) : null;

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Workspace ready
          </div>
          <h1 className="mt-2 text-4xl font-black text-white">
            Welcome to{' '}
            <span className="text-amber-300">{welcome?.orgName ?? 'DSG ONE'}</span>
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Your account is active. Follow the 3 steps below to go from zero to a live,
            gated AI agent in under 5 minutes.
          </p>
          {welcome?.trialDaysLeft != null && (
            <p className="mt-3 text-sm text-slate-500">
              Trial · <span className="text-amber-300 font-semibold">{welcome.trialDaysLeft} days</span> remaining
            </p>
          )}
        </div>

        {/* Auto Setup */}
        <div className="mb-6">
          <AutoSetupButton />
        </div>

        {/* Divider */}
        <div className="mb-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-600">หรือตั้งค่าเอง</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className={`rounded-2xl border p-6 ${step.color}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 text-3xl font-black text-white/10">{step.num}</span>
                  <div>
                    <h2 className="text-lg font-bold text-white">{step.title}</h2>
                    <p className="mt-1 max-w-lg text-sm text-slate-400">{step.description}</p>
                  </div>
                </div>
                <Link
                  href={step.href}
                  className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold transition ${step.ctaColor}`}
                >
                  {step.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* What you get */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            What&apos;s included in your trial
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['1,000 gated actions', 'Enough to verify your integration end-to-end'],
              ['Cryptographic audit trail', 'Every ALLOW/BLOCK stamped and tamper-proof'],
              ['EU AI Act coverage', 'Articles 9, 12, and 14 — out of the box'],
              ['API key management', 'Create scoped keys, revoke instantly'],
              ['Admin dashboard', 'Full visibility into sessions and actions'],
              ['Quickstart support', 'Email us if you hit a wall — we reply fast'],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-400">✓</span>
                <div>
                  <p className="text-sm font-semibold text-slate-100">{title}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skip link */}
        <div className="mt-8 text-center">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-300">
            Skip to dashboard →
          </Link>
        </div>

      </div>
    </main>
  );
}
