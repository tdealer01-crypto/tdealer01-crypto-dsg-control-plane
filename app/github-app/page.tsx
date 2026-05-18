import { headers } from 'next/headers';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Install DSG ONE Gate — GitHub App',
  description: 'Add AI governance checks to every pull request in your GitHub organization.',
};

const FEATURES = [
  { icon: '✅', title: 'PR Check Runs', body: 'DSG Gate appears as a required status check on every PR — ALLOW or BLOCK based on policy.' },
  { icon: '📜', title: 'Audit Trail', body: 'Every gate decision is written to the DSG audit ledger with actor, verdict, and PR context.' },
  { icon: '⚡', title: 'Zero config', body: 'Install once on your org — DSG automatically watches all repos. No workflow files needed.' },
  { icon: '🔒', title: 'Policy Rules', body: 'Define governance rules in the DSG dashboard. Rules apply to all repos in the installation.' },
];

export default async function GitHubAppPage() {
  const headersList = await headers();
  const host = headersList.get('host') ?? 'tdealer01-crypto-dsg-control-plane.vercel.app';
  const proto = headersList.get('x-forwarded-proto') ?? 'https';
  const appUrl = `${proto}://${host}`;

  const manifest = JSON.stringify({
    name: 'DSG Gate v3',
    url: appUrl,
    hook_attributes: { url: `${appUrl}/api/github-app/webhook` },
    redirect_url: `${appUrl}/api/github-app/callback`,
    description: 'AI governance gate for pull requests. Policy check, audit trail, ALLOW/BLOCK on every PR.',
    public: false,
    default_permissions: {
      checks: 'write',
      pull_requests: 'write',
      contents: 'read',
    },
    default_events: ['pull_request', 'installation', 'installation_repositories'],
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-16">

        {/* Hero */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">GitHub App</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">DSG Gate v2</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            Install on your GitHub org to add AI governance checks to every pull request — automatic, no workflow files needed.
          </p>
        </div>

        {/* Feature grid */}
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-2xl">{f.icon}</p>
              <h2 className="mt-3 text-lg font-bold">{f.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h2 className="text-xl font-bold">How it works</h2>
          <ol className="mt-5 space-y-3">
            {[
              'Click "Install on GitHub" — GitHub creates the DSG Gate app in your account.',
              'Choose which repos (or the whole org) to install on.',
              'Every new PR triggers a DSG policy check automatically.',
              'ALLOW → green check. BLOCK → red check + merge blocked.',
              'All decisions logged to your DSG audit ledger.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-black">{i + 1}</span>
                <span className="text-slate-300">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Install CTA */}
        <div className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <h2 className="text-xl font-bold">Ready to install?</h2>
          <p className="mt-2 text-sm text-slate-400">GitHub will create the app in your account and redirect back here with your credentials.</p>
          <form action="https://github.com/apps/manifests" method="post" className="mt-6">
            <input type="hidden" name="manifest" value={manifest} />
            <button type="submit" className="rounded-xl bg-emerald-500 px-8 py-4 font-bold text-black hover:bg-emerald-400">
              Install on GitHub →
            </button>
          </form>
          <p className="mt-4 text-xs text-slate-500">Permissions: checks (write) · pull_requests (write) · contents (read)</p>
        </div>

        {/* Env vars */}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-bold">After install — add to Vercel env vars</h2>
          <div className="mt-4 space-y-2">
            {['GITHUB_APP_ID', 'GITHUB_APP_PRIVATE_KEY', 'GITHUB_APP_WEBHOOK_SECRET'].map((v) => (
              <div key={v} className="rounded-lg bg-slate-950 px-4 py-2 font-mono text-sm text-emerald-300">{v}</div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/pricing" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:border-emerald-400">View pricing →</Link>
          <Link href="/marketplace/production-evidence" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:border-emerald-400">View evidence →</Link>
        </div>
      </div>
    </main>
  );
}
