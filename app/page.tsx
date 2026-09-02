import Link from 'next/link';
import { Suspense } from 'react';
import RefTracker from '../components/RefTracker';

const stages = [
  { index: '01', title: 'ACTION', body: 'What the agent is trying to do', status: 'CAPTURED' },
  { index: '02', title: 'PLAN ALIGNMENT', body: 'Whether it matches the approved plan', status: 'CHECKED' },
  { index: '03', title: 'PERMISSION', body: 'Whether this identity may execute it', status: 'VERIFIED' },
  { index: '04', title: 'EVIDENCE', body: 'Whether the decision has supporting proof', status: 'RECORDED' },
  { index: '05', title: 'EXECUTION / AUDIT', body: 'What happens next and what was recorded', status: 'PASS / BLOCK' },
] as const;

const outcomes = [
  ['PASS', 'The action satisfies the current governance checks and may continue.'],
  ['BLOCKED', 'The action is outside the approved conditions and is stopped in enforce mode.'],
  ['WAITING_PERMISSION', 'The current execution identity does not have sufficient permission.'],
  ['UNVERIFIED', 'There is not enough verified evidence to support the action or claim.'],
] as const;

const flow = [
  ['01', 'Connect one system', 'Route one existing MCP, OpenAPI, REST, or webhook workflow through DSG. Start with a single action instead of migrating your stack.'],
  ['02', 'Choose control mode', 'Observe records the governance result. Enforce can stop downstream execution when governance requires it.'],
  ['03', 'Read the decision', 'See the action, plan alignment, permission, evidence, and final execution/audit result in one path.'],
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07080b] text-white">
      <Suspense fallback={null}><RefTracker /></Suspense>

      <section className="relative border-b border-white/[0.07]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(59,130,246,0.14),transparent_30%),radial-gradient(circle_at_86%_14%,rgba(245,158,11,0.10),transparent_28%)]" />
        <div className="relative mx-auto grid min-h-[690px] max-w-7xl gap-12 px-5 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <p className="inline-flex rounded-full border border-blue-300/20 bg-blue-300/[0.07] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100">
              Runtime governance for existing AI systems
            </p>
            <h1 className="mt-7 max-w-4xl text-5xl font-bold leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Control what AI agents can do — before they do it.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
              DSG sits between an agent and the system it wants to change. It checks plan alignment, permission, and evidence, then records an auditable decision you can act on.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login?next=/dashboard/integrations"
                className="rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-slate-200"
              >
                Connect one system
              </Link>
              <Link
                href="/dashboard/governance-live"
                className="rounded-xl border border-white/12 bg-white/[0.04] px-5 py-3.5 text-sm font-bold text-white transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                Open live governance
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">
              <span>MCP / OpenAPI</span>
              <span>REST / Webhooks</span>
              <span>Observe / Enforce</span>
              <span>Evidence + Audit</span>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/[0.08] bg-[#0b0d11]/90 p-4 shadow-2xl shadow-black/30 sm:p-5">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-1 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">Decision path</p>
                <p className="mt-1 text-sm font-semibold text-white">One action · five checks</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold text-slate-400">
                LIVE AFTER CONNECT
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              {stages.map((stage) => (
                <div key={stage.index} className="grid grid-cols-[38px_1fr_auto] items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-300/15 bg-blue-300/[0.06] text-[10px] font-bold text-blue-100">
                    {stage.index}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{stage.title}</p>
                    <p className="mt-1 truncate text-[11px] text-slate-600">{stage.body}</p>
                  </div>
                  <span className="hidden rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[9px] font-bold text-slate-400 sm:block">
                    {stage.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-white/[0.07] bg-[#090a0e]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-200">From connection to proof</p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl">One clear path to the first governed action.</h2>
            <p className="mt-4 text-base leading-8 text-slate-500">
              The primary workflow is intentionally short: connect, choose control mode, then read the decision and next action.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {flow.map(([index, title, body]) => (
              <article key={index} className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-7">
                <span className="text-xs font-bold text-blue-200">{index}</span>
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
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-200">Decision, reason, next step</p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl">No log archaeology required.</h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-500">
                Each result should tell an operator what happened, whether execution may continue, why, and what must change when it cannot.
              </p>
            </div>
            <div className="grid gap-3">
              {outcomes.map(([status, body]) => (
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
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-200">Start with one action</p>
            <h2 className="mt-3 text-3xl font-bold text-white">Connect one system. Run one action. See the proof.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              Technical details remain available in Evidence and Audit, but the primary workflow does not require the user to search through raw logs.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/login?next=/dashboard/integrations" className="rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-slate-950">
              Connect one system
            </Link>
            <Link href="/docs" className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3.5 text-sm font-bold text-white">
              Integration docs
            </Link>
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
