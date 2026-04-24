import Link from 'next/link';

const plans = [
  {
    title: 'Playground',
    price: 'Free',
    body: 'Best for quick evaluation of runtime threshold behavior.',
    features: [
      'No signup required',
      'Public sandbox access',
      'Visible ALLOW, STABILIZE, and BLOCK behavior',
      'Estimated token and cost view',
    ],
    cta: 'Try the Playground',
    href: '/playground',
  },
  {
    title: 'Pro',
    price: '14-day free trial, then paid',
    body: 'Best for first authenticated workspace testing.',
    features: [
      '1,000 executions included',
      'Create and manage agents',
      'Authenticated execution flow',
      'Usage and audit visibility',
      'Policy and governance views',
    ],
    cta: 'Start Pro trial',
    href: '/signup',
  },
  {
    title: 'Business',
    price: '14-day free trial, then paid',
    body: 'Best for teams running governed workflows across users and environments.',
    features: [
      'Higher execution limits',
      'Team access',
      'Operational governance support',
      'Expanded usage visibility',
      'Shared workspace controls',
    ],
    cta: 'Start Business trial',
    href: '/signup',
  },
  {
    title: 'Enterprise',
    price: 'Custom',
    body: 'Best for governance-heavy deployments and controlled rollout programs.',
    features: ['Custom quotas', 'Deployment planning', 'Governance onboarding', 'Evidence review support', 'Enterprise rollout path'],
    cta: 'Request Enterprise pilot',
    href: '/contact',
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold md:text-6xl">Start free. Upgrade when your finance governance runtime needs more control.</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Begin with the public Playground, then move into a workspace trial when you are ready to test authenticated
            usage, audit, and policy workflows.
          </p>
          <div className="mt-6">
            <Link href="/login" className="inline-flex rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-semibold">
              Start Trial
            </Link>
          </div>
          <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-left">
            <p className="font-semibold text-emerald-100">Two ways to evaluate DSG:</p>
            <p className="mt-2 text-sm text-emerald-50">Playground: free, no signup</p>
            <p className="text-sm text-emerald-50">Workspace trial: 14 days, no card required</p>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => (
            <div key={plan.title} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold">{plan.title}</h2>
              <p className="mt-3 text-xl font-semibold text-emerald-200">{plan.price}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{plan.body}</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-200">
                {plan.features.map((feature) => (
                  <li key={feature} className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950">
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm leading-7 text-slate-300">
          Public proof pages remain open. Finance usage, billing, audit, policy, and execution review are workspace-scoped.
        </div>

        <section className="mt-10 grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xl font-semibold">What is free?</h3>
            <p className="mt-2 text-slate-300">The public Playground is free and does not require signup. Workspace trials are free for 14 days and do not require a card to begin.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xl font-semibold">What is included in the trial?</h3>
            <p className="mt-2 text-slate-300">Trial workspaces include 1,000 executions, agent setup, and access to authenticated runtime views.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xl font-semibold">When do I need Enterprise?</h3>
            <p className="mt-2 text-slate-300">Enterprise is for teams that need rollout planning, governance onboarding, and custom execution capacity.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
