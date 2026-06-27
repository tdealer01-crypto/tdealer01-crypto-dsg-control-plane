import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Deploy DSG ONE — One-click Vercel Template',
  description: 'Deploy your own DSG ONE control plane in under 5 minutes. Governed AI runtime with policy gate, audit chain, and Hermes dashboard.',
};

const ENV_VARS = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Your Supabase project URL', required: true },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Supabase anonymous key', required: true },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase service role key (server-only)', required: true },
  { name: 'ANTHROPIC_API_KEY', description: 'Anthropic API key for Hermes AI chat', required: true },
  { name: 'NEXTAUTH_SECRET', description: 'Random secret for session signing', required: true },
  { name: 'STRIPE_SECRET_KEY', description: 'Stripe secret key for billing', required: false },
  { name: 'STRIPE_PUBLISHABLE_KEY', description: 'Stripe publishable key', required: false },
];

const STEPS = [
  { n: 1, title: 'Click Deploy', body: 'Click the "Deploy to Vercel" button. You\'ll be redirected to Vercel\'s new project page with DSG ONE pre-configured.' },
  { n: 2, title: 'Set env vars', body: 'Fill in the required environment variables. You\'ll need a Supabase project and Anthropic API key.' },
  { n: 3, title: 'Deploy', body: 'Vercel builds and deploys automatically. Your instance is live in under 3 minutes.' },
  { n: 4, title: 'Run migrations', body: 'In Supabase dashboard, run the SQL migrations from supabase/migrations/ to set up the database schema.' },
  { n: 5, title: 'Start governing', body: 'Open /dashboard, create your first agent, and run a governed execution through the policy gate.' },
];

const DEPLOY_URL =
  'https://vercel.com/new/clone?' +
  'repository-url=https%3A%2F%2Fgithub.com%2Ftdealer01-crypto%2Ftdealer01-crypto-dsg-control-plane' +
  '&project-name=dsg-control-plane' +
  '&repository-name=dsg-control-plane' +
  '&demo-title=DSG%20ONE%20Control%20Plane' +
  '&demo-description=Governed%20AI%20runtime%20with%20policy%20gate%2C%20audit%20chain%2C%20and%20Hermes%20dashboard' +
  '&demo-url=https%3A%2F%2Ftdealer01-crypto-dsg-control-plane.vercel.app' +
  '&envs=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,ANTHROPIC_API_KEY,NEXTAUTH_SECRET';

export default function DeployPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/marketplace" className="text-lg font-bold tracking-tight">
            DSG ONE
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/github-app" className="text-sm text-slate-400 hover:text-slate-200">
              GitHub App
            </Link>
            <Link
              href={DEPLOY_URL}
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 border border-slate-700"
            >
              ▲ Deploy to Vercel
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Hero */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            One-click deploy
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
            Your own DSG ONE<br />
            <span className="text-emerald-400">in under 5 minutes</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Deploy a full AI governance control plane — policy gate, SHA-256 audit chain,
            Hermes agent dashboard, and Stripe billing — to Vercel with one click.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4">
            <Link
              href={DEPLOY_URL}
              className="inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4 text-lg font-bold text-black hover:bg-slate-100 transition-colors"
            >
              <span className="text-2xl">▲</span>
              Deploy to Vercel
            </Link>
            <p className="text-sm text-slate-500">
              Free Vercel account required · Supabase + Anthropic API key needed
            </p>
          </div>
        </div>

        {/* What you get */}
        <div className="mt-20">
          <h2 className="text-center text-2xl font-bold">What you get</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { icon: '🛡️', title: 'Policy Gate', body: 'ALLOW / BLOCK / REVIEW on every agent action. Configure rules per org, per role.' },
              { icon: '🔗', title: 'SHA-256 Audit Chain', body: 'Tamper-evident audit blocks. Every action hashes to the previous — verifiable chain.' },
              { icon: '🤖', title: 'Hermes Dashboard', body: 'Streaming AI chat, tool calling, session memory. Built on Claude with real-time SSE.' },
              { icon: '🛒', title: 'Marketplace', body: 'Submit and discover AI products. Built-in image upload, pricing, and Stripe checkout.' },
              { icon: '💳', title: 'Stripe Billing', body: 'Usage metering, quota enforcement, subscription tiers — ready to charge customers.' },
              { icon: '🐙', title: 'GitHub App', body: 'Gate every pull request automatically. ALLOW → green check. BLOCK → merge blocked.' },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-3xl">{f.icon}</p>
                <h3 className="mt-3 text-base font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="mt-20">
          <h2 className="text-center text-2xl font-bold">How to deploy</h2>
          <div className="mt-8 space-y-4">
            {STEPS.map((step) => (
              <div key={step.n} className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-black">
                  {step.n}
                </span>
                <div>
                  <p className="font-semibold">{step.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Env vars */}
        <div className="mt-20">
          <h2 className="text-center text-2xl font-bold">Environment variables</h2>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 bg-slate-900">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-slate-300">Variable</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-300">Description</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-300">Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950">
                {ENV_VARS.map((v) => (
                  <tr key={v.name}>
                    <td className="px-6 py-4 font-mono text-emerald-400">{v.name}</td>
                    <td className="px-6 py-4 text-slate-400">{v.description}</td>
                    <td className="px-6 py-4">
                      {v.required ? (
                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-400">required</span>
                      ) : (
                        <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs font-semibold text-slate-400">optional</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA bottom */}
        <div className="mt-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-10 text-center">
          <h2 className="text-2xl font-bold">Ready to deploy?</h2>
          <p className="mt-3 text-slate-400">
            Your governed AI runtime, your infrastructure, your data.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href={DEPLOY_URL}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-black hover:bg-slate-100"
            >
              <span>▲</span> Deploy to Vercel
            </Link>
            <Link
              href="https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane"
              className="rounded-xl border border-slate-700 px-8 py-4 font-semibold text-slate-300 hover:border-slate-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
