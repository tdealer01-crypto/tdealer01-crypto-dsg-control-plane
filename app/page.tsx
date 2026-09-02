import Link from 'next/link';
import { Suspense } from 'react';
import RefTracker from '../components/RefTracker';

const stages = [
  { index: '01', title: 'ACTION', body: 'See exactly what the agent is trying to do.', status: 'CAPTURED' },
  { index: '02', title: 'PLAN ALIGNMENT', body: 'Check whether the action matches the approved plan.', status: 'CHECKED' },
  { index: '03', title: 'PERMISSION', body: 'Verify the execution identity and required permission.', status: 'VERIFIED' },
  { index: '04', title: 'EVIDENCE', body: 'See whether supporting evidence is present for the decision.', status: 'RECORDED' },
  { index: '05', title: 'EXECUTION / AUDIT', body: 'See the final governance result and persisted audit record.', status: 'PASS / BLOCK' },
] as const;

const decisions = [
  ['PASS', 'The action satisfies the current governance checks.'],
  ['BLOCKED', 'The action is outside the allowed conditions and should not continue in enforce mode.'],
  ['WAITING_PERMISSION', 'The current execution identity does not have sufficient permission.'],
  ['UNVERIFIED', 'There is not enough verified evidence to support the action or claim.'],
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07080b] text-white">
      <Suspense fallback={null}><RefTracker /></Suspense>

      <header className="border-b border-white/[0.07] bg-[#07080b]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10 text-[10px] font-black tracking-[0.12em] text-amber-100">DSG</span>
            <span>
              <span className="block text-xs font-bold uppercase tracking-[0.2em] text-white">DSG</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-600">Control Plane</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="#how-it-works" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white sm:block">How it works</Link>
            <Link href="/docs" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white sm:block">Docs</Link>
            <Link href="/login" className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white">Continue with email</Link>
          </nav>
        </div>
      </header>

      <section className="relative border-b border-white/[0.07]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(225,6,0,0.16),transparent_28%),radial-gradient(circle_at_84%_10%,rgba(212,175,55,0.13),transparent_31%)]" />
        <div className="relative mx-auto grid min-h-[720px] max-w-7xl gap-12 px-5 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <p className="inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-100">Runtime governance for existing agents</p>
            <h1 className="mt-7 max-w-4xl text-5xl font-bold leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">Know what your AI is about to do.</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
              Connect an agent through MCP or OpenAPI. DSG evaluates actions against the server-side governance context, permissions and available evidence, then records the decision for audit review.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?next=/dashboard/integration" className="rounded-2xl bg-amber-300 px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-amber-200">Connect your agent</Link>
              <Link href="/dashboard/governance-live" className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/20">See Live Governance</Link>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                ['CONNECT', 'MCP or OpenAPI'],
                ['CHOOSE', 'Observe or Enforce'],
                ['SEE', 'Decision + evidence'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-200">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/[0.08] bg-black/25 p-4 shadow-2xl shadow-black/30 sm:p-5">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-2 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">Live governance</p>
                <p className="mt-1 text-sm font-semibold text-white">One action · five checks</p>
              </div>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-200">REAL EVENTS</span>
            </div>
            <div className="mt-4 space-y-2.5">
              {stages.map((stage) => (
                <div key={stage.index} className="grid grid-cols-[38px_1fr_auto] items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10 text-[10px] font-bold text-amber-100">{stage.index}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{stage.title}</p>
                    <p className="mt-1 truncate text-[11px] text-slate-600">{stage.body}</p>
                  </div>
                  <span className="hidden rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[9px] font-bold text-slate-400 sm:block">{stage.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-white/[0.07] bg-[#090a0e]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-100">How it works</p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl">Use the systems you already have.</h2>
            <p className="mt-4 text-base leading-8 text-slate-500">The control plane is organized around the user task: connect, choose control mode, then read the governance decision.</p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {[
              ['01', 'Connect', 'Route an existing MCP or OpenAPI action through DSG. You do not need to build a new agent just to use the governance surface.'],
              ['02', 'Choose control', 'Observe records governance results. Enforce lets the configured governance decision stop downstream execution when required.'],
              ['03', 'Read the decision', 'Follow Action → Plan Alignment → Permission → Evidence → Execution / Audit without searching through logs.'],
            ].map(([index, title, body]) => (
              <article key={index} className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-7">
                <span className="text-xs font-bold text-amber-100">{index}</span>
                <h3 className="mt-6 text-xl font-bold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.07]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-100">Clear outcomes</p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl">No log archaeology.</h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-500">Each result should answer what happened, why, whether the action may continue, and what the operator must change when it cannot.</p>
            </div>
            <div className="grid gap-3">
              {decisions.map(([status, body]) => (
                <div key={status} className="grid gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:grid-cols-[190px_1fr] sm:items-center">
                  <span className="text-sm font-bold text-white">{status}</span>
                  <span className="text-sm leading-6 text-slate-500">{body}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#090a0e]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-20 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-100">Start with one action</p>
            <h2 className="mt-3 text-3xl font-bold text-white">Connect. Run one action. See the decision.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">Technical proof details remain available under Evidence and Audit; they are not required to understand the primary workflow.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/login?next=/dashboard/integration" className="rounded-2xl bg-amber-300 px-6 py-3.5 text-sm font-bold text-slate-950">Connect your agent</Link>
            <Link href="/docs" className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-bold text-white">Integration docs</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.07] bg-[#07080b]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>DSG Control Plane</span>
          <span>Governance decisions should be backed by current runtime evidence.</span>
        </div>
      </footer>
    </main>
  );
}
