import Link from 'next/link';

const paymentLink = 'https://buy.stripe.com/4gMbJ20qQ0n1cUz5U43gk03';

const deliverables = [
  'GO / NO-GO production readiness verdict',
  'Readiness endpoint status summary',
  'Protected-route validation result',
  'SHA256 evidence hash for release records',
  'Remediation checklist for failed checks',
];

const checks = [
  {
    title: 'Readiness contract',
    body: 'We verify that your readiness endpoint responds with the expected HTTP status and, when available, an explicit ok=true signal.',
  },
  {
    title: 'Protected route behavior',
    body: 'We check that sensitive routes reject unauthenticated access with the expected 401 or 403 response.',
  },
  {
    title: 'Release evidence',
    body: 'You receive a compact evidence record that explains why the release is GO or NO-GO instead of relying on a vague green build badge.',
  },
];

export default function ReadinessReportPage() {
  return (
    <main className="min-h-screen bg-[#07080a] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.22),transparent_28%),radial-gradient(circle_at_80%_5%,rgba(245,158,11,0.18),transparent_30%),linear-gradient(180deg,#08090c_0%,#0b0d10_58%,#07080a_100%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:min-h-[calc(100svh-73px)] lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
              DSG Production Readiness Report
            </p>
            <h1 className="mt-7 max-w-5xl text-5xl font-bold leading-[1.02] text-white md:text-7xl">
              Get GO / NO-GO proof before you ship production.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              A one-time DSG readiness check for SaaS teams that need evidence, not guesswork. We validate your production readiness endpoint, protected route posture, and release evidence path, then return a compact report you can attach to your release record.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href={paymentLink}
                className="rounded-2xl bg-emerald-300 px-6 py-4 text-base font-bold text-slate-950 transition hover:bg-emerald-200"
              >
                Buy report — $9
              </a>
              <Link
                href="https://github.com/tdealer01-crypto/dsg-secure-deploy-gate-action"
                className="rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-4 font-semibold text-slate-100 transition hover:border-emerald-300/40"
              >
                View GitHub Action
              </Link>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400">
              After payment, send the production URL, readiness endpoint, optional protected route, and optional GitHub repository URL. The report is scoped to readiness and release evidence, not penetration testing or legal compliance certification.
            </p>
          </div>

          <div className="border border-emerald-300/20 bg-black/30 p-6 shadow-2xl shadow-emerald-950/30 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">One-time report</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">$9</h2>
              </div>
              <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-200">
                Launch offer
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {deliverables.map((item) => (
                <div key={item} className="flex gap-3 border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-200">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <a
              href={paymentLink}
              className="mt-6 block rounded-2xl bg-amber-300 px-6 py-4 text-center text-base font-bold text-slate-950 transition hover:bg-amber-200"
            >
              Pay with Stripe
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">What gets checked</p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight text-white">A small report for one clear decision: ship or stop.</h2>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {checks.map((check) => (
            <article key={check.title} className="border-t border-emerald-300/30 bg-white/[0.02] p-6">
              <h3 className="text-2xl font-semibold text-emerald-50">{check.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">{check.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b0d10]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Free tool included</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-white">Install the DSG Secure Deploy Gate Action.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              The public GitHub Action gives your CI/CD pipeline a deterministic gate. The paid report helps you package the outcome into a human-readable release evidence record.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/40 p-5 font-mono text-sm text-slate-200">
            <pre className="overflow-x-auto whitespace-pre-wrap">{`- uses: tdealer01-crypto/dsg-secure-deploy-gate-action@v1
  with:
    readiness_url: "https://your-app.vercel.app/api/finance-governance/readiness"
    expected_status: "200"
    require_json_ok: "true"`}</pre>
          </div>
        </div>
      </section>
    </main>
  );
}
