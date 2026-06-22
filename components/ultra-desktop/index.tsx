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
  const latest = backend.actions[0];
  const stage = usePipelineStage(latest);
  const logs = useMemo(() => backend.executions.map((e) => `[SPINE] ${e.executionId} -> ${e.status}`), [backend.executions]);

  const dispatch = () => {
    if (!intent.trim()) return;
    backend.submitAction({
      type: 'BROWSER_AGENT',
      target: 'DSG_APPROVAL_GATE',
      intent,
      generatedCodeOrPayload: { command: { action: 'startPipeline' } },
    });
    setIntent('');
  };

  return (
    <div className="grid h-full grid-cols-12 gap-0 divide-x divide-white/10">
      <aside className="col-span-3 space-y-3 overflow-y-auto p-3">
        <Section title="Access Layer">
          <textarea
            className="h-24 w-full resize-none rounded-md border border-white/10 bg-black/40 p-2 text-[11px] text-slate-200 outline-none focus:border-white/20"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
          />
          <button
            type="button"
            disabled={backend.loading || stage === 'EXECUTING'}
            onClick={dispatch}
            className="mt-2 w-full rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1.5 text-left text-[11px] font-semibold text-blue-200 transition hover:bg-blue-500/20 disabled:opacity-50"
          >
            TRIGGER REQUEST
          </button>
        </Section>

        <Section title="DSG Policy Engine v2">
          <Column gap="6px">
            <CheckItem label="Input Validation" passed={stage !== 'IDLE'} />
            <CheckItem label="Policy Check" passed={stage !== 'IDLE' && stage !== 'BLOCKED'} />
            <CheckItem label="Risk Analysis" passed={stage !== 'IDLE' && stage !== 'BLOCKED'} />
            <CheckItem label="Compliance Check" passed={stage !== 'IDLE' && stage !== 'BLOCKED'} />
            <CheckItem label="Cost & Quota Check" passed={stage !== 'IDLE' && stage !== 'BLOCKED'} />
            {stage === 'BLOCKED' && <span className="text-[10px] text-red-400">❌ ACCESS DENIED</span>}
          </Column>
        </Section>

        <Section title="Memory Layer">
          <Column gap="6px">
            <IconItem label="Vector DB" />
            <IconItem label="Knowledge Graph" />
            <IconItem label="Episodic Memory" />
            <IconItem label="Long-Term Memory" />
          </Column>
        </Section>

        <Section title="Infrastructure">
          <Row wrap className="gap-2">
            <Badge label="K8s Cluster" />
            <Badge label="Auto Scaling" />
            <Badge label="Service Mesh" />
            <Badge label="CI/CD GitOps" />
          </Row>
        </Section>
      </aside>

      <section className="col-span-9 space-y-4 overflow-y-auto p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Level Ultra</p>
            <h1 className="text-base font-extrabold text-white">AGI-Grade Agent Architecture</h1>
            <p className="text-[11px] text-blue-300">Autonomous • Scalable • Secure • Deterministic</p>
          </div>
          <Metric label="Latency" value={`${latest?.instructions?.latency ?? 0}ms`} />
          <Metric label="Quality" value={latest?.instructions?.qualityScore ? latest.instructions.qualityScore.toFixed(2) : '0.00'} />
        </div>

        <ArchBlock title="CORE ORCHESTRATOR" icon="⚡" color="#3b82f6" active={stage === 'ORCHESTRATOR' || stage === 'EXECUTION'}>
          <Row className="gap-2">
            <Node label="Planner" active={stage !== 'IDLE'} />
            <Node label="DAG Build" active={stage !== 'IDLE'} />
            <Node label="Scheduler" active={stage !== 'IDLE'} />
            <Node label="Router" active={stage !== 'IDLE'} />
          </Row>
        </ArchBlock>

        <Row className="gap-3">
          <Box half title="DATA & TOOL INTEGRATION">
            <Column gap="4px">
              <IconItem label="Web Search" />
              <IconItem label="RAG Pipeline" />
              <IconItem label="API Integrations" />
              <IconItem label="Code Execution" />
            </Column>
          </Box>
          <Box half title="MODEL ROUTER">
            <Column gap="4px">
              <Badge label="Llama 4 Maverick" />
              <Badge label="OpenAI GPT-4o" />
              <Badge label="Hermes 3" />
              <Badge label="Gemini 3.5 Flash" />
            </Column>
          </Box>
        </Row>

        <ArchBlock title="EXECUTION ENGINE (PARALLEL)" icon="⚙" color="#06b6d4" active={stage === 'EXECUTION' || stage === 'CRITIC'}>
          {!latest ? (
            <EmptyState label="Awaiting dispatch..." />
          ) : (
            <Column gap="8px">
              <WorkerRow label="Complex Reasoning" model="Hermes 3" status={latest.status} />
              <WorkerRow label="Data Processing" model="Nemotron-4" status={latest.status} />
              <WorkerRow label="Local Validation" model="Gemini 3.5 Flash" status={latest.status} />
              <div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2">
                <span className="text-[10px] font-bold text-yellow-300">Self-Healing & Retry Engine</span>
              </div>
            </Column>
          )}
        </ArchBlock>

        <ArchBlock title="LIVE API TASK INSPECTOR" icon="🔎" color="#eab308">
          {latest ? (
            <pre className="max-h-32 overflow-x-auto rounded-md border border-white/10 bg-black/30 p-2 text-[10px] text-slate-300">
              {JSON.stringify(latest, null, 2)}
            </pre>
          ) : (
            <EmptyState label="No active task" />
          )}
        </ArchBlock>

        <ArchBlock title="CRITIC & EVALUATION ENGINE" icon="⭐" color="#a855f7" active={stage === 'CRITIC' || stage === 'FINISHED'}>
          <Row className="gap-3">
            <Critic label="Quality Scorer" />
            <Critic label="Hallucination" />
            <Critic label="Safety Check" />
            <Critic label="Feedback Loop" />
          </Row>
        </ArchBlock>

        <Row className="gap-3">
          <Box half title="RESPONSE COMPOSER & STREAMING" active={stage === 'FINISHED'}>
            <TextMuted>{'Aggregation -\u003e Ranking -\u003e Summary -\u003e Formatting -\u003e Final Output'}</TextMuted>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-400">Real-Time Output Stream</span>
            </div>
          </Box>
          <Column className="w-1/2" gap="12px">
            <Box title="SECURITY & COMPLIANCE">
              <Column gap="4px">
                <IconItem label="Encryption In-Transit" />
                <IconItem label="RBAC & Auth" />
                <IconItem label="Audit & Privacy" />
              </Column>
            </Box>
            <Box title="DATA STORAGE">
              <Row className="gap-2">
                <Badge label="Supabase API" />
                <Badge label="PostgreSQL" />
              </Row>
            </Box>
          </Column>
        </Row>

        <ArchBlock title="OBSERVABILITY STACK" icon="📊" color="#06b6d4" active={stage === 'FINISHED'}>
          <LogViewer logs={logs} />
        </ArchBlock>
      </section>
    </div>
  );
}

function usePipelineStage(action: ReturnType<typeof useUltraBackend>['actions'][number] | undefined): string {
  const [stage, setStage] = useState('IDLE');
  useEffect(() => {
    if (!action) { setStage('IDLE'); return; }
    switch (action.status) {
      case 'PENDING':
        setStage('DSG_GATE');
        break;
      case 'APPROVED':
        setStage('EXECUTION');
        break;
      case 'EXECUTING':
        setStage('EXECUTION');
        break;
      case 'SUCCEEDED':
        setStage('FINISHED');
        break;
      case 'REJECTED':
        setStage('BLOCKED');
        break;
      case 'FAILED':
        setStage('BLOCKED');
        break;
      default:
        setStage('IDLE');
    }
  }, [action?.status, action?.actionId]);
  return stage;
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

function Column({ gap = '8px', children, className = '' }: { gap?: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col ${className}`}
      style={{ gap }}
    >
      {children}
    </div>
  );
}

function Row({ children, className = '', wrap = false }: { children: React.ReactNode; className?: string; wrap?: boolean }) {
  return (
    <div className={`flex items-center ${wrap ? 'flex-wrap' : ''} ${className}`}>{children}</div>
  );
}

function ArchBlock({
  title,
  icon,
  color,
  active = false,
  children,
}: {
  title: string;
  icon: string;
  color: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="w-full rounded-lg border bg-white/[0.02] p-3"
      style={{
        borderColor: active ? color : 'rgba(255,255,255,0.08)',
        borderWidth: active ? 1.5 : 1,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-white">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Box({
  title,
  children,
  half = false,
  active = false,
}: {
  title: string;
  children: React.ReactNode;
  half?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-white/[0.02] p-3 ${half ? 'w-1/2' : 'w-full'}`}
      style={{ borderColor: active ? '#3b82f6' : 'rgba(255,255,255,0.08)' }}
    >
      <h4 className="mb-2 text-[11px] font-semibold text-slate-300">{title}</h4>
      {children}
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">{label}</span>
  );
}

function CheckItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span style={{ color: passed ? '#34d399' : '#94a3b8' }}>{passed ? '●' : '○'}</span>
      <span className="text-slate-300">{label}</span>
    </div>
  );
}

function IconItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-slate-300">
      <span className="text-blue-400">▸</span>
      <span>{label}</span>
    </div>
  );
}

function Node({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className="rounded-md border px-2 py-1 text-center text-[10px] font-semibold"
      style={{
        borderColor: active ? '#3b82f6' : 'rgba(255,255,255,0.1)',
        color: active ? '#fff' : '#94a3b8',
        background: active ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
      }}
    >
      {label}
    </div>
  );
}

function Critic({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-center text-[10px] text-slate-300">
      {label}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  );
}

function TextMuted({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-slate-500">{children}</p>;
}

function WorkerRow({ label, model, status }: { label: string; model: string; status: string }) {
  const color =
    status === 'SUCCEEDED'
      ? '#34d399'
      : status === 'FAILED'
        ? '#f87171'
        : status === 'PENDING'
          ? '#fbbf24'
          : '#94a3b8';

  return (
    <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
      <div>
        <div className="text-[11px] font-semibold text-white">{label}</div>
        <div className="text-[10px] text-slate-500">{model}</div>
      </div>
      <span className="text-[10px] font-bold" style={{ color }}>
        {status}
      </span>
    </div>
  );
}

function LogViewer({ logs }: { logs: string[] }) {
  return (
    <div className="h-32 overflow-y-auto rounded-md border border-white/10 bg-black/40 p-2">
      {logs.length === 0 ? (
        <div className="text-[10px] text-slate-500">No logs yet</div>
      ) : (
        logs.map((log, idx) => (
          <div key={idx} className="font-mono text-[10px] text-slate-300">
            {log}
          </div>
        ))
      )}
    </div>
  );
}
