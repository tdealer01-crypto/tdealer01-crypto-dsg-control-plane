import Link from "next/link";

const rows = [
  ["Deterministic action gate", "Controlled execution boundary before AI-proposed actions affect production systems", "Implemented"],
  ["Policy and approval checks", "Documented control workflow for sensitive AI actions", "Implemented"],
  ["Invariant checks", "Repeatable required-condition checks before execution", "Implemented"],
  ["requestHash and recordHash", "Traceability for action decision and result evidence", "Implemented"],
  ["Monitor Mode", "Customer keeps runtime/API keys while DSG records evidence", "Implemented"],
  ["Audit export", "Reviewable evidence records", "Implemented"],
  ["GitHub Secure Deploy Gate Action", "CI/CD gating evidence", "Implemented"],
  ["Signed evidence bundle", "Portable evidence package", "Planned"],
  ["Control library", "Reusable governance controls", "Planned"],
];

export default function ISO42001Page() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-sky-500/30 bg-sky-500/10 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.25em] text-sky-300">ISO/IEC 42001 Alignment</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
            AI Management System workflow support
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            ISO/IEC 42001:2023 specifies requirements for establishing, implementing, maintaining, and continually improving an Artificial Intelligence Management System for organizations that provide or use AI-based products or services. DSG maps to this direction as a control and evidence layer for governed AI execution.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/ai-compliance" className="rounded-xl bg-sky-400 px-5 py-3 font-bold text-black">Back to AI compliance</Link>
            <Link href="/evidence-pack" className="rounded-xl border border-sky-300/50 px-5 py-3 font-bold text-sky-100">View evidence pack</Link>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950 p-4 text-sm font-bold uppercase tracking-wide text-slate-300">
            <div>DSG capability</div><div>AIMS workflow support</div><div>Status</div>
          </div>
          {rows.map(([capability, support, status]) => (
            <div key={capability} className="grid grid-cols-3 gap-4 border-b border-slate-800 p-4 last:border-b-0">
              <div className="font-semibold text-white">{capability}</div>
              <div className="text-slate-300">{support}</div>
              <div className={status === "Implemented" ? "font-bold text-emerald-300" : "font-bold text-amber-300"}>{status}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
          <h2 className="text-2xl font-bold">Boundary</h2>
          <p className="mt-3 leading-7 text-slate-300">
            DSG supports ISO/IEC 42001-aligned AI governance workflows. This is not a claim that DSG is ISO/IEC 42001 certified.
          </p>
        </section>
      </div>
    </main>
  );
}
