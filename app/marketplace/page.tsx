import Link from "next/link";

const reviewerChecks = [
  {
    title: "Landing page",
    href: "/",
    note: "Product overview and navigation for DSG Control Plane.",
  },
  {
    title: "Health endpoint",
    href: "/api/health",
    note: "Returns control-plane and DSG core health status.",
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    note: "Operational overview for agents, executions, audit, and billing.",
  },
];

const capabilities = [
  "Deterministic policy gate with ALLOW / STABILIZE / BLOCK decisions.",
  "Audit-ready execution records and usage tracking.",
  "Control-plane dashboard for agent traffic, health, audit, and billing.",
  "API-first integration model for external AI systems.",
];

const reviewSteps = [
  "Open the landing page and confirm the product overview is available.",
  "Open /api/health and confirm the JSON health payload is returned.",
  "Open /dashboard and review the control-plane operational surfaces.",
  "Use the documented execute API with a valid bearer token for protected execution tests.",
];

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-400">
            Marketplace Reviewer Page
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
            DSG — Deterministic Safety Gate
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-slate-300">
            DSG Control Plane is a deterministic policy enforcement and audit layer for AI systems.
            It provides decision gating, audit-ready execution records, and operator visibility across
            governed AI traffic.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/"
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black"
            >
              Open Product Home
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200"
            >
              Open Dashboard
            </Link>
            <Link
              href="/api/health"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200"
            >
              Open Health Endpoint
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Product Summary</h2>
            <p className="mt-4 text-slate-300">
              DSG is designed as a control plane for governed AI execution. The product exposes health,
              dashboard, and protected execution interfaces for policy-aware workflows.
            </p>
            <ul className="mt-6 space-y-3 text-slate-200">
              {capabilities.map((item) => (
                <li key={item} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Reviewer Checks</h2>
            <div className="mt-6 space-y-4">
              {reviewerChecks.map((item) => (
                <div key={item.href} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.note}</p>
                    </div>
                    <Link href={item.href} className="text-sm font-semibold text-emerald-400">
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">Deployment Model</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Surface</p>
              <p className="mt-2 font-semibold">Next.js control plane</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">API model</p>
              <p className="mt-2 font-semibold">Protected bearer-token execution API</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Core decision output</p>
              <p className="mt-2 font-semibold">ALLOW / STABILIZE / BLOCK</p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">Review Steps</h2>
          <ol className="mt-6 space-y-3 text-slate-200">
            {reviewSteps.map((step, index) => (
              <li key={step} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 font-bold text-black">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">Protected Execute API</h2>
          <p className="mt-3 text-slate-300">
            Execution requests use a bearer token and agent identifier. Reviewers can verify the public
            product surface with the landing page, health endpoint, and dashboard. Protected execution
            flows require valid credentials.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">{`curl -X POST https://your-domain.com/api/execute \\
  -H "Authorization: Bearer DSG_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "agt_demo",
    "input": { "prompt": "approve invoice #123" },
    "context": { "risk_score": 0.12 }
  }'`}</pre>
        </section>
      </div>
    </main>
  );
}
