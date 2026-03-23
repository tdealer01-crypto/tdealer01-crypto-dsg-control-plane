import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="mb-4 text-sm uppercase tracking-[0.25em] text-emerald-400">
          DSG Control Plane
        </p>
        <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
          Control, verify, and audit AI decisions in real time
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-300">
          DSG is a deterministic control plane for AI systems with policy
          enforcement, audit-ready execution logs, and usage-based billing.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/dashboard"
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black"
          >
            Start using DSG
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200"
          >
            View Pricing
          </Link>
          <Link
            href="/docs"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200"
          >
            Read Docs
          </Link>
          <Link
            href="/api/health"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200"
          >
            Health Check
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h2 className="text-2xl font-bold">How DSG works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              "AI Request",
              "Policy Gate",
              "ALLOW / STABILIZE / BLOCK",
              "Audit Log + Metrics",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Governance",
              text: "Enforce deterministic policy rules before execution.",
            },
            {
              title: "Audit",
              text: "Capture execution decisions and evidence for review.",
            },
            {
              title: "Billing",
              text: "Track usage and connect subscription plans to execution volume.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <h3 className="text-xl font-semibold">{card.title}</h3>
              <p className="mt-3 text-slate-300">{card.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h2 className="text-2xl font-bold">Quickstart</h2>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">{`curl -X POST https://your-domain.com/api/execute \\
  -H "Authorization: Bearer DSG_API_KEY" \\
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
        </div>
      </section>
    </main>
  );
}
