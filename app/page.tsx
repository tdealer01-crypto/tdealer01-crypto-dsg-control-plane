import Link from 'next/link';

const trustBar = [
  'No signup required to test the gate',
  'Visible runtime decisions and thresholds',
  'Workspace-scoped audit, usage, and policy views',
];

const howSteps = [
  'Send an action, prompt, or agent task into the gate.',
  'DSG evaluates the request against runtime risk and policy context.',
  'The system returns a clear decision: ALLOW, STABILIZE, or BLOCK.',
  'Workspace users review execution outcomes, usage, and governance signals.',
];

const evalCards = [
  {
    title: 'Public Playground',
    body: 'Test runtime threshold behavior in a free public sandbox. No signup required.',
    cta: 'Open Playground',
    href: '/playground',
  },
  {
    title: 'Workspace Trial',
    body: 'Create a workspace, run authenticated executions, and review usage, audit, and policy views.',
    cta: 'Start 14-day trial',
    href: '/signup',
  },
  {
    title: 'Proof Summary',
    body: 'Review the public summary of the control model and evidence boundary.',
    cta: 'Read proof summary',
    href: '/enterprise-proof/start',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-hero-radial text-white">
      <section className="mx-auto max-w-7xl px-6 pb-14 pt-20">
        <p className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
          Playground: free, no signup
        </p>
        <h1 className="mt-7 max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
          Govern AI actions before they reach production.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-100">
          DSG adds a runtime control layer that scores risk, applies policy, and returns a clear decision: ALLOW,
          STABILIZE, or BLOCK.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/playground" className="rounded-2xl bg-white px-6 py-4 text-base font-semibold text-slate-950">
            Try the Playground
          </Link>
          <Link href="/login" className="rounded-2xl border border-emerald-300/40 bg-emerald-400/10 px-6 py-4 font-semibold text-emerald-100">
            Continue with email
          </Link>
          <Link href="#how-it-works" className="rounded-2xl border border-white/30 bg-white/10 px-6 py-4 font-semibold">
            See how it works
          </Link>
        </div>

        <p className="mt-6 text-sm text-slate-300">
          Already have a workspace?{' '}
          <Link href="/login" className="font-semibold text-emerald-300 underline">
            Log in
          </Link>
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {trustBar.map((item) => (
            <div key={item} className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-slate-100">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-8">
        <h2 className="text-3xl font-bold">How DSG works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {howSteps.map((step, index) => (
            <div key={step} className="flex gap-4 rounded-2xl border border-white/20 bg-slate-900/65 p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300/20 font-semibold text-emerald-100">
                {index + 1}
              </div>
              <p className="text-slate-100">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-[1.75rem] border border-white/15 bg-slate-900/70 p-8">
          <h2 className="text-3xl font-bold">Built for teams that need more than model output</h2>
          <p className="mt-4 max-w-4xl leading-8 text-slate-200">
            DSG is designed for teams that need AI execution to be reviewable, controllable, and operationally
            trustworthy. Instead of relying on raw model output alone, teams can apply a runtime gate before actions
            are allowed to continue.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="text-3xl font-bold">Evaluate DSG your way</h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {evalCards.map((card) => (
            <div key={card.title} className="rounded-[1.75rem] border border-white/15 bg-white/5 p-6">
              <h3 className="text-2xl font-semibold">{card.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-200">{card.body}</p>
              <Link href={card.href} className="mt-6 inline-flex rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950">
                {card.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-8">
        <div className="rounded-[2rem] border border-emerald-400/25 bg-emerald-400/10 p-8 text-center">
          <h2 className="text-3xl font-bold">Ready to test governed execution?</h2>
          <p className="mx-auto mt-4 max-w-3xl leading-8 text-slate-100">
            Start in the Playground, then move into a workspace trial when you are ready to validate your own use case.
          </p>
          <Link href="/playground" className="mt-6 inline-flex rounded-2xl bg-white px-6 py-4 font-semibold text-slate-950">
            Try the Playground
          </Link>
        </div>
      </section>
    </main>
  );
}
