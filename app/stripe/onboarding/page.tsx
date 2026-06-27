export default function StripeOnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-4 py-12">
      <div className="w-full max-w-lg space-y-8">

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-3xl font-bold text-white shadow-lg">
            D
          </div>
          <h1 className="text-3xl font-bold text-white">DSG Governance Gate</h1>
          <p className="mt-2 text-slate-400">
            Your Stripe account is now protected by AI governance.
          </p>
        </div>

        {/* What happens next */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-400">
            What happens now
          </h2>
          <ul className="space-y-3">
            {[
              {
                icon: '⚡',
                title: 'Gate active on payments',
                desc: 'Charge detail views show an automated ALLOW / BLOCK / REVIEW decision.',
              },
              {
                icon: '📋',
                title: 'Decision details',
                desc: 'Each decision shows its policy version, proof reference, and evaluation time.',
              },
              {
                icon: '🔒',
                title: 'Fail-safe by default',
                desc: 'If the governance service is unreachable, the panel shows REVIEW — never ALLOW.',
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 text-xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Next step */}
        <div className="rounded-2xl border border-violet-800/40 bg-violet-950/30 p-6">
          <p className="text-sm text-violet-300">
            Open your Stripe Dashboard and click any payment — the DSG Governance Gate panel
            will appear in the right sidebar.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="https://dashboard.stripe.com/payments"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-xl bg-violet-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
          >
            Open Stripe Dashboard
          </a>
          <a
            href="https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard"
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            DSG Control Panel
          </a>
        </div>

        <p className="text-center text-xs text-slate-600">
          DSG Governance Gate · pics.dsg.governance ·{' '}
          <a href="mailto:t.dealer01@dsg.pics" className="hover:text-slate-400">
            t.dealer01@dsg.pics
          </a>
        </p>
      </div>
    </div>
  );
}
