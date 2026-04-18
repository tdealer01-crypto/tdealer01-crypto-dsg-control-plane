import Link from 'next/link';

const quickstart = [
  'Create an agent inside your workspace.',
  'Save your API key.',
  'Call POST /api/execute.',
  'Review usage, audit, and policy outcomes in your workspace.',
];

const afterExecution = [
  'The runtime returns a decision and execution output.',
  'Your workspace records usage and governance signals.',
  'Operators can review execution outcomes through workspace-scoped views.',
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold md:text-5xl">Run your first authenticated execution</h1>
        <p className="mt-4 max-w-4xl text-lg text-slate-300">
          Use DSG when you need a stable execution entry, authenticated agents, and workspace-visible runtime outcomes.
        </p>
        <p className="mt-4 text-slate-300">
          This guide shows how to create your first agent, call the stable execution route, and review the result inside
          your workspace.
        </p>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">Quickstart</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-slate-300">
            {quickstart.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold">Stable execution route</h3>
            <p className="mt-2 text-sm text-slate-300">Use /api/execute as the primary stable route for authenticated execution.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold">Runtime-native route</h3>
            <p className="mt-2 text-sm text-slate-300">Use /api/spine/execute when you need the runtime-native path.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold">Public health check</h3>
            <p className="mt-2 text-sm text-slate-300">Use /api/health to confirm service availability.</p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">Authenticated production example</h2>
          <p className="mt-2 text-sm text-slate-300">Replace the token and identifiers below with your workspace values.</p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">{`curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute \\
  -H "Authorization: Bearer $DSG_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "$AGENT_ID",
    "input": {"prompt": "approve invoice #123"},
    "context": {"risk_score": 0.12}
  }'`}</pre>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">What happens after execution?</h2>
          <ul className="mt-4 space-y-2 text-slate-300">
            {afterExecution.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-6">
          <h2 className="text-2xl font-semibold">Workspace boundary</h2>
          <p className="mt-2 text-cyan-50">
            Usage, audit, policy, and execution review routes are workspace-scoped. Public routes are intended for
            evaluation and service checks only.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/playground" className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm">
            Try the Playground
          </Link>
          <Link href="/signup" className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950">
            Start workspace trial
          </Link>
        </div>
      </div>
    </main>
  );
}
