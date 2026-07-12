import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { OnboardingChecklist } from '../../../components/OnboardingChecklist';
import RoleSelector, { type OnboardingRole } from '../../../components/RoleSelector';
import { getStepsForRole, getDefaultSteps } from '../../../lib/onboarding/role-based-flows';
import AutoSetupButton from './AutoSetupButton';

export const dynamic = 'force-dynamic';

async function getWelcomeData(authUserId: string) {
  const admin = getSupabaseAdmin();

  const { data: userRow } = await admin
    .from('users')
    .select('id, org_id, role')
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

  // Query onboarding_role separately to handle potential schema drift during migration
  const { data: onboardingData } = await admin
    .from('users')
    .select('onboarding_role')
    .eq('id', userRow.id)
    .maybeSingle()
    .catch(() => ({ data: null }));

  return {
    orgName: org?.name ?? 'Your workspace',
    plan: billing?.plan_key ?? org?.plan ?? 'trial',
    trialDaysLeft,
    onboardingRole: (onboardingData?.onboarding_role as OnboardingRole) || null,
    userId: userRow.id,
  };
}


async function WelcomePage() {
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
            Your account is active. {welcome?.onboardingRole ?
              'Follow your role-specific steps to set up DSG ONE.' :
              'Tell us your role so we can customize your setup experience.'
            }
          </p>
          {welcome?.trialDaysLeft != null && (
            <p className="mt-3 text-sm text-slate-500">
              Trial · <span className="text-amber-300 font-semibold">{welcome.trialDaysLeft} days</span> remaining
            </p>
          )}
        </div>

        {/* Role selector (if not yet selected) */}
        {!welcome?.onboardingRole && (
          <RoleSelector onRoleSelect={async () => {
            // Page reload is handled by RoleSelector component after API save
          }} />
        )}

        {/* Auto Setup */}
        {welcome?.onboardingRole && (
          <div className="mb-6">
            <AutoSetupButton />
          </div>
        )}

        {/* Divider */}
        {welcome?.onboardingRole && (
          <div className="mb-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-600">หรือตั้งค่าเอง</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>
        )}

        {/* Steps */}
        {welcome?.onboardingRole && (
          <div className="space-y-4">
            {getStepsForRole(welcome.onboardingRole).map((step) => (
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
                      {step.roleContext && (
                        <p className="mt-2 text-xs text-slate-500">{step.roleContext}</p>
                      )}
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
        )}

        {/* What you get */}
        {welcome?.onboardingRole && (
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
        )}

        {/* Skip link */}
        <div className="mt-8 text-center">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-300">
            Skip to dashboard →
          </Link>
        </div>

      </div>

      {/* Evidence-based onboarding guide with mascot (floating, dismissible) */}
      <OnboardingChecklist />
    </main>
  );
}

export default WelcomePage;
