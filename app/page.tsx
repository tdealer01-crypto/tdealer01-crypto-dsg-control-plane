import Link from 'next/link';
import { Suspense } from 'react';
import RefTracker from '../components/RefTracker';

const PRODUCT_URL = 'https://dsg-cinema-production.nicetree-a005fe99.westus3.azurecontainerapps.io/dashboard';

const installPaths = [
  {
    label: 'WEB',
    title: 'Guided install',
    body: 'Choose the integration, account, scope and minimum permissions in a guided customer flow.',
  },
  {
    label: 'AI',
    title: 'AI Install Wizard',
    body: 'Detect the project stack, review the proposed setup and keep approval and permission gates explicit.',
  },
  {
    label: 'CLI',
    title: 'Automation-ready',
    body: 'Use the same provisioner through dsgctl for install, status, Doctor and first-result workflows.',
  },
] as const;

const lifecycle = ['PENDING', 'AUTHORIZED', 'PROVISIONED', 'VERIFIED', 'HEALTHY'] as const;

const governanceChecks = [
  ['01', 'ACTION', 'Capture exactly what the agent is trying to do.'],
  ['02', 'PLAN ALIGNMENT', 'Check the action against the approved plan.'],
  ['03', 'PERMISSION', 'Verify identity, scope and required authority.'],
  ['04', 'EVIDENCE', 'Require evidence that supports the decision and result.'],
  ['05', 'EXECUTION / AUDIT', 'Record what actually happened and preserve the audit trail.'],
] as const;

const capabilities = [
  ['Scoped installation', 'Repository and environment scope stay explicit instead of granting broad access by default.'],
  ['Admin approval', 'Installations can wait for an owner or admin instead of silently failing or widening permissions.'],
  ['Signed callback binding', 'Authorization callbacks are bound to installation state rather than trusted as loose redirect parameters.'],
  ['Installation Doctor', 'Inspect setup, hashes, configuration, callback state and first-result readiness from one place.'],
  ['Repair + tamper detection', 'Detect drift and repair installation artifacts from the verified source instead of masking mismatches.'],
  ['First installation proof', 'Create an INSTALLATION_INTEGRITY_PROOF after verification so setup ends with evidence, not a green badge alone.'],
] as const;

const outcomes = [
  ['PASS', 'The action satisfies the current governance conditions.'],
  ['BLOCKED', 'The action is outside the allowed plan or applicable constraints.'],
  ['WAITING_PERMISSION', 'The execution context is missing required authority.'],
  ['UNVERIFIED', 'Required evidence is not available yet.'],
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#060914] text-white">
      <Suspense fallback={null}><RefTracker /></Suspense>

      <section className="relative border-b border-white/[0.07]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(59,130,246,0.19),transparent_31%),radial-gradient(circle_at_82%_8%,rgba(212,175,55,0.14),transparent_28%),radial-gradient(circle_at_52%_86%,rgba(14,165,233,0.08),transparent_36%)]" />
        <div className="relative mx-auto grid min-h-[760px] max-w-7xl gap-12 px-5 py-20 sm:px-6 lg:grid-cols-[1.06fr_0.94fr] lg:items-center lg:py-24">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-100">DSG ONE</span>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100">Production-backed evidence</span>
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-bold leading-[0.96] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              Govern the action. Prove the result.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
              DSG adds a governed execution and evidence layer to AI agents, MCP tools and automated workflows. Install with Web, AI or CLI, keep scope and permissions explicit, then follow every governed action through decision, execution and proof.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href={PRODUCT_URL} className="rounded-2xl bg-sky-300 px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-sky-200">
                Open DSG ONE
              </a>
              <Link href="/login?next=/dashboard/integrations" className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/20">
                Connect an agent
              </Link>
              <Link href="#proof" className="rounded-2xl border border-white/10 px-6 py-3.5 text-sm font-bold text-slate-300 transition hover:text-white">
                See what is proven
              </Link>
            </div>

            <div className="mt-9 grid max-w-3xl gap-3 sm:grid-cols-3">
              {[
                ['INSTALL', 'Web · AI · CLI'],
                ['GOVERN', 'Observe · Enforce'],
                ['PROVE', 'Evidence · Replay · Audit'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-200">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/[0.08] bg-[#09101f]/90 p-5 shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">Customer lifecycle</p>
                <p className="mt-1 text-sm font-semibold text-white">Install to first verified result</p>
              </div>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-200">FAIL-CLOSED</span>
            </div>

            <div className="mt-5 grid gap-3">
              {lifecycle.map((state, index) => (
                <div key={state} className="grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-300/20 bg-sky-300/10 text-[10px] font-bold text-sky-100">{index + 1}</span>
                  <div>
                    <p className="text-xs font-bold text-white">{state}</p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      {index === 0 && 'Target and scope selected'}
                      {index === 1 && 'Authorization bound to installation'}
                      {index === 2 && 'Artifacts provisioned from source'}
                      {index === 3 && 'Hashes and installation state verified'}
                      {index === 4 && 'First installation proof available'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">0{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.07] bg-[#080d18]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-200">Install your way</p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl">One provisioner. Three entry paths.</h2>
            <p className="mt-4 text-base leading-8 text-slate-500">The customer experience can be simple without weakening the governance boundary. Web, AI and CLI converge on the same installation state and verification model.</p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {installPaths.map((path) => (
              <article key={path.label} className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-7">
                <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-sky-100">{path.label}</span>
                <h3 className="mt-6 text-xl font-bold text-white">{path.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">{path.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="governance" className="border-b border-white/[0.07]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-100">Runtime governance</p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl">Know why an action can continue.</h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-slate-500">
              DSG is designed to sit between an existing agent and execution. Actions inside an approved plan can proceed when required permissions and constraints are satisfied. Out-of-plan or unsupported claims do not silently become success.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/dashboard/governance-live" className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white">Live governance</Link>
              <Link href="/docs" className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300">Integration docs</Link>
            </div>
          </div>

          <div className="space-y-2.5">
            {governanceChecks.map(([index, title, body]) => (
              <div key={index} className="grid grid-cols-[40px_1fr] gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:grid-cols-[40px_170px_1fr] sm:items-center">
                <span className="text-xs font-bold text-amber-100">{index}</span>
                <span className="text-xs font-bold text-white">{title}</span>
                <span className="text-sm leading-6 text-slate-500">{body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.07] bg-[#080d18]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-200">Operational reliability</p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl">Installation should be diagnosable, repairable and provable.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(([title, body]) => (
              <article key={title} className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="border-b border-white/[0.07]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-200">Proof, not just status</p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl">The first result is an integrity proof.</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-500">
              After installation verification, DSG can create an <span className="font-semibold text-slate-300">INSTALLATION_INTEGRITY_PROOF</span> covering callback binding, scope, provisioned artifacts, source lineage, hashes and verification state. It proves installation integrity; it does not claim that every future AI task is correct.
            </p>

            <div className="mt-8 rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.04] p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">Current production evidence</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">The current DSG Cinema production path has passed Azure deployment, direct Z3 verification, Cinema→Z3 E2E/replay and exact live Market-Ready UI byte attestation. This is runtime evidence, not a certification claim.</p>
              <a href={PRODUCT_URL} className="mt-5 inline-flex text-sm font-bold text-emerald-200 hover:text-emerald-100">Open the attested product surface →</a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Governance outcomes</p>
            <div className="mt-4 space-y-3">
              {outcomes.map(([status, body]) => (
                <div key={status} className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
                  <p className="text-sm font-bold text-white">{status}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#080d18]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
          <div className="rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(56,189,248,0.09),rgba(255,255,255,0.02),rgba(212,175,55,0.06))] p-7 sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-200">Start with one verified path</p>
              <h2 className="mt-3 text-3xl font-bold text-white">Install. Govern one action. Inspect the proof.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">Use the Market-Ready product surface for installation, or connect an existing MCP/OpenAPI workflow to the Control Plane.</p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3 lg:mt-0">
              <a href={PRODUCT_URL} className="rounded-2xl bg-sky-300 px-6 py-3.5 text-sm font-bold text-slate-950">Open DSG ONE</a>
              <Link href="/login?next=/dashboard/integrations" className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-bold text-white">Connect agent</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.07] bg-[#060914]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>DSG ONE · Governed AI execution + evidence</span>
          <span>Production claims stay bounded by current executable evidence.</span>
        </div>
      </footer>
    </main>
  );
}
