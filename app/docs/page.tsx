import Link from 'next/link';

const flow = [
  ['GET /api/dsg/v1/policies/manifest', 'Fetch deterministic policy manifest metadata before execution.'],
  ['POST /api/dsg/v1/gates/evaluate', 'Run gate evaluation for an action request and receive structured constraint outcomes.'],
  ['POST /api/dsg/v1/proofs/prove', 'Generate deterministic proof scaffold output for the evaluated request.'],
  ['POST /api/execute', 'Protected execution entry for governed runtime actions.'],
  ['POST /api/spine/execute', 'Runtime-native execution path for deeper integration scenarios.'],
  ['GET /api/health', 'Public availability probe for service baseline checks.'],
] as const;

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">DSG ONE — AI Runtime Control Plane</p>
        <h1 className="mt-3 text-4xl font-bold md:text-5xl">Developer docs: deterministic gate API flow</h1>
        <p className="mt-4 text-lg text-slate-300">Use this page to understand runtime governance flow, endpoint purpose, evidence boundary, and next integration action.</p>

        <section id="dsg-one-runtime-flow" className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">Runtime flow</h2>
          <ol className="mt-4 space-y-3">
            {flow.map(([route, detail], index) => (
              <li key={route} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-semibold">{index + 1}. {route}</p>
                <p className="mt-2 text-sm text-slate-300">{detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
          <h2 className="text-2xl font-semibold">Claim boundary</h2>
          <ul className="mt-3 space-y-2 text-slate-200">
            <li>• Verified scaffold: static_check solver, deterministic TypeScript proof/gate outputs, and structured constraint fields.</li>
            <li>• Not claimed: external Z3 production invocation.</li>
            <li>• Not yet verified on this page: JWT/JWKS auth completion, WORM storage completion, cryptographic signing completion.</li>
          </ul>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/enterprise-proof/demo" className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-black">View live gate evidence</Link>
          <Link href="/evidence-pack" className="rounded-xl border border-slate-700 px-4 py-2">Open evidence pack</Link>
          <Link href="/dashboard" className="rounded-xl border border-slate-700 px-4 py-2">Open control plane</Link>
        </div>
      </div>
    </main>
  );
}
