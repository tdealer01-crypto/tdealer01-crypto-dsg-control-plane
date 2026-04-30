import Link from "next/link";

const metrics = [
  { label: "Benchmark verdict", value: "PASS" },
  { label: "Pass rate", value: "100%" },
  { label: "Checks passed", value: "6 / 6" },
  { label: "Average latency", value: "2047 ms" },
  { label: "Min latency", value: "1029 ms" },
  { label: "Max latency", value: "4254 ms" },
  { label: "Comparison rubric", value: "190 / 200" },
  { label: "Comparison percent", value: "95%" },
  { label: "SMT2 invariants", value: "6 / 6" },
];

const checks = [
  "Connector registration",
  "Gateway custom HTTP execution",
  "Monitor Mode plan-check",
  "Monitor Mode audit commit",
  "Audit events API",
  "Audit export API",
];

const publicBaselines = ["Zapier", "n8n", "Make", "Workato", "Temporal"];

export default function MarketplaceProductionEvidencePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Production Evidence</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
            DSG Gateway evidence: 6/6 passed, 95% rubric score
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            Latest internal production benchmark evidence verified the public DSG Gateway flow end-to-end: connector registration,
            Gateway Mode execution, Monitor Mode plan-check, audit commit, audit events, and audit export. DSG is also measured
            against a public vendor-baseline rubric derived from official/public market-leader documentation.
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
          <h2 className="text-2xl font-bold">Public vendor-baseline coverage</h2>
          <p className="mt-3 leading-7 text-slate-300">
            DSG is production-tested. The listed market leaders are public documentation baselines only; this page does not claim
            vendor runtime benchmark results.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {publicBaselines.map((vendor) => (
              <div key={vendor} className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-center font-semibold text-slate-100">
                {vendor}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Evidence boundary</h2>
          <p className="mt-3 leading-7 text-slate-300">
            This page reports an internal production benchmark run for marketplace and demo validation. It is not an
            independent third-party certification. Vendor runtime benchmark results are not claimed unless vendor endpoints
            are configured and tested with the same suite.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">{`npm run benchmark:evidence
npm run benchmark:vendors:baseline

Production Gateway Result:
pass: true
total: 6
passed: 6
failed: 0
passRate: 100%
avgLatencyMs: 2047
minLatencyMs: 1029
maxLatencyMs: 4254

Comparison Rubric:
score: 190 / 200
percent: 95%

SMT2 Runtime Invariants:
pass: true
checks: 6 / 6
passRate: 100%

Public Vendor Baseline:
pass: true
dsgRuntimeTested: true
publicDocVendors: 5
vendorRuntimeTested: 0`}</pre>
        </section>
      </div>
    </main>
  );
}
