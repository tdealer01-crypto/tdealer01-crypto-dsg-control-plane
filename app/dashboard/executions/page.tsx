'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Execution = {
  id: string;
  agent_id: string;
  decision: 'ALLOW' | 'STABILIZE' | 'BLOCK' | string;
  latency_ms: number;
  policy_version: string | null;
  reason: string | null;
  created_at: string;
};

type CoreLedgerItem = {
  id?: number;
  agent_id: string;
  action: string;
  decision: string;
  stability_score: number;
  reason: string;
  evaluated_at: string;
};

type CoreMetrics = {
  total_executions: number;
  allow_count: number;
  stabilize_count: number;
  block_count: number;
};

type ExecutionsResponse = {
  ok?: boolean;
  executions?: Execution[];
  core?: {
    ledger_ok?: boolean;
    ledger_items?: CoreLedgerItem[];
    metrics_ok?: boolean;
    metrics?: CoreMetrics | null;
    error?: string | null;
  };
  error?: string;
};

type TabKey = 'payload' | 'headers' | 'raw';

const INTERNAL_MODE_INFO =
  'Showing database-only execution view. DSG core ledger and metrics are unavailable in internal mode.';

const EMPTY_STATE_TITLE = 'No executions found for this workspace yet.';

const EMPTY_STATE_BODY =
  'Run your first execution to start tracing real requests, latency, and runtime outcomes for this workspace.';

function formatTime(value?: string | null) {
  if (!value) return '--:--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString();
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function decisionTone(decision?: string) {
  const normalized = String(decision || '').toUpperCase();
  if (normalized === 'ALLOW') return 'text-[#00fe66]';
  if (normalized === 'STABILIZE') return 'text-[#81ecff]';
  if (normalized === 'BLOCK') return 'text-[#ff6e85]';
  return 'text-slate-300';
}

function decisionBorder(decision?: string) {
  const normalized = String(decision || '').toUpperCase();
  if (normalized === 'ALLOW') return 'border-[#00fe66]/40';
  if (normalized === 'STABILIZE') return 'border-[#81ecff]/40';
  if (normalized === 'BLOCK') return 'border-[#ff6e85]/40';
  return 'border-transparent';
}

function waterfallSegments(latencyMs: number) {
  const total = Math.max(latencyMs, 1);
  const phases = [
    { key: 'DNS_LOOKUP', percent: 10 },
    { key: 'TCP_HANDSHAKE', percent: 15 },
    { key: 'TLS_NEGOTIATION', percent: 20 },
    { key: 'REQUEST_SENT', percent: 5 },
    { key: 'WAITING_TTFB', percent: 40 },
    { key: 'CONTENT_DOWNLOAD', percent: 10 },
  ];

  let offset = 0;
  return phases.map((phase) => {
    const duration = Number(((total * phase.percent) / 100).toFixed(3));
    const segment = {
      ...phase,
      duration,
      left: offset,
    };
    offset += phase.percent;
    return segment;
  });
}

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [coreLedger, setCoreLedger] = useState<CoreLedgerItem[]>([]);
  const [coreMetrics, setCoreMetrics] = useState<CoreMetrics | null>(null);
  const [coreError, setCoreError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('payload');

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');
      setCoreError('');

      try {
        const res = await fetch('/api/executions?limit=20', { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as ExecutionsResponse;
        if (!res.ok) throw new Error(json.error || 'Failed to load executions');
        if (!alive) return;

        const nextExecutions = json.executions || [];
        setExecutions(nextExecutions);
        setCoreLedger(json.core?.ledger_items || []);
        setCoreMetrics(json.core?.metrics || null);
        setSelectedId((current) => current || nextExecutions[0]?.id || null);
        if (json.core?.error) setCoreError(json.core.error);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load executions');
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, []);

  const selectedExecution = useMemo(
    () => executions.find((item) => item.id === selectedId) || executions[0] || null,
    [executions, selectedId],
  );

  const relatedLedger = useMemo(() => {
    if (!selectedExecution) return null;
    return (
      coreLedger.find((item) => item.agent_id === selectedExecution.agent_id) || coreLedger[0] || null
    );
  }, [coreLedger, selectedExecution]);

  const payloadJson = useMemo(() => {
    return {
      trace_id: selectedExecution?.id || null,
      environment: 'PRODUCTION',
      request: {
        agent_id: selectedExecution?.agent_id || null,
        policy_version: selectedExecution?.policy_version || null,
        decision: selectedExecution?.decision || null,
        reason: selectedExecution?.reason || null,
        created_at: selectedExecution?.created_at || null,
      },
      response: {
        latency_ms: selectedExecution?.latency_ms || 0,
        core_metrics: coreMetrics,
      },
      ledger_preview: relatedLedger,
    };
  }, [selectedExecution, coreMetrics, relatedLedger]);

  const headersJson = useMemo(() => {
    return {
      'x-dsg-trace-id': selectedExecution?.id || null,
      'x-dsg-agent-id': selectedExecution?.agent_id || null,
      'x-dsg-policy-version': selectedExecution?.policy_version || null,
      'x-dsg-decision': selectedExecution?.decision || null,
      'x-dsg-executed-at': selectedExecution?.created_at || null,
    };
  }, [selectedExecution]);

  const rawStream = useMemo(() => {
    return [
      `[TRACE] id=${selectedExecution?.id || 'N/A'}`,
      `[AGENT] ${selectedExecution?.agent_id || 'N/A'}`,
      `[DECISION] ${selectedExecution?.decision || 'N/A'}`,
      `[LATENCY_MS] ${selectedExecution?.latency_ms ?? 0}`,
      `[REASON] ${selectedExecution?.reason || '-'}`,
      `[LEDGER_ACTION] ${relatedLedger?.action || '-'}`,
      `[LEDGER_DECISION] ${relatedLedger?.decision || '-'}`,
      `[EVALUATED_AT] ${relatedLedger?.evaluated_at || '-'}`,
    ].join('\n');
  }, [selectedExecution, relatedLedger]);

  const totalExecutions = coreMetrics?.total_executions ?? executions.length;

  return (
    <main className="h-screen overflow-hidden bg-[#0d0e11] text-[#f7f6f9]">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-[#0d0e11] px-6 text-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.15)]">
        <div className="flex items-center gap-4">
          <span className="font-['Chakra_Petch'] text-xl font-bold uppercase tracking-tighter">DSG ONE</span>
          <span className="border border-[#00fe66]/20 bg-[#242629] px-2 py-0.5 font-mono text-[10px] uppercase tracking-tighter text-[#00fe66]">ENV: PRODUCTION</span>
        </div>
        <nav className="hidden items-center gap-8 font-['Chakra_Petch'] text-sm uppercase tracking-widest md:flex">
          <Link className="px-2 py-1 text-slate-400 transition-colors hover:bg-[#1e2023] hover:text-[#00E5FF]" href="/dashboard">Overview</Link>
          <Link className="px-2 py-1 text-slate-400 transition-colors hover:bg-[#1e2023] hover:text-[#00E5FF]" href="/dashboard/policies">Policy Graph</Link>
          <Link className="px-2 py-1 font-bold text-[#00fe66]" href="/dashboard/executions">Execution Loops</Link>
          <Link className="px-2 py-1 text-slate-400 transition-colors hover:bg-[#1e2023] hover:text-[#00E5FF]" href="/dashboard/audit">Audit Evidence</Link>
        </nav>
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-slate-400 transition-colors hover:text-[#81ecff]" aria-label="notifications">notifications_active</button>
          <button className="material-symbols-outlined text-slate-400 transition-colors hover:text-[#81ecff]" aria-label="settings">settings</button>
          <div className="flex h-8 w-8 items-center justify-center border border-[#47484b] bg-[#242629]">
            <span className="material-symbols-outlined text-xs">person</span>
          </div>
        </div>
      </header>

      <aside className="fixed left-0 hidden h-full w-64 flex-col border-r border-[#47484b]/10 bg-[#0d0e11] pb-4 pt-20 text-[#00E5FF] md:flex">
        <div className="mb-8 px-6">
          <div className="font-['Space_Grotesk'] text-[0.6875rem] font-black uppercase tracking-[0.1em] text-[#00E5FF]">OPERATOR_01</div>
          <div className="mt-1 font-mono text-[9px] text-[#ababae]">LEVEL_4_ACCESS</div>
        </div>
        <div className="flex-1 space-y-1">
          <Link className="flex items-center gap-3 px-3 py-2 font-['Space_Grotesk'] text-[0.6875rem] uppercase tracking-[0.1em] text-slate-500 transition-all duration-200 hover:bg-[#1e2023] hover:text-[#00E5FF]" href="/dashboard">
            <span className="material-symbols-outlined text-lg">dashboard</span>
            <span>Overview</span>
          </Link>
          <Link className="flex items-center gap-3 px-3 py-2 font-['Space_Grotesk'] text-[0.6875rem] uppercase tracking-[0.1em] text-slate-500 transition-all duration-200 hover:bg-[#1e2023] hover:text-[#00E5FF]" href="/dashboard/policies">
            <span className="material-symbols-outlined text-lg">hub</span>
            <span>Policy Graph</span>
          </Link>
          <Link className="flex items-center gap-3 border-l-4 border-[#00fe66] bg-[#1e2023] px-3 py-2 font-['Space_Grotesk'] text-[0.6875rem] uppercase tracking-[0.1em] text-[#00E5FF] shadow-[inset_0_0_10px_rgba(0,229,255,0.1)]" href="/dashboard/executions">
            <span className="material-symbols-outlined text-lg">sync_alt</span>
            <span>Execution Loops</span>
          </Link>
          <Link className="flex items-center gap-3 px-3 py-2 font-['Space_Grotesk'] text-[0.6875rem] uppercase tracking-[0.1em] text-slate-500 transition-all duration-200 hover:bg-[#1e2023] hover:text-[#00E5FF]" href="/dashboard/audit">
            <span className="material-symbols-outlined text-lg">gavel</span>
            <span>Audit Evidence</span>
          </Link>
          <Link className="flex items-center gap-3 px-3 py-2 font-['Space_Grotesk'] text-[0.6875rem] uppercase tracking-[0.1em] text-slate-500 transition-all duration-200 hover:bg-[#1e2023] hover:text-[#00E5FF]" href="/dashboard/verification">
            <span className="material-symbols-outlined text-lg">verified_user</span>
            <span>Verification</span>
          </Link>
        </div>
      </aside>

      <main className="flex h-screen flex-col pt-16 md:pl-64">
        <div className="flex h-14 items-center justify-between border-b border-[#47484b]/10 bg-[#121316] px-6">
          <div className="flex items-center gap-4">
            <h1 className="font-headline text-lg font-bold uppercase tracking-tighter">Execution Loops</h1>
            <div className="h-4 w-px bg-[#47484b]/30" />
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#00fe66]">
              <span className="h-2 w-2 rounded-full bg-[#00fe66] shadow-[0_0_8px_#00fe66]" />
              REAL-TIME TRACING ACTIVE
            </div>
          </div>
          <div className="flex gap-2">
            <button className="h-8 bg-[#81ecff] px-4 text-[10px] font-bold uppercase tracking-widest text-[#005762]">Export Trace</button>
            <button className="h-8 border border-[#81ecff]/40 px-4 text-[10px] font-bold uppercase tracking-widest text-[#81ecff] hover:bg-[#81ecff]/10">Filter Params</button>
          </div>
        </div>

        {error ? (
          <div className="border-b border-[#ff6e85]/20 bg-[#ff6e85]/10 px-6 py-2 font-mono text-xs text-[#ffa8a3]">
            {error}
          </div>
        ) : null}

        {coreError ? (
          <div className="border-b border-[#81ecff]/20 bg-[#81ecff]/10 px-6 py-2 text-xs text-[#b8f5ff]">
            {INTERNAL_MODE_INFO}
          </div>
        ) : null}

        <div className="flex flex-1 overflow-hidden">
          <section className="w-1/3 flex-col overflow-y-auto border-r border-[#47484b]/10 bg-[#0d0e11]">
            <div className="flex items-center justify-between border-b border-[#47484b]/10 bg-[#181a1d] p-3">
              <span className="font-mono text-[10px] uppercase text-[#ababae]">Buffer: {executions.length || 0} Traces</span>
              <span className="font-mono text-[10px] text-[#81ecff]">{loading ? 'SCANNING...' : 'READY'}</span>
            </div>
            <div className="divide-y divide-[#47484b]/5">
              {executions.map((execution) => {
                const selected = execution.id === selectedExecution?.id;
                return (
                  <button
                    key={execution.id}
                    type="button"
                    onClick={() => setSelectedId(execution.id)}
                    className={`w-full cursor-pointer p-4 text-left transition-colors border-l-2 ${selected ? `bg-[#1e2023] ${decisionBorder(execution.decision)}` : 'border-transparent hover:bg-[#1e2023]'}`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span className={`font-mono text-xs ${selected ? 'text-[#81ecff]' : 'text-[#ababae]'}`}>#{execution.id.slice(0, 10)}</span>
                      <span className={`font-mono text-[9px] ${decisionTone(execution.decision)}`}>{execution.decision}</span>
                    </div>
                    <div className="mb-3 text-[11px] uppercase text-slate-200">{execution.reason || `Agent ${execution.agent_id}`}</div>
                    <div className="flex items-center justify-between font-mono text-[9px] text-[#ababae]">
                      <span>LATENCY: {execution.latency_ms}ms</span>
                      <span>{formatTime(execution.created_at)}</span>
                    </div>
                  </button>
                );
              })}
              {!loading && executions.length === 0 && (
                <div className="p-5">
                  <div className="rounded-2xl border border-[#47484b]/30 bg-[#121316] p-5">
                    <p className="text-base font-semibold text-[#f7f6f9]">{EMPTY_STATE_TITLE}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{EMPTY_STATE_BODY}</p>

                    <div className="mt-4 flex gap-2">
                      <Link
                        href="/quickstart"
                        className="rounded-xl bg-[#81ecff] px-4 py-3 text-sm font-semibold text-black"
                      >
                        Run first execution
                      </Link>
                      <Link
                        href="/quickstart"
                        className="rounded-xl border border-[#81ecff]/40 px-4 py-3 text-sm font-semibold text-[#81ecff] hover:bg-[#81ecff]/10"
                      >
                        Open quickstart
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="flex flex-1 flex-col overflow-hidden bg-[#000000]">
            <div className="border-b border-[#47484b]/10 p-6">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <div className="mb-1 font-mono text-[10px] text-[#81ecff]">LATENCY_WATERFALL_MAP</div>
                  <h2 className="font-headline text-2xl font-bold uppercase tracking-tighter">Trace: {selectedExecution?.id || 'N/A'}</h2>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] text-[#ababae]">TOTAL_EXEC_TIME</div>
                  <div className="font-mono text-xl text-[#00fe66]">{selectedExecution?.latency_ms ?? 0}ms</div>
                </div>
              </div>

              <div className="space-y-4 font-mono">
                {waterfallSegments(selectedExecution?.latency_ms ?? 0).map((segment) => (
                  <div key={segment.key} className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-3 text-[10px] text-[#ababae]">{segment.key}</div>
                    <div className="relative col-span-9 h-2 bg-[#181a1d]">
                      <div className="absolute top-0 h-full bg-[#81ecff] shadow-[0_0_12px_rgba(129,236,255,0.2)]" style={{ left: `${segment.left}%`, width: `${segment.percent}%` }} />
                      <span className="absolute text-[9px] text-[#ababae]" style={{ left: `${Math.min(segment.left + segment.percent + 0.5, 95)}%` }}>{segment.duration}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-[#47484b]/10 bg-[#121316] px-6 py-3">
                <div className="flex gap-4">
                  <button type="button" onClick={() => setActiveTab('payload')} className={`pb-1 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'payload' ? 'border-b-2 border-[#81ecff] text-[#81ecff]' : 'text-[#ababae]'}`}>Payload JSON</button>
                  <button type="button" onClick={() => setActiveTab('headers')} className={`pb-1 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'headers' ? 'border-b-2 border-[#81ecff] text-[#81ecff]' : 'text-[#ababae]'}`}>Headers</button>
                  <button type="button" onClick={() => setActiveTab('raw')} className={`pb-1 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'raw' ? 'border-b-2 border-[#81ecff] text-[#81ecff]' : 'text-[#ababae]'}`}>Raw Stream</button>
                </div>
                <button className="material-symbols-outlined text-sm text-[#ababae] hover:text-[#f7f6f9]">content_copy</button>
              </div>

              <div className="flex-1 overflow-auto p-6 font-mono text-[12px] leading-relaxed text-[#81ecff]/80">
                {activeTab === 'payload' ? <pre>{JSON.stringify(payloadJson, null, 2)}</pre> : null}
                {activeTab === 'headers' ? <pre>{JSON.stringify(headersJson, null, 2)}</pre> : null}
                {activeTab === 'raw' ? <pre>{rawStream}</pre> : null}
              </div>
            </div>
          </section>
        </div>

        <footer className="flex h-8 items-center justify-between border-t border-[#47484b]/10 bg-[#000000] px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-mono text-[9px] text-[#ababae]">
              <span className="text-[#00fe66]">SYS_OK</span>
              <span>MEM: 12.4GB/32GB</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] text-[#ababae]">
              <span className="text-[#81ecff]">NET_STABLE</span>
              <span>RTT: {selectedExecution?.latency_ms ?? 0}ms</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-tighter text-[#00fe66]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00fe66]" />
              PROD_REPLICA_STABLE
            </div>
          </div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-[#ababae]">
            Last Trace Captured: {formatDate(selectedExecution?.created_at)}
          </div>
        </footer>
      </main>
    </main>
  );
}
