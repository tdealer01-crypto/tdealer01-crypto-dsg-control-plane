'use client';

import { useUltraBackend } from '@/lib/hooks/use-ultra-backend';
import { useMemo, useState, useEffect } from 'react';

type Mode = 'dsg' | 'agi';

export const ULTRA_BACKEND_HOOK = 'use_ultra_backend_v1';

export default function HermesUltraDesktop() {
  const backend = useUltraBackend();
  const [mode, setMode] = useState<Mode>('dsg');

  useEffect(() => {
    backend.refreshActions();
    backend.fetchExecutions(backend.currentSessionId);
    backend.refreshManifests();
  }, [backend]);

  return (
    <div className="flex h-screen min-h-0 flex-col bg-[#0a0a0f] text-slate-100">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-wide text-white/90">DSG / AGI Neural Armor</span>
          <span className="text-[10px] uppercase text-slate-400">Operator HUD</span>
        </div>
        <div className="flex items-center gap-1">
          <TabButton active={mode === 'dsg'} onClick={() => setMode('dsg')}>
            DSG Control Plane
          </TabButton>
          <TabButton active={mode === 'agi'} onClick={() => setMode('agi')}>
            AGI Level Ultra
          </TabButton>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {mode === 'dsg' ? <DsgTab backend={backend} /> : <AgiTab backend={backend} />}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
        active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function DsgTab({ backend }: { backend: ReturnType<typeof useUltraBackend> }) {
  return (
    <div className="grid h-full grid-cols-12 gap-0 divide-x divide-white/10">
      <aside className="col-span-3 space-y-3 overflow-y-auto p-3">
        <Section title="Actions Stream">
          <button
            type="button"
            disabled={backend.loading}
            onClick={() =>
              backend.submitAction({
                type: 'PROVIDER_API',
                target: 'STRIPE_APP',
                intent: 'Enqueue DSG finance policy review',
                generatedCodeOrPayload: { dryRun: true },
              })
            }
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-left text-xs text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
          >
            Simulate finance review action
          </button>
          <button
            type="button"
            disabled={backend.loading}
            onClick={() =>
              backend.submitAction({
                type: 'BROWSER_AGENT',
                target: 'https://tdealer01-crypto-dsg-control-plane.vercel.app/approvals',
                intent: 'Inspect approval queue and surface blocking gates',
                generatedCodeOrPayload: { command: { action: 'navigate' } },
              })
            }
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-left text-xs text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
          >
            Inspect approval queue via browser
          </button>
          <button
            type="button"
            disabled={backend.loading}
            onClick={() =>
              backend.submitAction({
                type: 'DYNAMIC_SANDBOX',
                target: 'PYTHON_RUNNER',
                intent: 'Smoke-check isolated execution harness path',
                generatedCodeOrPayload: 'print("sandbox smoke check")',
              })
            }
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-left text-xs text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
          >
            Run sandbox smoke-check
          </button>
        </Section>

        <Section title="Safe DOM Status">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Browserbase manifest</span>
              <span className="text-[10px] text-slate-300">{backend.manifestStatus}</span>
            </div>
            <div className="space-y-1">
              {backend.manifests.length === 0 ? (
                <EmptyState label="No manifests captured" />
              ) : (
                backend.manifests.map((m) => (
                  <div key={m.manifestId} className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-slate-300">{m.manifestId}</span>
                      <span className="text-slate-500">{m.elementCount} elements</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-mono">{m.frameId}</span>
                      <span>{new Date(m.createdAt).toLocaleTimeString('th-TH')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Section>

        <Section title="Spine">
          <button
            type="button"
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-left text-xs text-slate-200 transition hover:border-white/20 hover:bg-white/10"
            onClick={() => backend.fetchExecutions(backend.currentSessionId)}
          >
            Refresh executions
          </button>
        </Section>
      </aside>

      <section className="col-span-9 space-y-4 overflow-y-auto p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent actions</h2>
            <button
              type="button"
              className="text-[10px] text-slate-400 transition hover:text-white"
              onClick={backend.refreshActions}
            >
              Refresh
            </button>
          </div>
          {backend.actions.length === 0 ? (
            <EmptyState label="No dispatched actions yet" />
          ) : (
            <div className="space-y-2">
              {backend.actions.map((a) => (
                <div key={a.actionId} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-200">
                        <span className="mr-2 text-[10px] uppercase text-slate-500">{a.type}</span>
                        <span className="font-mono text-white">{a.target}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{a.intent}</div>
                    </div>
                    <StatusBadge status={a.status} risk={a.risk} />
                  </div>

                  {a.status === 'PENDING' && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => backend.approveAction(a.actionId)}
                        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => backend.rejectAction(a.actionId)}
                        className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-200 transition hover:bg-red-500/20"
                      >
                        Reject
                      </button>
                      <span className="text-[10px] text-slate-500">{a.message ?? 'Awaiting pilot confirmation'}</span>
                    </div>
                  )}

                  {a.status === 'SUCCEEDED' && a.result && (
                    <pre className="mt-2 max-h-40 overflow-x-auto rounded-md border border-white/10 bg-black/40 p-2 text-[10px] text-emerald-200">
                      {JSON.stringify(a.result, null, 2)}
                    </pre>
                  )}

                  {a.status === 'FAILED' && (
                    <pre className="mt-2 max-h-40 overflow-x-auto rounded-md border border-white/10 bg-black/40 p-2 text-[10px] text-red-200">
                      {a.error ?? 'Unknown failure'}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Spine execution history</h2>
          </div>
          {backend.executions.length === 0 ? (
            <EmptyState label="No spine executions" />
          ) : (
            <div className="space-y-2">
              {backend.executions.map((e) => (
                <div key={e.executionId} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-white">{e.executionId}</span>
                    <span className="text-slate-500">{new Date(e.executedAt).toLocaleString('th-TH')}</span>
                  </div>
                  <pre className="mt-1 max-h-32 overflow-x-auto rounded-md border border-white/10 bg-black/30 p-2 text-[10px] text-slate-300">
                    {JSON.stringify(e.command, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function AgiTab({ backend }: { backend: ReturnType<typeof useUltraBackend> }) {
  const [intent, setIntent] = useState('นำ DSG กลับมาสมบูรณ์พร้อม pipeline อนุมัติ');

  return (
    <div className="grid h-full grid-cols-12 gap-0 divide-x divide-white/10">
      <aside className="col-span-3 space-y-3 overflow-y-auto p-3">
        <Section title="AGI signals">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Planner</span>
              <span className="text-emerald-300">active</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Policy Gate</span>
              <span className="text-amber-300">pending</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Memory Cortex</span>
              <span className="text-sky-300">{backend.executions.length}</span>
            </div>
          </div>
        </Section>

        <Section title="Intent feed">
          <textarea
            className="h-28 w-full resize-none rounded-md border border-white/10 bg-black/40 p-2 text-xs text-slate-200 outline-none focus:border-white/20"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
          />
          <button
            type="button"
            disabled={backend.loading}
            onClick={() =>
              backend.submitAction({
                type: 'BROWSER_AGENT',
                target: 'DSG_APPROVAL_GATE',
                intent,
                generatedCodeOrPayload: { command: { action: 'scan_and_surface_approvals' } },
              })
            }
            className="mt-2 w-full rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1.5 text-left text-xs text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-50"
          >
            Dispatch AGI execution
          </button>
        </Section>
      </aside>

      <section className="col-span-9 space-y-4 overflow-y-auto p-4">
        <h2 className="text-sm font-semibold text-white">AGI execution trace</h2>
        <EmptyState label="Use left panel to dispatch intent → approve via DSG tab" />
        <div className="space-y-2">
          {backend.actions.map((a) => (
            <div key={a.actionId} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-200">
                    <span className="mr-2 text-[10px] uppercase text-slate-500">{a.type}</span>
                    <span className="font-mono text-white">{a.target}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{a.intent}</div>
                </div>
                <StatusBadge status={a.status} risk={a.risk} />
              </div>

              {a.status === 'PENDING' && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => backend.approveAction(a.actionId)}
                    className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => backend.rejectAction(a.actionId)}
                    className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-200 transition hover:bg-red-500/20"
                  >
                    Reject
                  </button>
                  <span className="text-[10px] text-slate-500">{a.message ?? 'Awaiting pilot confirmation'}</span>
                </div>
              )}

              {a.status === 'SUCCEEDED' && a.result && (
                <pre className="mt-2 max-h-40 overflow-x-auto rounded-md border border-white/10 bg-black/40 p-2 text-[10px] text-emerald-200">
                  {JSON.stringify(a.result, null, 2)}
                </pre>
              )}

              {a.status === 'FAILED' && (
                <pre className="mt-2 max-x-auto max-h-40 overflow-x-auto rounded-md border border-white/10 bg-black/40 p-2 text-[10px] text-red-200">
                  {a.error ?? 'Unknown failure'}
                </pre>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="text-[10px] text-slate-500">{label}</div>;
}

function StatusBadge({ status, risk }: { status: string; risk: string }) {
  const color =
    status === 'SUCCEEDED'
      ? 'bg-emerald-500/20 text-emerald-200'
      : status === 'FAILED'
        ? 'bg-red-500/20 text-red-200'
        : status === 'PENDING'
          ? 'bg-amber-500/20 text-amber-200'
          : 'bg-white/10 text-white';

  return (
    <div className="flex flex-col items-end gap-1">
      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${color}`}>{status}</span>
      <span className="text-[10px] text-slate-500">risk {risk}</span>
    </div>
  );
}
