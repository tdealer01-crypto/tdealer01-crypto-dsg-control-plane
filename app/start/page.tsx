import Link from 'next/link';

const channels = [
  {
    title: 'Web demo',
    status: 'Ready now',
    body: 'Try DSG without connecting production systems. See the decision and evidence flow first.',
    href: '/demo',
    cta: 'Run demo',
  },
  {
    title: 'DSG Gate API',
    status: 'Ready now',
    body: 'Create an API key, submit governed actions, and receive deterministic decision evidence.',
    href: '/dashboard/api-keys',
    cta: 'Create API key',
  },
  {
    title: 'MCP server',
    status: 'Guided install',
    body: 'Use the repository MCP server with your own configured Supabase, Vercel, Stripe, Spine, DSG Brain, or compliance services.',
    href: '#mcp',
    cta: 'See MCP setup',
  },
  {
    title: 'GitHub integration',
    status: 'Access request',
    body: 'Use DSG as a verification layer around repository and agent actions. One-click GitHub App installation is not advertised until the production app flow is verified.',
    href: '/request-access?integration=github',
    cta: 'Request GitHub integration',
  },
  {
    title: 'Vercel integration',
    status: 'Access request',
    body: 'Verify deployment actions and retain evidence. One-click installation will only be exposed after the production integration callback is verified.',
    href: '/request-access?integration=vercel',
    cta: 'Request Vercel integration',
  },
];

const flow = [
  ['1', 'Choose a connection', 'Start with Web/API now, or request a managed GitHub/Vercel integration.'],
  ['2', 'Connect only what is needed', 'DSG should not ask for unrelated credentials or force a migration.'],
  ['3', 'Run the first governed action', 'See the recommended/received action, policy result, reason, and evidence in one place.'],
  ['4', 'Execute only when authorized', 'Plan-authorized execution continues unless a verified constraint requires REVIEW or BLOCK.'],
  ['5', 'Keep evidence and replay', 'Store hashes, solver/version context, decision evidence, and enough input context to verify later.'],
  ['6', 'Upgrade when usage proves value', 'Pricing and checkout come after first value, not before the user can understand the product.'],
] as const;

export default function StartPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_36%)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Start DSG ONE</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
            Connect → verify → execute → evidence.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            This is the shortest supported path to first value. DSG ONE does not label a connection “automatic” until that production install flow is actually wired and testable.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-950 hover:bg-emerald-300">
              Try before login
            </Link>
            <Link href="/pricing" className="rounded-xl border border-white/15 px-6 py-3 font-bold text-white hover:border-emerald-300/50">
              View pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Sales + install channels</p>
          <h2 className="mt-2 text-3xl font-black">Use the channel you already work in.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <div key={channel.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-bold">{channel.title}</h3>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                  {channel.status}
                </span>
              </div>
              <p className="mt-4 min-h-24 text-sm leading-7 text-slate-300">{channel.body}</p>
              <Link href={channel.href} className="mt-5 inline-flex rounded-xl bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/15">
                {channel.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">End-to-end flow</p>
          <h2 className="mt-2 text-3xl font-black">One flow from first click to paid usage.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {flow.map(([number, title, body]) => (
              <div key={number} className="grid grid-cols-[44px_1fr] gap-4 rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400 font-black text-slate-950">{number}</div>
                <div>
                  <h3 className="font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="mcp" className="mx-auto max-w-6xl px-6 py-14">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">MCP setup — current verified boundary</p>
        <h2 className="mt-2 text-3xl font-black">Repository install is available; managed one-click install is not claimed yet.</h2>
        <p className="mt-4 max-w-3xl text-slate-300 leading-7">
          The current DSG ONE MCP server is installed from the repository, configured with the service credentials you actually use, built, and then started. This page deliberately does not invent a public package name or a production OAuth flow that has not been verified.
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-5">
          <pre className="text-sm leading-7 text-emerald-200"><code>{`cd dsg-one-mcp-server\nnpm install\nnpm run build\nnpm start`}</code></pre>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Configure only the environment variables for the connected services you intend to use. Required credentials remain server-side and should never be pasted into a public page.
        </p>
      </section>

      <section className="border-t border-white/10 bg-emerald-400/10">
        <div className="mx-auto max-w-6xl px-6 py-12 text-center">
          <h2 className="text-3xl font-black">See value first. Pay when you need production volume.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            Start with the demo or API path, verify the evidence flow, then choose a paid plan or enterprise integration.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="rounded-xl bg-emerald-400 px-6 py-3 font-black text-slate-950 hover:bg-emerald-300">Run demo</Link>
            <Link href="/pricing" className="rounded-xl border border-emerald-300/30 px-6 py-3 font-black text-emerald-100">Choose plan</Link>
            <Link href="/request-access" className="rounded-xl border border-white/15 px-6 py-3 font-black">Enterprise access</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
