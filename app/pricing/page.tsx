import Link from 'next/link';

const plans = [
  {
    name: 'Readiness Report',
    price: '$9',
    cadence: 'one-time',
    description: 'A compact GO / NO-GO production readiness report for one release or deployment review.',
    href: 'https://buy.stripe.com/4gMbJ20qQ0n1cUz5U43gk03',
    cta: 'Buy report',
    featured: false,
    features: [
      'Production readiness verdict',
      'Endpoint status summary',
      'Protected-route validation',
      'SHA256 evidence hash',
      'Remediation checklist',
    ],
  },
  {
    name: 'Solo',
    price: '$19',
    cadence: 'per month',
    description: 'Hosted release evidence for one project with basic readiness history and proof reporting.',
    href: 'https://buy.stripe.com/fZu5kEc9yd9N3jZeqA3gk04',
    cta: 'Start Solo',
    featured: false,
    features: [
      '1 project',
      'Daily readiness check',
      'GO / NO-GO evidence history',
      'Basic release proof reporting',
      'Email-based onboarding',
    ],
  },
  {
    name: 'Team',
    price: '$49',
    cadence: 'per month',
    description: 'Release-governance package for small teams that need evidence dashboard and alerts.',
    href: 'https://buy.stripe.com/28E9AUb5uc5J7Af0zK3gk05',
    cta: 'Start Team',
    featured: true,
    features: [
      'Up to 5 projects',
      'Evidence dashboard',
      'Slack or email alerts',
      'Vercel readiness checks',
      'Supabase readiness checks',
    ],
  },
  {
    name: 'Production',
    price: '$99',
    cadence: 'per month',
    description: 'Production governance with audit exports, policy rules, release approval history, and support.',
    href: 'https://buy.stripe.com/eVq6oIb5uedRg6L0zK3gk06',
    cta: 'Start Production',
    featured: false,
    features: [
      'Up to 20 projects',
      'Audit export',
      'Policy rules',
      'Release approval history',
      'Priority support',
    ],
  },
];

const layers = [
  {
    title: 'Action Layer',
    body: 'Free GitHub Action that blocks unsafe release workflows and emits deterministic GO / NO-GO output.',
  },
  {
    title: 'Governance Layer',
    body: 'Policy-ready release evidence for teams that need to explain why a release passed or stopped.',
  },
  {
    title: 'Audit Layer',
    body: 'Evidence hashes, history, reports, and exportable release records for production review.',
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#07080a] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(181,18,27,0.26),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(245,197,92,0.16),transparent_30%),radial-gradient(circle_at_50%_70%,rgba(16,185,129,0.10),transparent_34%),linear-gradient(180deg,#090a0d_0%,#0b0d10_55%,#07080a_100%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:py-24">
          <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">
            DSG ONE Secure Deploy Gate Pricing
          </p>
          <h1 className="mt-7 max-w-5xl text-5xl font-bold leading-[1.02] text-white md:text-7xl">
            Sell release confidence with GO / NO-GO evidence.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Start with the free GitHub Action, buy a one-time readiness report, or subscribe to hosted DSG ONE release-governance workflows for teams that need evidence-ready production proof.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/readiness-report" className="rounded-2xl bg-amber-300 px-6 py-4 text-base font-bold text-slate-950 transition hover:bg-amber-200">
              View $9 report
            </Link>
            <Link href="https://github.com/tdealer01-crypto/dsg-secure-deploy-gate-action" className="rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-4 font-semibold text-slate-100 transition hover:border-amber-300/40">
              Install free Action
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-5 lg:grid-cols-4">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex flex-col border p-6 ${
                plan.featured
                  ? 'border-amber-300/40 bg-amber-300/10 shadow-2xl shadow-amber-950/20'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              {plan.featured ? (
                <span className="absolute right-4 top-4 rounded-full border border-amber-300/30 bg-amber-300/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100">
                  Best start
                </span>
              ) : null}
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Plan</p>
              <h2 className="mt-4 text-2xl font-semibold text-white">{plan.name}</h2>
              <div className="mt-5 flex items-end gap-2">
                <span className="text-5xl font-bold text-white">{plan.price}</span>
                <span className="pb-2 text-sm text-slate-400">{plan.cadence}</span>
              </div>
              <p className="mt-5 min-h-[96px] text-sm leading-7 text-slate-300">{plan.description}</p>
              <ul className="mt-5 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm leading-6 text-slate-200">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href={plan.href}
                className={`mt-7 rounded-2xl px-5 py-4 text-center text-sm font-bold transition ${
                  plan.featured
                    ? 'bg-amber-300 text-slate-950 hover:bg-amber-200'
                    : 'border border-white/15 bg-black/20 text-slate-100 hover:border-amber-300/40'
                }`}
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b0d10]">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Product stack</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-white">
              SaaS, action-layer governance, and audit evidence in one path.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              The free Action proves the gate. The paid products package the evidence, reporting, and operating workflow teams need after the check runs.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {layers.map((layer) => (
              <article key={layer.title} className="border border-white/10 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Layer</p>
                <h3 className="mt-4 text-2xl font-semibold text-amber-50">{layer.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-300">{layer.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-6 text-sm leading-7 text-slate-200">
          <p className="font-semibold text-amber-100">Boundary</p>
          <p>This pricing page describes DSG ONE products and support alignment. It does not claim certification, external audit completion, or guaranteed compliance outcomes.</p>
          <p className="mt-2">If an item is demo/scaffold in related evidence pages, treat it as non-production proof until verified.</p>
        </div>
      </section>
    </main>
  );
}
