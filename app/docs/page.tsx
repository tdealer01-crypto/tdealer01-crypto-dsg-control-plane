export default function DocsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <p className="mb-4 text-sm uppercase tracking-[0.25em] text-emerald-400">
          Docs
        </p>
        <h1 className="mb-6 text-4xl font-bold md:text-6xl">DSG Quickstart</h1>
        <p className="max-w-2xl text-lg text-slate-300">
          Create an agent, get an API key, call the execute endpoint, and inspect
          usage in the dashboard.
        </p>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">1. Login</h2>
          <p className="mt-3 text-slate-300">Open the login page and request a magic link.</p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">/login</pre>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">2. Create an agent</h2>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">{`POST /api/agents\n{\n  "name": "demo-agent",\n  "policy_id": "policy_default",\n  "monthly_limit": 10000\n}`}</pre>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">3. Execute</h2>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">{`curl -X POST https://your-domain.com/api/execute \\\n  -H "Authorization: Bearer DSG_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "agent_id": "agt_demo",\n    "input": {"prompt": "approve invoice #123"},\n    "context": {"risk_score": 0.12}\n  }'`}</pre>
        </div>
      </div>
    </main>
  );
}
