import Link from 'next/link';

const flow = [
  {
    step: 'Agent action',
    body: 'An agent, workflow, finance approval, questionnaire, connector call, policy change, or deployment action submits an explicit action request.',
  },
  {
    step: 'Policy',
    body: 'DSG classifies action type, actor, resource, data classification, connector risk, and required approval before the action can proceed.',
  },
  {
    step: 'Evidence',
    body: 'Evidence must be verified or repository-stated. Demo-only, unsupported, or blocked evidence cannot become a passing consumer-facing decision.',
  },
  {
    step: 'Approval',
    body: 'High-risk, secret, top-secret, deployment, and policy-change actions require human approval context before execution can be allowed.',
  },
  {
    step: 'Proof',
    body: 'The automation controller calls the existing deterministic gate scaffold and returns proofHash, inputHash, constraintSetHash, policyVersion, and structured constraint results.',
  },
  {
    step: 'Audit',
    body: 'The response includes an audit preview derived from the gate result. This is not a WORM storage or cryptographic-signature completion claim.',
  },
  {
    step: 'Execute / block',
    body: 'Only PASS is executable. REVIEW and BLOCK stop execution and return remediation reasons for the operator.',
  },
];

const safeClaims = [
  'Vanta-inspired workflow structure, not copied Vanta text.',
  'No customer logos, fake testimonials, acceptance-rate claims, or certification claims.',
  'No mock proof or random decision path in the controller.',
  'Uses the repository deterministic TypeScript static_check gate scaffold boundary.',
  'Production-readiness is not claimed from this page or route alone.',
];

export default function AutomationPage() {
  return (
    <main className="min-h-screen bg-[#07080a] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_12%,rgba(245,197,92,0.16),transparent_28%),linear-gradient(180deg,#090a0d_0%,#07080a_100%)]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">
            DSG Automation Flow
          </p>
          <h1 className="mt-7 max-w-5xl text-5xl font-bold leading-tight md:text-7xl">
            Govern agent actions before they execute.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            DSG maps automation requests through policy, evidence, approval, deterministic proof, audit preview, and execute/block control. This page describes the DSG-native flow without copying third-party marketing claims or presenting unverified claims as facts.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/enterprise-proof/demo" className="rounded-2xl bg-amber-300 px-6 py-4 font-semibold text-slate-950 hover:bg-amber-200">
              View gate evidence
            </Link>
            <Link href="/docs" className="rounded-2xl border border-white/15 bg-white/[0.03] px-6 py-4 font-semibold text-slate-100 hover:border-amber-300/30">
              Review truth boundary
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-4 lg:grid-cols-7">
          {flow.map((item, index) => (
            <article key={item.step} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/10 text-sm font-bold text-amber-100">
                {index + 1}
              </div>
              <h2 className="mt-5 text-xl font-semibold text-white">{item.step}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b0d10]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Controller endpoint</p>
            <h2 className="mt-4 text-4xl font-semibold text-white">One control point for AI automation.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              The controller route is designed as the runtime entry for governed automation decisions. It accepts explicit action context and reuses the existing deterministic gate scaffold instead of fabricating proof or randomizing outcomes.
            </p>
          </div>
          <pre className="overflow-x-auto rounded-3xl border border-white/10 bg-black/40 p-5 text-xs leading-6 text-slate-200"><code>{`POST /api/dsg/v1/controller/evaluate
x-dsg-nonce: <required>
idempotency-key: <required>

{
  "actionId": "act-001",
  "actionType": "agent_action",
  "actor": { "userId": "user-1", "role": "operator", "workspaceId": "org-1" },
  "resource": { "type": "workflow", "id": "wf-1", "classification": "internal" },
  "evidence": [{ "id": "ev-1", "title": "Repo evidence", "state": "REPO_STATED" }],
  "context": {
    "requirement_clear": true,
    "tool_available": true,
    "permission_granted": true,
    "secret_bound": true,
    "dependency_resolved": true,
    "testable": true,
    "audit_hook_available": true
  }
}`}</code></pre>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-[2rem] border border-emerald-300/20 bg-emerald-300/10 p-7">
          <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-200">Consumer-safe boundary</p>
          <h2 className="mt-4 text-3xl font-semibold text-white">What this automation flow does and does not claim.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {safeClaims.map((claim) => (
              <div key={claim} className="rounded-2xl border border-emerald-200/20 bg-black/20 p-4 text-sm leading-7 text-emerald-50">
                {claim}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
