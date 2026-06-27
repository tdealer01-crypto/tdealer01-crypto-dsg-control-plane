import Link from "next/link";

const functions = [
  ["Govern", "Execution control boundaries, role checks, approval expectations, and evidence requirements", "Implemented"],
  ["Map", "Action context capture: actor, organization, tool, action, planId, and input hash", "Implemented"],
  ["Measure", "Evidence: pass/fail gates, latency, invariant pass rate, benchmark score, and audit records", "Implemented"],
  ["Manage", "Allow, block, or review actions before execution; commit final results into audit evidence", "Implemented"],
];

const controls = [
  "Deterministic gate",
  "Policy/risk/approval checks",
  "Runtime invariant checks",
  "requestHash and recordHash audit proof",
  "Monitor Mode without DSG ONE custody of customer API keys",
  "GitHub deploy gate for CI/CD risk control",
];

export default function NistAiRmfPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-purple-500/30 bg-purple-500/10 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.25em] text-purple-300">NIST AI RMF Alignment</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
            Govern, Map, Measure, and Manage AI action risk
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            NIST AI RMF is a voluntary framework for managing AI risk and improving trustworthy AI. DSG ONE supports NIST AI RMF-style workflows by placing deterministic controls, invariant checks, and audit evidence at the AI action execution boundary.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/ai-compliance" className="rounded-xl bg-purple-400 px-5 py-3 font-bold text-black">Back to AI compliance</Link>
            <Link href="/evidence-pack" className="rounded-xl border border-purple-300/50 px-5 py-3 font-bold text-purple-100">View evidence pack</Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {functions.map(([name, support, status]) => (
            <div key={name} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm uppercase tracking-wide text-purple-300">{status}</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{name}</h2>
              <p className="mt-3 leading-7 text-slate-300">{support}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">DSG ONE controls used in this alignment</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {controls.map((control) => (
              <div key={control} className="rounded-xl border border-purple-400/20 bg-slate-950 p-4 font-semibold text-purple-100">
                {control}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
          <h2 className="text-2xl font-bold">Boundary</h2>
          <p className="mt-3 leading-7 text-slate-300">
            DSG ONE helps operationalize NIST AI RMF-style workflows. NIST AI RMF is voluntary and this page does not claim NIST certification.
          </p>
        </section>
      </div>
    </main>
  );
}
