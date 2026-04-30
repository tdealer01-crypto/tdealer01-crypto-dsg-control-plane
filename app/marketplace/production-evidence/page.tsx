import Link from "next/link";

const metrics = [
  { label: "Benchmark verdict", value: "PASS" },
  { label: "Pass rate", value: "100%" },
  { label: "Checks passed", value: "6 / 6" },
  { label: "Average latency", value: "1812 ms" },
  { label: "Min latency", value: "905 ms" },
  { label: "Max latency", value: "3303 ms" },
];

const checks = [
  "Connector registration",
  "Gateway custom HTTP execution",
  "Monitor Mode plan-check",
  "Monitor Mode audit commit",
  "Audit events API",
  "Audit export API",
];

export default function MarketplaceProductionEvidencePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Production Evidence</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
            DSG Gateway benchmark: 6/6 passed
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            Internal production benchmark evidence verified the public DSG Gateway flow end-to-end: connector registration,
            Gateway Mode execution, Monitor Mode plan-check, audit commit, audit events, and audit export.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/gateway/monitor?orgId=org-smoke" className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-black">
              Open gateway monitor
            </Link>
            <Link href="/api/gateway/audit/export?orgId=org-smoke" className="rounded-xl border border-emerald-400/40 px-5 py-3 font-bold text-emerald-100">
              Download audit JSON
            </Link>
            <Link href="/marketplace" className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200">
              Back to marketplace
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">{metric.label}</p>
              <p className="mt-2 text-3xl font-bold text-white">{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Verified benchmark checks</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {checks.map((check) => (
              <div key={check} className="rounded-xl border border-emerald-400/20 bg-slate-950 p-4 font-semibold text-emerald-100">
                ✓ {check}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Evidence boundary</h2>
          <p className="mt-3 leading-7 text-slate-300">
            This page reports an internal production benchmark run for marketplace and demo validation. It is not an
            independent third-party certification. The benchmark output should be regenerated after material backend,
            database, or deployment changes.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">{`npm run benchmark:gateway

Result:
pass: true
total: 6
passed: 6
failed: 0
passRate: 100%
avgLatencyMs: 1812
minLatencyMs: 905
maxLatencyMs: 3303`}</pre>
        </section>
      </div>
    </main>
  );
}
