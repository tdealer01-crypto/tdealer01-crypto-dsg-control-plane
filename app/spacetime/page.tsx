import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'DSG Spacetime — Governed Execution for AI Agents',
  description:
    'Customer-hosted governed execution for AI agents and MCP. Bind actions to approved Routes, fail closed outside entitlement, and keep verifiable evidence.',
  alternates: { canonical: '/spacetime' },
  openGraph: {
    title: 'DSG Spacetime — Governed Execution for AI Agents',
    description:
      'Install a compiled runtime, bind one governed Route, connect an agent or MCP client, and preserve ALLOW/BLOCK evidence.',
    url: 'https://www.dsg.pics/spacetime',
    siteName: 'DSG ONE',
    type: 'website',
  },
};

const CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_DSG_SPACETIME_CHECKOUT_ENABLED === 'true';
const CHECKOUT_URL = process.env.NEXT_PUBLIC_DSG_SPACETIME_1_ROUTE_CHECKOUT_URL || '';

const setupSteps = [
  {
    n: '01',
    title: 'Install the runtime',
    body: 'Receive the compiled Linux AMD64 runtime, signed entitlement and license public key. Extract the package and run ./install.',
  },
  {
    n: '02',
    title: 'Bind your deployment',
    body: 'Use the deployment ID carried by the signed entitlement. The installer verifies the entitlement and prepares the local deployment configuration.',
  },
  {
    n: '03',
    title: 'Connect an agent and run a Route',
    body: 'Connect through MCP, compose an approved Route, execute through your customer-owned adapter, and retain the resulting evidence.',
  },
] as const;

const proofItems = [
  ['MCP', '2025-06-18', 'Protocol initialization verified in the accepted runtime test scope.'],
  ['COMPOSE', 'BOUND', 'The governed Route is bound before execution.'],
  ['EXECUTE', 'ALLOW', 'A plan-authorized non-destructive Route executed successfully.'],
  ['EVIDENCE', 'VALID', 'The execution produced verifiable evidence records.'],
  ['WRONG DEPLOYMENT', 'BLOCK', 'A mismatched deployment ID fails closed.'],
] as const;

const included = [
  'Compiled source-free Linux AMD64 runtime',
  'Automatic installer and readiness smoke test',
  'Seller-signed, deployment-bound commercial entitlement',
  'License public key for entitlement verification',
  '1 governed Route activation',
  'MCP tools for discover, compose, execute and evidence verification',
] as const;

export default function SpacetimeProductPage() {
  const canCheckout = CHECKOUT_ENABLED && Boolean(CHECKOUT_URL);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050812] text-white">
      <section className="relative border-b border-white/[0.08]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(56,189,248,0.19),transparent_34%),radial-gradient(circle_at_88%_16%,rgba(16,185,129,0.14),transparent_30%),radial-gradient(circle_at_60%_90%,rgba(245,158,11,0.09),transparent_36%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-28">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-100">
                DSG SPACETIME
              </span>
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-100">
                P0-1 VERIFIED
              </span>
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-bold leading-[0.95] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
              Let the agent act. Keep execution governed.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
              DSG Spacetime is a customer-hosted governed execution runtime for AI agents and MCP clients. Bind execution to a signed entitlement and approved Route, fail closed when deployment identity does not match, and keep evidence for what actually ran.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#buy"
                className="rounded-2xl bg-sky-300 px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-sky-200"
              >
                View 1 Route — $299
              </a>
              <a
                href="#proof"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/20"
              >
                See verified proof
              </a>
              <Link
                href="/docs"
                className="rounded-2xl border border-white/10 px-6 py-3.5 text-sm font-bold text-slate-300 transition hover:text-white"
              >
                Integration docs
              </Link>
            </div>

            <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
              {[
                ['INSTALL', './install'],
                ['CONNECT', 'Agent · MCP'],
                ['PROVE', 'ALLOW · BLOCK · Evidence'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-200">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/[0.09] bg-[#09101f]/90 p-6 shadow-2xl shadow-black/30">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">Execution boundary</p>
                <p className="mt-2 text-lg font-bold">Agent → DSG Spacetime → Your system</p>
              </div>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-200">FAIL-CLOSED</span>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ['1', 'IDENTITY', 'Deployment and entitlement identity'],
                ['2', 'PLAN / ROUTE', 'Approved governed execution path'],
                ['3', 'POLICY', 'Applicable runtime constraints'],
                ['4', 'EXECUTION', 'Customer-owned Node / Adapter'],
                ['5', 'EVIDENCE', 'Result and audit record'],
              ].map(([n, title, body]) => (
                <div key={n} className="grid grid-cols-[34px_1fr] gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-300/20 bg-sky-300/10 text-[10px] font-bold text-sky-100">{n}</span>
                  <div>
                    <p className="text-xs font-bold text-white">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.08] bg-[#080d18]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-200">3-step setup</p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-5xl">From delivery to governed execution.</h2>
            <p className="mt-4 text-base leading-8 text-slate-500">
              The commercial package is designed so the first path is installation, entitlement binding and one governed Route — not a multi-service migration.
            </p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {setupSteps.map((step) => (
              <article key={step.n} className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-7">
                <p className="text-xs font-bold text-sky-200">{step.n}</p>
                <h3 className="mt-5 text-xl font-bold">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="border-b border-white/[0.08]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-200">Verified product behavior</p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-5xl">Proof is part of the product.</h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-500">
              The current accepted commercial runtime passed the controlled launch acceptance chain for exact artifact identity, clean startup, MCP initialization, governed Route execution, evidence verification and fail-closed deployment mismatch behavior.
            </p>
            <div className="mt-7 rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5 text-sm leading-7 text-slate-400">
              Scope note: this is recorded runtime and delivery evidence for the tested path. It is not an independent certification claim and does not claim every future customer workload is correct.
            </div>
          </div>

          <div className="space-y-3">
            {proofItems.map(([label, status, body]) => (
              <div key={label} className="grid gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:grid-cols-[150px_110px_1fr] sm:items-center">
                <span className="text-xs font-bold text-slate-300">{label}</span>
                <span className="text-xs font-bold text-emerald-200">{status}</span>
                <span className="text-sm leading-6 text-slate-500">{body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="buy" className="bg-[#080d18]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
          <div className="grid gap-8 rounded-[2rem] border border-white/[0.09] bg-[linear-gradient(135deg,rgba(56,189,248,0.08),rgba(255,255,255,0.02),rgba(16,185,129,0.06))] p-7 sm:p-10 lg:grid-cols-[1fr_0.78fr] lg:items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-200">Commercial package</p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-5xl">1 governed Route</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-400">
                One-time commercial license for a customer-owned deployment. Production source code is not included.
              </p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {included.map((item) => (
                  <li key={item} className="flex gap-3 rounded-2xl border border-white/[0.07] bg-black/10 p-4 text-sm leading-6 text-slate-300">
                    <span className="font-bold text-emerald-300">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="rounded-3xl border border-white/[0.1] bg-[#070b13]/90 p-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">1 Route license</p>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-5xl font-bold tracking-[-0.04em]">$299</span>
                <span className="pb-1 text-sm text-slate-500">one-time</span>
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-500">
                Includes the compiled runtime, signed entitlement and one Route activation for the bound deployment.
              </p>

              {canCheckout ? (
                <a
                  href={CHECKOUT_URL}
                  className="mt-7 block rounded-2xl bg-emerald-300 px-5 py-4 text-center text-sm font-bold text-emerald-950 transition hover:bg-emerald-200"
                >
                  Buy 1 Route — $299
                </a>
              ) : (
                <div className="mt-7 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-5 py-4 text-center">
                  <p className="text-sm font-bold text-amber-100">Checkout prepared — public activation pending</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">The product page is live-ready; the Stripe Payment Link remains inactive until a separate commercial launch authorization.</p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/docs" className="text-sm font-bold text-sky-200 hover:text-sky-100">Read docs →</Link>
                <Link href="/pricing" className="text-sm font-bold text-slate-400 hover:text-slate-200">Other DSG pricing →</Link>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
