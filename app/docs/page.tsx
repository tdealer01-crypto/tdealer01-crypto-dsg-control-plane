import Link from "next/link";

const sections = [
  {
    title: "Core Product Loop",
    items: [
      "Create an agent",
      "Store the API key shown once",
      "Call /api/execute",
      "Review decisions, audit logs, and billing usage",
    ],
  },
  {
    title: "Main API Routes",
    items: [
      "GET /api/health",
      "GET, POST /api/agents",
      "POST /api/execute",
      "GET /api/executions",
      "GET /api/metrics",
      "GET /api/usage",
    ],
  },
  {
    title: "Next Milestones",
    items: [
      "Wire agents and usage to Supabase schema",
      "Persist billing state from Stripe webhooks",
      "Add policy approvals and exportable audit evidence",
      "Harden auth and environment setup for production",
    ],
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-emerald-400">
            Docs
          </p>
          <h1 className="text-4xl font-bold md:text-5xl">DSG Control Plane Documentation</h1>
          <p className="mt-4 text-lg text-slate-300">
            Product documentation for the current DSG control-plane scaffold,
            including route overview, quickstart flow, and next implementation
            milestones.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/dashboard"
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black"
          >
            Open Dashboard
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200"
          >
            View Pricing
          </Link>
          <Link
            href="/api/health"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200"
          >
            Health Check
          </Link>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {section.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Quickstart</h2>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">{`curl -X POST http://localhost:3000/api/execute \\
  -H "Authorization: Bearer dsg_live_demo" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "agt_demo",
    "input": {
      "prompt": "approve invoice #123"
    },
    "context": {
      "risk_score": 0.12
    }
  }'`}</pre>
        </section>
      </div>
    </main>
  );
}
