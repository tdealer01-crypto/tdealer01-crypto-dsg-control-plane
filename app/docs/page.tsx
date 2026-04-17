import Link from "next/link";

const sections = [
  {
    title: "Core Product Loop",
    items: [
      "Create an agent",
      "Store the API key shown once",
      "Call OPTIONS, POST /api/execute (stable compatibility entry)",
      "Call OPTIONS, POST /api/spine/execute (runtime-native entry)",
      "Review decisions, audit logs, and billing usage",
    ],
  },
  {
    title: "Main API Routes",
    items: [
      "GET /api/health",
      "GET, POST /api/agents",
      "POST /api/intent",
      "OPTIONS, POST /api/execute",
      "OPTIONS, POST /api/spine/execute",
      "POST /api/agent-chat",
      "GET /api/audit",
      "GET, POST /api/policies",
      "GET /api/capacity",
      "GET /api/executions",
      "GET /api/metrics",
      "GET /api/usage",
    ],
  },
  {
    title: "Runtime Contract",
    items: [
      "Execution requires Authorization: Bearer <API_KEY>",
      "Execution requires a valid agent_id",
      "Execution requires a resolved active agent",
      "Explicit preflight handling (OPTIONS) is supported for external clients",
    ],
  },
  {
    title: "Route Notes",
    items: [
      "/api/execute forwards to the current spine execution handler",
      "/api/spine/execute is the runtime-native route",
      "/api/health is the public smoke-check endpoint",
      "/api/usage, /api/policies, and /api/capacity are operator-facing routes",
      "Dashboard surfaces also depend on /api/audit and /api/executions",
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
            Current product documentation for DSG ONE Control Plane,
            including route overview, first-run Auto-Setup, and operator/runtime
            entry points.
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

        <div className="mt-12 grid gap-6 md:grid-cols-2">
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
          <h2 className="text-xl font-semibold">Execution Compatibility</h2>
          <p className="mt-4 text-sm text-slate-300">
            Use <code>/api/execute</code> as the stable real-run entry after Auto-Setup.
            The current implementation forwards to the spine execution handler,
            so the execution logic remains centralized while the public path stays stable.
          </p>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Real-run Example</h2>
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
          <p className="mt-4 text-sm text-slate-400">
            Runtime execution requires a bearer API key, a valid <code>agent_id</code>,
            and a resolved active agent. External clients can call OPTIONS first for
            explicit preflight handling before POST execution.
          </p>
        </section>
      </div>
    </main>
  );
}
