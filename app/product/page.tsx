import Link from 'next/link';
import ProductGateModeSwitch from '../../components/ProductGateModeSwitch';

const monitorRows = [
  ['Agent', 'existing customer-agent', 'connected'],
  ['Action', 'payment / deploy / privilege change', 'protected'],
  ['Gate mode', 'Audit only / Enforce gate', 'customer choice'],
  ['Gate', 'ALLOW / STABILIZE / BLOCK', 'deterministic'],
  ['Evidence', 'memory + action + result hash', 'audit-ready'],
  ['Control Plane', 'dashboard + integrations + docs', 'linked'],
];

const workflowSteps = [
  ['1', 'Keep your existing agent', 'Customers continue using their existing agent/runtime — no system migration or rewrite required'],
  ['2', 'Identify high-risk actions', 'Start with payments, deploys, privilege changes, or external writes where risk is most visible'],
  ['3', 'Attach a memory packet', 'Send a snapshot hash, classification, TTL, and necessary context along with each action'],
  ['4', 'Choose gate mode', 'Customers choose Audit only for logging/retrospective review, or Enforce gate to inspect and halt actions before execution'],
  ['5', 'Receive a decision', 'The system returns ALLOW, STABILIZE, or BLOCK with a human-readable reason'],
  ['6', 'Report back to Control Plane', 'The decision, evidence, and result receipt link back to the existing dashboard/audit flow'],
];

const usageSteps = [
  ['Open Product page', 'Go to /product to get an overview of where CospinDSG sits in the agent flow'],
  ['Click Connect agent', 'Go to /dashboard/integrations to start connecting your existing agent'],
  ['Choose a protected action', 'Define the first action that should be gated — such as payment or deploy'],
  ['Choose Audit or Enforce', 'Audit only is for collecting evidence first; Enforce gate halts actions when the gate does not pass'],
  ['Open evidence', 'Use docs/audit/dashboard to view memory, action, decision, and result hash'],
  ['Expand rollout gradually', 'Once one action works correctly, add more workflows — never claim beyond verified evidence'],
];

const connectSteps = [
  ['1', 'Register', 'Create an agent record in the Control Plane and issue an API key / agent ID to the customer'],
  ['2', 'Wrap', 'Wrap the customer\'s existing execute function with guardedAction — without changing the agent\'s core logic'],
  ['3', 'Preflight', 'Send the action envelope and memory packet to DSG before the action reaches the real system'],
  ['4', 'Mode switch', 'Customer chooses Audit only or Enforce gate: Audit logs evidence without blocking; Enforce inspects and can halt actions'],
  ['5', 'Receipt', 'After execution, send the result receipt hash back to store the audit trail in the Control Plane'],
];

const benefits = [
  'No need to migrate your existing agent runtime',
  'See instantly which actions passed, were halted, or were blocked',
  'Evidence chain available for reviewers and audit',
  'Connects back to the existing DSG Control Plane immediately',
];

export default function ProductPage() {
  return (
    <main className="min-h-screen bg-[#090a0d] text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="relative overflow-hidden border border-white/10 bg-[linear-gradient(135deg,rgba(126,16,24,0.24),rgba(9,10,13,0.9)_34%,rgba(245,197,92,0.1)_120%)] p-8">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">DSG Product Surface</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white md:text-6xl">
                CospinDSG Agent Shield
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                A new product page using the same theme as the Control Plane: place CospinDSG in front of your existing agent to gate critical actions before real execution, then feed results back into the existing dashboard, integrations, docs, and audit flow.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/dashboard" className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950">
                  Open Control Plane
                </Link>
                <Link href="/dashboard/integrations" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">
                  Connect agent
                </Link>
                <Link href="/docs/COSPIN_DSG_RUNTIME_SPINE" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">
                  Runtime spine docs
                </Link>
              </div>
            </div>

            <div className="border border-amber-300/20 bg-black/30 p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-200">Mini monitor</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Agent → CospinDSG → Control Plane</h2>
              <div className="mt-5 space-y-3">
                {monitorRows.map(([key, value, status]) => (
                  <div key={key} className="grid gap-3 border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[120px_1fr_120px] md:items-center">
                    <p className="text-sm font-semibold text-white">{key}</p>
                    <p className="text-sm text-slate-300">{value}</p>
                    <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-center text-[11px] uppercase tracking-[0.18em] text-emerald-100">
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="border border-white/10 bg-[#0d0f12] p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Workflow sequence</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">From existing agent to evidence in the Control Plane</h2>
            <div className="mt-5 space-y-3">
              {workflowSteps.map(([step, title, body]) => (
                <div key={step} className="grid gap-4 border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[52px_180px_1fr] md:items-start">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/10 text-sm font-semibold text-amber-100">
                    {step}
                  </div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-sm leading-7 text-slate-300">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-amber-300/20 bg-amber-300/10 p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-200">How to use</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">The simplest path to real usage</h2>
            <div className="mt-5 space-y-3">
              {usageSteps.map(([title, body], index) => (
                <div key={title} className="border border-amber-300/15 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Step {index + 1}</p>
                  <h3 className="mt-2 text-sm font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-amber-50/90">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 border border-blue-300/20 bg-blue-300/10 p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200">Connect to the customer&apos;s existing agent system</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Wrapper integration — no need to replace the existing agent</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">
            The correct integration method is not to migrate the customer&apos;s agent into DSG, but to place CospinDSG as a pre-action gate in front of the function that is about to run — such as transfer, deploy, approve, or write to an external system.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {connectSteps.map(([step, title, body]) => (
              <div key={step} className="border border-blue-200/15 bg-black/20 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200/30 bg-blue-200/10 text-sm font-semibold text-blue-100">
                  {step}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-blue-50/85">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <ProductGateModeSwitch />
          </div>

          <div className="mt-5 border border-white/10 bg-[#0d0f12] p-4 text-sm leading-7 text-slate-300">
            <p className="font-semibold text-white">Integration rule</p>
            <p className="mt-2">
              The customer&apos;s existing agent continues calling its existing tools as before, but before calling any real tool it must send an action envelope to DSG first. In Audit only mode: log the result and let the existing system proceed. In Enforce gate mode: if the gate does not return ALLOW, the action must not be executed and the reason must be shown to the operator or reviewer.
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ['ALLOW', 'Permit the action for the existing agent to execute when conditions pass and evidence is complete'],
            ['STABILIZE', 'Halt to return to a stable state when drift or oscillation exceeds policy thresholds'],
            ['BLOCK', 'Block before harm occurs when an invariant, memory, network, or temporal breach is detected'],
          ].map(([title, body]) => (
            <article key={title} className="border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Decision</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="border border-emerald-400/20 bg-emerald-400/10 p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-200/80">User benefit</p>
            <h2 className="mt-2 text-2xl font-semibold text-emerald-50">Immediate value — no lengthy explanation needed</h2>
            <div className="mt-5 space-y-3">
              {benefits.map((benefit) => (
                <div key={benefit} className="border border-emerald-300/15 bg-black/20 p-4 text-sm leading-7 text-emerald-50">
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/10 bg-[#0d0f12] p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Connect to existing plane</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">No separate system — everything stays in DSG</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              This product page is the new core page for DSG, but real usage still flows back into the existing Control Plane: dashboard for monitoring, integrations for connecting agents, docs for the runtime spine and audit evidence.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Link href="/dashboard" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold text-slate-100">Dashboard</Link>
              <Link href="/dashboard/integrations" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold text-slate-100">Integrations</Link>
              <Link href="/docs" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold text-slate-100">Docs</Link>
            </div>
          </div>
        </section>

        <section className="mt-6 border border-amber-300/25 bg-amber-300/10 p-5 text-sm leading-7 text-amber-50">
          <p className="font-semibold">Claim boundary</p>
          <p className="mt-2">
            This page wires the Audit/Enforce switch to the backend API and settings, but production use still requires passing tests, typecheck, build, auth, database migration, and live smoke evidence.
          </p>
        </section>
      </div>
    </main>
  );
}
