import Link from 'next/link';

const pillars = [
  {
    title: 'Policy Gate',
    text: 'Deterministic allow, stabilize, or block decisions before risky AI output reaches production.',
  },
  {
    title: 'Audit Evidence',
    text: 'Capture execution trails, proofs, and replay-ready evidence for internal review or compliance.',
  },
  {
    title: 'Usage Billing',
    text: 'Map execution volume to revenue with self-serve subscriptions and enterprise upgrade paths.',
  },
];

const stats = [
  { label: 'Decision modes', value: 'ALLOW / STABILIZE / BLOCK' },
  { label: 'Commercial motion', value: 'Trial → Pro → Business → Enterprise' },
  { label: 'Built for', value: 'AI operations, governance, audit-heavy teams' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-hero-radial text-white">
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 shadow-glow">
              Commercial-ready DSG control plane
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
              Govern AI execution with an interface that looks premium and sells clearly.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              DSG gives product and governance teams a deterministic layer for policy enforcement,
              replayable audit logs, and subscription-ready billing in one operator console.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="rounded-2xl bg-emerald-400 px-6 py-4 text-base font-semibold text-slate-950 transition hover:scale-[1.01]"
              >
                Continue with email
              </Link>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-base font-semibold text-slate-100 transition hover:border-emerald-400/40 hover:bg-emerald-400/10"
              >
                Open dashboard
              </Link>
              <Link
                href="/docs"
                className="rounded-2xl border border-white/10 bg-transparent px-6 py-4 text-base font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                Read docs
              </Link>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="mt-3 text-base font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-emerald-950/30 backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-emerald-400/20 bg-slate-950/90 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/80">Live policy graph</p>
                  <h2 className="mt-2 text-2xl font-semibold">Execution governance loop</h2>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Online
                </div>
              </div>

              <div className="mt-8 grid gap-4">
                {['AI request enters control plane', 'Policy engine scores context', 'DSG selects ALLOW / STABILIZE / BLOCK', 'Audit + billing events are stored'].map((item, index) => (
                  <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/15 text-sm font-semibold text-emerald-200">
                      0{index + 1}
                    </div>
                    <p className="text-sm text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="rounded-[1.75rem] border border-white/10 bg-slate-900/60 p-7 backdrop-blur-sm">
              <div className="inline-flex rounded-2xl bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200">
                {pillar.title}
              </div>
              <p className="mt-5 text-lg font-semibold text-white">{pillar.title}</p>
              <p className="mt-3 leading-7 text-slate-300">{pillar.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-r from-emerald-400/15 via-cyan-400/10 to-transparent p-8 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Revenue motion</p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">Turn control-plane capability into paid product value.</h2>
              <p className="mt-4 max-w-2xl text-slate-300">
                Self-serve pricing already exists in the product. The next win is making the first impression, upgrade path, and onboarding feel as strong as the backend.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-4 text-base font-semibold text-slate-950"
            >
              Continue with email
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
