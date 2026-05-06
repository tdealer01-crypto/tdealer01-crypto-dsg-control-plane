import Link from 'next/link';

const productFlow = [
  ['Create AI System', 'Register owner, model, impact level, environment, and allowed action boundary.'],
  ['Bind Connector', 'Connect REST, webhook, Zapier, Make, n8n, GitHub, Vercel, or a customer API.'],
  ['Map Tool', 'Define the exact action template an agent or workflow is allowed to request.'],
  ['Evaluate Gate', 'Classify new input, compute risk, match policy, and create decision evidence.'],
  ['Approve High Risk', 'Route high-risk or critical actions to human review before execution.'],
  ['Export Evidence', 'Package request hash, policy hash, decision hash, approval log, and replay posture.'],
  ['Run Deploy Gate', 'Block production claims unless build, tests, auth, RBAC, audit, and proof checks pass.'],
];

const proofCards = [
  ['Allowed claim', 'Policy-gated AI and automation execution with approval routing, audit hashes, evidence export, and deployment gating.'],
  ['Blocked claim', 'No certification, independent audit, or enterprise production security claim without live evidence and external proof.'],
  ['Demo outcome', 'A buyer sees allow, review, block, evidence export, and go/no-go state in the first session.'],
];

const layers = [
  ['1', 'User and Agent Layer', 'Humans, agents, finance workflows, support operations, and deployment requests.'],
  ['2', 'Gateway Protocol', 'API auth, plan check, request hash, idempotency key, and tool boundary.'],
  ['3', 'Governance Decision', 'Policy, invariants, risk score, approval route, and deterministic decision state.'],
  ['4', 'Audit and Proof', 'Tamper-evident hashes, replay posture, evidence bundle, and export trail.'],
  ['5', 'Tool Connectors', 'Stripe, Slack, Gmail, REST, webhook, Zapier, Make, n8n, GitHub, and Vercel.'],
];

export default function ProofGatePage() {
  return (
    <main className="dsg-shell min-h-screen text-slate-100">
      <section className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="dsg-chip">DSG ProofGate Product Layer</p>
            <h1 className="dsg-text-gradient mt-6 max-w-5xl text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
              Govern every AI action before it touches a customer system.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              ProofGate is the productized gateway from the uploaded full-stack package: policy-gated execution, approval routing, tamper-evident audit, evidence export, and deployment go/no-go checks for enterprise AI automation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard/integrations" className="dsg-btn-gold">Connect first system</Link>
              <Link href="/enterprise-ready" className="dsg-btn-blue">View enterprise setup</Link>
              <Link href="/enterprise-proof/demo" className="dsg-btn-red">Run proof demo</Link>
            </div>
          </div>

          <div className="dsg-card-blue rounded-3xl p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-200">Buyer-visible result</p>
            <div className="mt-5 grid gap-3">
              {proofCards.map(([title, body]) => (
                <article key={title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <h2 className="text-lg font-black text-white">{title}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <p className="dsg-chip">Seven-step product flow</p>
        <h2 className="mt-4 text-4xl font-black text-white">From one action to governed production rollout.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {productFlow.map(([title, body], index) => (
            <article key={title} className="dsg-card rounded-3xl p-5">
              <p className="text-3xl font-black text-amber-200">{String(index + 1).padStart(2, '0')}</p>
              <h3 className="mt-3 text-xl font-black text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-black/20">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="dsg-chip">Five-layer architecture</p>
          <div className="mt-8 grid gap-4">
            {layers.map(([num, title, body]) => (
              <article key={title} className="dsg-proof-rail rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:grid md:grid-cols-[72px_0.35fr_1fr] md:items-center md:gap-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-xl font-black text-amber-100">{num}</div>
                <h3 className="mt-4 text-2xl font-black text-white md:mt-0">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300 md:mt-0">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="dsg-card-red rounded-3xl p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-200">Truth boundary</p>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            This page imports the uploaded ProofGate product concept into the DSG ONE control-plane story. It is product and enterprise setup ready for controlled pilots, but it does not claim external certification, independent audit, or completed production go-live without recorded live evidence.
          </p>
        </div>
      </section>
    </main>
  );
}
