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
  { label: 'Playground', value: 'Try gate evaluation free — no signup required' },
];

const verificationHighlights = [
  { label: 'Aggregated Vitest', value: '41 files passed / 85 tests passed (2026-04-03 UTC)' },
  { label: 'Unit', value: '18 files passed / 41 tests passed' },
  { label: 'Integration', value: '19 files passed / 35 tests passed' },
  { label: 'Failure-mode', value: '1 file passed / 4 tests passed' },
  { label: 'Migrations', value: '3 files passed / 5 tests passed' },
  { label: 'Typecheck', value: 'tsc --noEmit passed' },
];

const proofSurfaces = [
  { label: 'Runtime proof portal', href: '/enterprise-proof/start' },
  { label: 'Public report', href: '/enterprise-proof/report' },
  { label: 'JSON report API', href: '/api/enterprise-proof/report' },
  { label: 'Verified report', href: '/enterprise-proof/verified/report' },
];

const enterpriseComparisons = [
  {
    category: 'Proof model',
    dsg: 'Public + verified proof surfaces with runtime evidence endpoints.',
    market: 'Marketing claims without machine-readable runtime proof artifacts.',
  },
  {
    category: 'Control gates',
    dsg: 'Deterministic ALLOW / STABILIZE / BLOCK policy modes.',
    market: 'Single-pass generation flow with limited runtime intervention.',
  },
  {
    category: 'Governance posture',
    dsg: 'NIST AI RMF mapping + auditable logs + replay-oriented records.',
    market: 'Policy PDFs and ad-hoc ticket audits.',
  },
  {
    category: 'Commercial readiness',
    dsg: 'Trial-to-enterprise billing path integrated into product runtime.',
    market: 'Separate sales process with weak in-product metering evidence.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-hero-radial text-white">
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 shadow-glow">
              Production-focused DSG control plane
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
              Govern AI execution with an interface that looks premium and sells clearly.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-100">
              DSG gives product and governance teams a deterministic layer for policy enforcement,
              replayable audit logs, and subscription-ready billing in one operator console.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/playground"
                className="rounded-2xl bg-white px-6 py-4 text-base font-semibold text-slate-950 transition hover:scale-[1.01]"
              >
                Try it free — no signup
              </Link>
              <Link
                href="/login"
                aria-label="Continue with email login"
                className="rounded-2xl bg-emerald-400 px-6 py-4 text-base font-semibold text-slate-950 transition hover:scale-[1.01]"
              >
                Continue with email
              </Link>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/30 bg-white/10 px-6 py-4 text-base font-semibold text-white transition hover:border-emerald-300/70 hover:bg-emerald-300/15"
              >
                Open dashboard
              </Link>
              <Link
                href="/docs"
                className="rounded-2xl border border-white/25 bg-slate-900/30 px-6 py-4 text-base font-semibold text-slate-100 transition hover:border-white/40 hover:text-white"
              >
                Read docs
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-cyan-200/35 bg-cyan-300/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Share links</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link
                  href="/enterprise-proof/start"
                  className="rounded-xl border border-cyan-200/50 bg-cyan-200/20 px-4 py-2 font-medium text-cyan-50 transition hover:border-cyan-100/70"
                >
                  Landing share page
                </Link>
                <Link
                  href="/enterprise-proof/report"
                  className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 font-medium text-white transition hover:border-white/50"
                >
                  Public proof report
                </Link>
              </div>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/25 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-sm text-slate-300">{item.label}</p>
                  <p className="mt-3 text-base font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-emerald-950/30 backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-emerald-300/40 bg-slate-950/95 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Live policy graph</p>
                  <h2 className="mt-2 text-2xl font-semibold">Execution governance loop</h2>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Online
                </div>
              </div>

              <div className="mt-8 grid gap-4">
                {['AI request enters control plane', 'Policy engine scores context', 'DSG selects ALLOW / STABILIZE / BLOCK', 'Audit + billing events are stored'].map((item, index) => (
                  <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-300/25 text-sm font-semibold text-emerald-100">
                      0{index + 1}
                    </div>
                    <p className="text-sm text-slate-100">{item}</p>
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
            <div key={pillar.title} className="rounded-[1.75rem] border border-white/20 bg-slate-900/75 p-7 backdrop-blur-sm">
              <div className="inline-flex rounded-2xl bg-emerald-300/20 px-3 py-2 text-sm font-semibold text-emerald-100">
                {pillar.title}
              </div>
              <p className="mt-5 text-lg font-semibold text-white">{pillar.title}</p>
              <p className="mt-3 leading-7 text-slate-100">{pillar.text}</p>
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

      <section className="mx-auto max-w-7xl px-6 pb-6 pt-10">
        <div className="rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Enterprise verification</p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">Evidence-first testing and correctness proof.</h2>
              <p className="mt-4 max-w-3xl text-slate-300">
                Designed for executive sharing: public pages summarize current verification status, while deeper runtime evidence is available in authenticated org-scoped routes.
              </p>
            </div>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/40"
            >
              Open evidence docs
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {verificationHighlights.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                <p className="mt-3 text-sm font-semibold leading-6 text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Proof surfaces</p>
            <h3 className="mt-3 text-2xl font-bold">Share-ready links for customer, auditor, and board review.</h3>
            <p className="mt-3 text-sm text-slate-300">
              Public proof links provide an evidence summary and verification boundaries. Runtime-level lineage and org-specific records stay authenticated.
            </p>
            <div className="mt-6 grid gap-3">
              {proofSurfaces.map((surface) => (
                <Link
                  key={surface.href}
                  href={surface.href}
                  className="rounded-xl border border-emerald-300/20 bg-emerald-300/5 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:border-emerald-200/40"
                >
                  {surface.label}
                  <span className="ml-2 font-mono text-xs text-emerald-200/80">{surface.href}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-violet-200">Market comparison</p>
            <h3 className="mt-3 text-2xl font-bold">Compared against common enterprise AI deployment patterns.</h3>
            <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">DSG ONE</th>
                    <th className="px-4 py-3 font-semibold">Typical market baseline</th>
                  </tr>
                </thead>
                <tbody>
                  {enterpriseComparisons.map((row) => (
                    <tr key={row.category} className="border-t border-white/10 align-top">
                      <td className="px-4 py-3 font-semibold text-white">{row.category}</td>
                      <td className="px-4 py-3 text-emerald-100">{row.dsg}</td>
                      <td className="px-4 py-3 text-slate-300">{row.market}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Baseline column reflects prevailing enterprise AI rollout behavior (policy docs first, proof later). DSG column references features already implemented in this repository.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
