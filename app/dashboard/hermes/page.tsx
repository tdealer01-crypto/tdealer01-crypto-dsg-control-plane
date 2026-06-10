'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseSseData, type AgentChatEvent } from '@/lib/agent/chat-event';

type Decision = 'ALLOW' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED';

type ToolStep = {
  id: string;
  toolId: string;
  tool?: string;
  status: 'pending' | 'running' | 'done' | 'error';
  result?: unknown;
  error?: string;
};

type Message = {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  ts: number;
  decision?: Decision;
  steps?: ToolStep[];
  model?: string;
  preflight?: { decision: string; reason?: string };
  collapsible?: boolean;
};

type SystemStatus = {
  ok: boolean;
  db?: string;
  env?: string;
  commit?: string;
  timestamp?: string;
};

type ParallelQueueStats = {
  size: number;
  avgWaitMs: number;
  p95WaitMs: number;
  p99WaitMs: number;
  priorityDistribution: {
    p1: number;
    p2: number;
    p3: number;
  };
  oldestRequestAgeMs: number;
};

type HarmonyEngineStats = {
  totalLookups: number;
  heuristicHits: number;
  embeddingHits: number;
  misses: number;
  heuristicRate: number;
  embeddingRate: number;
  hitRate: number;
  avgLatency: number;
  indexSize: {
    heuristic: number;
    embedding: number;
  };
};

type ExecutorCapacityStatus = {
  'virtual-pc': { current: number; max: number; utilization: number; peak: number };
  'browserbase': { current: number; max: number; utilization: number; peak: number };
  'terminal': { current: number; max: number; utilization: number; peak: number };
  'deploy': { current: number; max: number; utilization: number; peak: number };
};

type ParallelSystemStatus = {
  queue?: ParallelQueueStats;
  harmonyEngine?: HarmonyEngineStats;
  executorCapacity?: ExecutorCapacityStatus;
  activeEnvironments?: number;
  totalAgents?: number;
  cacheMetrics?: {
    totalEntries: number;
    avgEntriesPerEnv: number;
  };
};

type AttachedFile = {
  id: string;
  name: string;
  content: string;
  isImage: boolean;
};

type HermesRuntimeStatus = {
  ok: boolean;
  runtime: string;
  status: string;
  model?: {
    provider: string;
    name: string;
    hosting: string | null;
    configured: boolean;
  };
  philosophy: Record<string, string>;
  modules: Record<string, string>;
  workers: string[];
  dsgGate: {
    planEndpoint: string;
    actionEndpoint: string;
    evidenceEndpoint: string;
    decisionModel: Record<string, string>;
  };
  memory: {
    layers: string[];
    claimRule: string;
  };
  skillLifecycle: string[];
  adaptiveExecution: Record<string, boolean>;
};

const TOOL_LABELS: Record<string, string> = {
  readiness: 'System readiness',
  execute_action: 'Governed action',
  list_agents: 'List agents',
  create_agent: 'Create agent',
  list_policies: 'List policies',
  list_executions: 'Execution history',
  get_execution_proof: 'Execution proof',
  get_audit: 'Audit log',
  get_usage: 'Usage',
  get_metrics: 'Metrics',
  capacity: 'Capacity',
  get_agent_detail: 'Agent detail',
  update_agent: 'Update agent',
  rotate_agent_key: 'Rotate API key',
  delete_agent: 'Disable agent',
  checkpoint: 'Checkpoint',
  audit_summary: 'Audit summary',
  recovery_validate: 'Recovery validation',
  get_enterprise_proof: 'Enterprise proof',
  auto_setup: 'Auto setup',
  realtime_web_search: 'Web search',
  telegram_send: 'Send Telegram',
  browser_navigate: 'Browserbase browser',
  list_proofs: 'Proof list',
  get_ledger: 'Ledger',
  get_integration: 'Integration status',
  reconcile_effect: 'Reconcile effect',
  write_code_file: 'เขียน Code ไฟล์',
  run_code: 'รัน Code (Hermes Brain)',
  fetch_url: 'ดึงข้อมูล URL',
  get_compliance_status: 'CCVS Compliance',
  get_delivery_proof: 'Delivery Proof Scan',
};

const QUICK_COMMANDS = [
  { label: 'System status', cmd: 'Check full system status, readiness, and capacity.' },
  { label: 'Agents', cmd: 'List all agents in this organization.' },
  { label: 'Policies', cmd: 'List all active policies.' },
  { label: 'Executions', cmd: 'Show the latest 10 executions.' },
  { label: 'Audit', cmd: 'Show the latest audit log.' },
  { label: 'Usage', cmd: 'Show current usage and billing posture.' },
  { label: 'Proofs', cmd: 'List the latest proof artifacts and evidence status.' },
  { label: 'Hermes runtime', cmd: 'Describe the Hermes Full Option Runtime: workers, memory layers, adaptive execution, and DSG gate decision model.' },
  { label: 'Lock plan', cmd: 'Walk me through locking a plan with DSG. I need to specify a goal, agent ID, and allowed action types.' },
];

function decisionColor(decision?: Decision | string) {
  if (decision === 'ALLOW') return 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10';
  if (decision === 'BLOCK') return 'text-red-300 border-red-400/30 bg-red-400/10';
  if (decision === 'REVIEW') return 'text-amber-300 border-amber-400/30 bg-amber-400/10';
  return 'text-slate-400 border-slate-700 bg-slate-800/50';
}

function stepStatusIcon(status: ToolStep['status']) {
  if (status === 'running') {
    return <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />;
  }
  if (status === 'done') return <span className="text-emerald-400">OK</span>;
  if (status === 'error') return <span className="text-red-400">ERR</span>;
  return <span className="text-slate-600">WAIT</span>;
}

function formatResult(result: unknown): string {
  if (result === null || result === undefined) return '-';
  if (typeof result === 'string') return result;
  try {
    const text = JSON.stringify(result, null, 2);
    return text.length > 800 ? `${text.slice(0, 800)}\n...` : text;
  } catch {
    return String(result);
  }
}

function DecisionBadge({ decision }: { decision?: Decision | string }) {
  if (!decision) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${decisionColor(decision)}`}>
      {decision}
    </span>
  );
}

function StepTrace({ steps, msg }: { steps: ToolStep[]; msg?: Message }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
      >
        <span>{open ? 'down' : 'right'}</span>
        <span>{steps.length} tool{steps.length > 1 ? 's' : ''} tracked</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1.5" data-trace-id={msg?.id}>
          {steps.map((step, i) => (
            <div key={step.id} className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                {stepStatusIcon(step.status)}
                <span className="font-semibold text-slate-200">{TOOL_LABELS[step.toolId] ?? step.tool ?? step.toolId}</span>
                <span className="text-slate-600">{step.id}</span>
              </div>
              {step.error && <p className="mt-1 text-red-400">{step.error}</p>}
              {step.result !== undefined && step.status === 'done' && (
                <>
                  <ToolResultToolbar result={step.result} toolName={TOOL_LABELS[step.toolId] ?? step.tool ?? step.toolId} />
                  <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-slate-400 leading-5">
                    {formatResult(step.result)}
                  </pre>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CollapsibleContent({ content }: { content: string }) {
  const [collapsed, setCollapsed] = useState(true);
  const lines = content.split('\n');
  const preview = lines.slice(0, 3).join('\n');
  const isLong = lines.length > 4;
  return (
    <div>
      <div className="whitespace-pre-wrap text-sm leading-7 text-slate-100">
        {collapsed && isLong ? preview + '\n...' : content}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="mt-2 text-xs font-semibold text-violet-400 hover:text-violet-200"
        >
          {collapsed ? '▶ แสดงทั้งหมด' : '▲ ย่อ'}
        </button>
      )}
    </div>
  );
}

function ToolResultToolbar({ result, toolName }: { result: unknown; toolName?: string }) {
  const handleCopy = () => {
    const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(text);
  };

  const handleExport = () => {
    const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${toolName || 'result'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenFullScreen = () => {
    const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    const win = window.open('about:blank', '_blank');
    if (win) {
      win.document.write(`<pre style="font-family: monospace; white-space: pre-wrap; padding: 20px;">${escapeHtml(text)}</pre>`);
      win.document.title = `Result: ${toolName || 'Tool'}`;
    }
  };

  return (
    <div className="mb-2 flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800/40 p-2 text-xs">
      <button
        type="button"
        onClick={handleCopy}
        title="Copy to clipboard"
        className="flex items-center gap-1 rounded px-2 py-1 transition hover:bg-white/10"
      >
        📋 Copy
      </button>
      <button
        type="button"
        onClick={handleExport}
        title="Export as JSON"
        className="flex items-center gap-1 rounded px-2 py-1 transition hover:bg-white/10"
      >
        💾 Export
      </button>
      <button
        type="button"
        onClick={handleOpenFullScreen}
        title="Open in new tab"
        className="flex items-center gap-1 rounded px-2 py-1 transition hover:bg-white/10"
      >
        ↗ Full
      </button>
    </div>
  );
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function ExecutionSummaryCard({ msg }: { msg: Message }) {
  if (!msg.steps || msg.steps.length === 0) return null;

  const totalSteps = msg.steps.length;
  const completedSteps = msg.steps.filter((s) => s.status === 'done').length;
  const errorSteps = msg.steps.filter((s) => s.status === 'error').length;
  const duration = msg.steps.length > 0 ? Math.random() * 2000 : 0; // Placeholder; should compute from timestamps

  return (
    <div className="mt-2 rounded-xl border border-violet-400/20 bg-violet-500/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-violet-200">Execution Summary</span>
        {errorSteps === 0 && completedSteps === totalSteps ? (
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-bold text-emerald-300">✓ Complete</span>
        ) : errorSteps > 0 ? (
          <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-0.5 text-xs font-bold text-red-300">⚠ {errorSteps} error{errorSteps > 1 ? 's' : ''}</span>
        ) : (
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-bold text-amber-300">⏳ {completedSteps}/{totalSteps}</span>
        )}
      </div>

      <div className="space-y-2 text-xs text-slate-300">
        {msg.preflight && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Decision:</span>
            <span className="font-semibold">{msg.preflight.decision}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-slate-500">Steps:</span>
          <span className="font-semibold">
            {completedSteps}/{totalSteps} done{errorSteps > 0 ? ` (${errorSteps} error)` : ''}
          </span>
        </div>

        {msg.steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2 text-[11px]">
            <span className="w-5">{step.status === 'done' ? '✓' : step.status === 'error' ? '✕' : step.status === 'running' ? '⟳' : '○'}</span>
            <span className="flex-1 text-slate-400">{TOOL_LABELS[step.toolId] ?? step.tool ?? step.toolId}</span>
            {step.result && (
              <span className="truncate text-slate-600">
                {typeof step.result === 'string' ? step.result.slice(0, 20) : JSON.stringify(step.result).slice(0, 20)}
              </span>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          // Expand full trace
          const st = document.querySelector(`[data-trace-id="${msg.id}"]`);
          if (st) st.classList.toggle('hidden');
        }}
        className="mt-3 text-xs font-semibold text-violet-400 hover:text-violet-300"
      >
        View details →
      </button>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm border border-emerald-400/20 bg-emerald-500/20 px-4 py-3 text-sm text-slate-100">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.role === 'system') {
    return (
      <div className="flex justify-center">
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-500">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/20 text-xs font-bold text-violet-300">
        H
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-xs font-semibold text-violet-300">Hermes Agent</span>
          {msg.model && <span className="text-xs text-slate-600">- {msg.model}</span>}
          {msg.preflight && <DecisionBadge decision={msg.preflight.decision} />}
          {msg.decision && !msg.preflight && <DecisionBadge decision={msg.decision} />}
        </div>
        <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-slate-800/60 px-4 py-3">
          {msg.content
            ? msg.collapsible
              ? <CollapsibleContent content={msg.content} />
              : <p className="whitespace-pre-wrap text-sm leading-7 text-slate-100">{msg.content}</p>
            : <span className="italic text-slate-600 text-sm">Thinking...</span>}
        </div>
        {msg.steps && msg.steps.length > 0 && <ExecutionSummaryCard msg={msg} />}
        {msg.steps && <StepTrace steps={msg.steps} msg={msg} />}
        <p className="mt-1 text-xs text-slate-700">
          {new Date(msg.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function StatusPanel({ status }: { status: SystemStatus | null }) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-slate-900/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">System</p>
      {status === null ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-600" />
          Checking status...
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Status</span>
            <span className={`font-semibold ${status.ok ? 'text-emerald-300' : 'text-red-300'}`}>
              {status.ok ? 'Online' : 'Degraded'}
            </span>
          </div>
          {status.db && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">DB</span>
              <span className={status.db === 'ok' ? 'text-emerald-300' : 'text-amber-300'}>{status.db}</span>
            </div>
          )}
          {status.env && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Env</span>
              <span className="text-slate-300">{status.env}</span>
            </div>
          )}
          {status.commit && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Commit</span>
              <span className="font-mono text-slate-400">{status.commit.slice(0, 7)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CapabilityList() {
  const groups = [
    { label: 'Read', tools: ['readiness', 'list_agents', 'list_policies', 'list_executions', 'get_audit', 'get_usage', 'capacity', 'get_metrics'] },
    { label: 'Agent management', tools: ['create_agent', 'get_agent_detail', 'update_agent', 'rotate_agent_key', 'delete_agent'] },
    { label: 'Execution and gate', tools: ['execute_action', 'checkpoint', 'recovery_validate'] },
    { label: 'Evidence', tools: ['get_execution_proof', 'list_proofs', 'get_enterprise_proof', 'get_ledger', 'audit_summary'] },
    { label: 'Code', tools: ['write_code_file', 'run_code'] },
    { label: 'Web / Browser', tools: ['fetch_url', 'browser_navigate', 'realtime_web_search'] },
    { label: 'Compliance', tools: ['get_compliance_status', 'get_delivery_proof'] },
    { label: 'Other', tools: ['auto_setup', 'telegram_send'] },
  ];

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-slate-900/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Capabilities</p>
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 text-xs text-slate-600">{group.label}</p>
          <div className="flex flex-wrap gap-1">
            {group.tools.map((tool) => (
              <span key={tool} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-slate-400">
                {TOOL_LABELS[tool] ?? tool}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type CredentialInfo = {
  ok: boolean;
  authority: string;
  leases: { secretName: string; fingerprint: string; expiresAt: number; ttlMs: number }[];
  unavailable: string[];
  error?: string | null;
  note?: string;
};

// Credentials (Nango) — redacted via credential-broker; raw values never shown.
function CredentialsPanel() {
  const [cred, setCred] = useState<CredentialInfo | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/dsg/hermes/credentials');
        if (res.status === 401 || res.status === 403) { if (active) setDenied(true); return; }
        if (!res.ok) return;
        const data = await res.json();
        if (active) { setCred(data as CredentialInfo); setDenied(false); }
      } catch { /* non-fatal */ }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Credentials ({cred?.authority ?? 'Nango'})
        </p>
        {cred && (
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            {cred.leases.length} lease{cred.leases.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      {denied ? (
        <p className="text-xs text-slate-500">Sign in with operator access to view credential leases.</p>
      ) : !cred ? (
        <p className="text-xs text-slate-600">Loading credential authority…</p>
      ) : (
        <div className="space-y-1.5">
          {cred.leases.map((l) => (
            <div key={l.secretName} className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">{l.secretName}</span>
              <span className="font-mono text-[10px] text-slate-500">fp:{l.fingerprint}…</span>
            </div>
          ))}
          {cred.leases.length === 0 && <p className="text-xs text-slate-600">No active leases.</p>}
          {cred.unavailable.length > 0 && (
            <p className="mt-2 text-[10px] text-slate-600">unavailable: {cred.unavailable.join(', ')}</p>
          )}
          {cred.error && <p className="mt-1 text-[10px] text-amber-400/80">authority note: {cred.error}</p>}
          <p className="mt-2 text-[10px] italic text-slate-600">Redacted via credential-broker → Nango. Raw secret values are never shown.</p>
        </div>
      )}
    </div>
  );
}

function ParallelControlPlanePanel({ data }: { data: ParallelSystemStatus | null }) {
  if (!data) {
    return (
      <div className="space-y-3 rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Phase 2: Parallel Control Plane</p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-600" />
          Loading parallel metrics...
        </div>
      </div>
    );
  }

  const getHealthColor = (value: number, max: number) => {
    const utilization = (value / max) * 100;
    if (utilization > 90) return 'text-red-300 border-red-400/30 bg-red-400/10';
    if (utilization > 70) return 'text-amber-300 border-amber-400/30 bg-amber-400/10';
    return 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10';
  };

  const getQueueHealth = () => {
    if (!data.queue) return { status: 'unknown', color: 'text-slate-400', bgColor: 'border-slate-700 bg-slate-800/50' };
    const utilization = (data.queue.size / 10000) * 100;
    if (utilization > 80) return { status: 'CRITICAL', color: 'text-red-300', bgColor: 'border-red-400/30 bg-red-400/10', icon: '🔴' };
    if (utilization > 50) return { status: 'CAUTION', color: 'text-amber-300', bgColor: 'border-amber-400/30 bg-amber-400/10', icon: '🟡' };
    return { status: 'GOOD', color: 'text-emerald-300', bgColor: 'border-emerald-400/30 bg-emerald-400/10', icon: '🟢' };
  };

  const getCacheHealth = () => {
    if (!data.harmonyEngine) return { status: 'unknown', color: 'text-slate-400', bgColor: 'border-slate-700 bg-slate-800/50' };
    if (data.harmonyEngine.hitRate < 50) return { status: 'POOR', color: 'text-red-300', bgColor: 'border-red-400/30 bg-red-400/10', icon: '🔴' };
    if (data.harmonyEngine.hitRate < 75) return { status: 'FAIR', color: 'text-amber-300', bgColor: 'border-amber-400/30 bg-amber-400/10', icon: '🟡' };
    return { status: 'EXCELLENT', color: 'text-emerald-300', bgColor: 'border-emerald-400/30 bg-emerald-400/10', icon: '🟢' };
  };

  const queueHealth = getQueueHealth();
  const cacheHealth = getCacheHealth();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Phase 2: Parallel Control Plane</p>
        <p className="mt-1 text-xs text-cyan-300">1000+ concurrent agents • sub-second latency • semantic manifest caching</p>
      </div>

      {/* Queue Health Card */}
      {data.queue && (
        <div className={`rounded-xl border p-4 ${queueHealth.bgColor}`}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Queue Health</p>
            <span className={`text-sm font-bold ${queueHealth.color}`}>{queueHealth.icon} {queueHealth.status}</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Depth:</span>
              <span className="font-semibold text-slate-200">
                {data.queue.size}/10000 ({((data.queue.size / 10000) * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">P99 wait:</span>
              <span className="font-mono text-slate-300">
                {Math.round(data.queue.p99WaitMs)}ms <span className="text-slate-600">/&lt;1000ms</span>
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px]">
              <span className="w-6 text-slate-500">P1:</span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300">{data.queue.priorityDistribution.p1} confirm</span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-300">{data.queue.priorityDistribution.p2} audit</span>
              <span className="rounded bg-slate-500/20 px-1.5 py-0.5 text-slate-300">{data.queue.priorityDistribution.p3} auto</span>
            </div>
          </div>
        </div>
      )}

      {/* Cache Health Card */}
      {data.harmonyEngine && (
        <div className={`rounded-xl border p-4 ${cacheHealth.bgColor}`}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Harmony Cache</p>
            <span className={`text-sm font-bold ${cacheHealth.color}`}>{cacheHealth.icon} {cacheHealth.status}</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Hit rate:</span>
              <span className="font-semibold text-slate-200">
                {Math.round(data.harmonyEngine.hitRate)}% <span className="text-slate-600">/&gt;75%</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Avg latency:</span>
              <span className="font-mono text-slate-300">
                {data.harmonyEngine.avgLatency}ms <span className="text-slate-600">/&lt;100ms</span>
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[10px]">
              <span className="w-16 text-slate-500">Heuristic:</span>
              <span className="rounded bg-emerald-500/20 px-1 py-0.5 text-emerald-300">{data.harmonyEngine.heuristicRate}%</span>
              <span className="text-slate-600">({data.harmonyEngine.heuristicHits} hits)</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="w-16 text-slate-500">Embedding:</span>
              <span className="rounded bg-violet-500/20 px-1 py-0.5 text-violet-300">{data.harmonyEngine.embeddingRate}%</span>
              <span className="text-slate-600">({data.harmonyEngine.embeddingHits} hits)</span>
            </div>
          </div>
        </div>
      )}

      {/* Executor Capacity */}
      {data.executorCapacity && (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Executor Capacity</p>
          <div className="space-y-2">
            {Object.entries(data.executorCapacity).map(([executor, status]) => (
              <div key={executor} className={`rounded-lg border px-3 py-2 ${getHealthColor(status.current, status.max)}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold capitalize">{executor}</span>
                  <span className="font-mono">{status.current}/{status.max}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/20">
                  <div
                    className={`h-full transition-all ${status.utilization > 90 ? 'bg-red-400' : status.utilization > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${status.utilization}%` }}
                  />
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-600">
                  <span>{status.utilization}% util</span>
                  <span>peak: {status.peak}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulation Environments */}
      {data.activeEnvironments !== undefined && (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Simulation Environments</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Active</span>
              <span className="font-semibold text-slate-200">{data.activeEnvironments}</span>
            </div>
            {data.cacheMetrics && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Cache entries</span>
                  <span className="font-mono text-slate-300">{data.cacheMetrics.totalEntries}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Avg per env</span>
                  <span className="font-mono text-slate-300">{data.cacheMetrics.avgEntriesPerEnv}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HermesRuntimePanel({ data }: { data: HermesRuntimeStatus | null }) {
  if (!data) {
    return (
      <div className="space-y-3 rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Hermes Runtime</p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-600" />
          Loading runtime...
        </div>
      </div>
    );
  }

  const workerColors: Record<string, string> = {
    file: 'border-blue-400/30 bg-blue-400/10 text-blue-300',
    terminal: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    browser: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300',
    api: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
    db: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
    deploy: 'border-red-400/30 bg-red-400/10 text-red-300',
    skill: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    subagent: 'border-pink-400/30 bg-pink-400/10 text-pink-300',
    research: 'border-slate-400/30 bg-slate-400/10 text-slate-300',
  };

  const decisionColors: Record<string, string> = {
    PLAN_MATCHED_ALLOW_AUDIT: 'text-emerald-300',
    PLAN_RELATED_REPLAN: 'text-amber-300',
    OUT_OF_PLAN_DENY: 'text-red-300',
    CLAIM_EVIDENCE_DENY: 'text-orange-300',
  };

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Hermes Runtime</p>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${data.status === 'ready' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
            {data.status}
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] text-slate-500">{data.runtime}</p>
        {data.model && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded bg-violet-500/20 px-1.5 py-0.5 font-semibold text-violet-200">{data.model.provider}</span>
            <span className="font-mono text-slate-300">{data.model.name}</span>
            {data.model.hosting && <span className="text-slate-500">· {data.model.hosting}</span>}
            <span className={data.model.configured ? 'text-emerald-300' : 'text-red-300'}>
              {data.model.configured ? '● configured' : '○ not configured'}
            </span>
          </div>
        )}
      </div>

      {/* workers */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Workers ({data.workers.length})</p>
        <div className="flex flex-wrap gap-1.5">
          {data.workers.map((w) => (
            <span key={w} className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${workerColors[w] ?? 'border-white/10 bg-white/5 text-slate-400'}`}>{w}</span>
          ))}
        </div>
      </div>

      {/* memory layers */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Memory ({data.memory.layers.length} layers)</p>
        <div className="space-y-1">
          {data.memory.layers.map((layer, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-slate-800 font-mono text-[10px] text-slate-500">{i + 1}</span>
              <span>{layer}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] italic text-slate-600">{data.memory.claimRule}</p>
      </div>

      {/* DSG gate decisions */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Gate decisions</p>
        <div className="space-y-1.5">
          {Object.entries(data.dsgGate.decisionModel).map(([key, desc]) => (
            <div key={key} className="text-xs">
              <span className={`font-bold ${decisionColors[key] ?? 'text-slate-300'}`}>{key}</span>
              <span className="ml-1 text-slate-600">— {desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* adaptive execution */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Adaptive execution</p>
        <div className="space-y-1">
          {Object.entries(data.adaptiveExecution).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
              <span className={val ? 'font-bold text-emerald-300' : 'text-red-300'}>{val ? 'YES' : 'NO'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* philosophy */}
      <div className="rounded-xl border border-violet-400/10 bg-violet-500/5 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Philosophy</p>
        <div className="space-y-1">
          {Object.entries(data.philosophy).map(([key, val]) => (
            <p key={key} className="text-xs text-slate-400">
              <span className="font-semibold capitalize text-violet-300">{key}:</span> {val}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

const HISTORY_KEY = 'hermes-chat-history';
const HISTORY_MAX = 120;

function loadHistory(): Message[] | null {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Message[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch { return null; }
}

export default function HermesAgentPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const results = messages.filter(
      (msg) =>
        msg.content?.toLowerCase().includes(lowerQuery) ||
        msg.steps?.some((step) => TOOL_LABELS[step.toolId]?.toLowerCase().includes(lowerQuery))
    );
    setSearchResults(results);
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'agent',
      content: `สวัสดี — ฉันคือ Hermes Agent สำหรับ DSG ONE Control Plane (Phase 2: Parallel Control Plane activated)

ฉันมี 33 tools พร้อมใช้ทันที:

📊 สถานะระบบ
  • "system status" — readiness ทั้งระบบ
  • "usage" — quota ที่ใช้ไป
  • "capacity" — quota คงเหลือ
  • "metrics" — performance วันนี้

🤖 จัดการ Agents
  • "list agents" — ดู agents ทั้งหมด
  • "create agent ชื่อ X" — สร้าง agent + ได้ API key
  • "detail agent [ID]" — ดูรายละเอียด
  • "rotate key agent [ID]" — เปลี่ยน API key
  • "disable agent [ID]" — ปิด agent

📋 Policies & Executions
  • "list policies" — ดู policies
  • "executions" — 10 executions ล่าสุด
  • "proof [execution ID]" — หลักฐาน execution

🔍 Audit & Compliance
  • "audit log" — audit events
  • "compliance status" — CCVS + mutation score
  • "enterprise proof" — attestation report

💻 Code Execution (Hermes Brain)
  • "run python: print('hello')" — รัน python inline
  • "run bash: ls -la" — รัน bash command
  • "write file script.py: [content]" — เขียนไฟล์

🌐 Web & Research
  • "fetch https://..." — ดึงข้อมูล URL
  • "search [คำค้นหา]" — ค้นหา online
  • "browse https://..." — เปิด cloud browser

🏗️ Setup & Gate
  • "auto setup" — ตั้งค่า org อัตโนมัติ
  • "execute action X for agent Y" — ผ่าน DSG gate

🎯 Skills Hub
  • กด "Skills Hub" ด้านบน หรือไปที่ /dashboard/hermes/skills
  • 89,000+ skills จาก 12 registries (Built-in, ClawHub, skills.sh, ...)
  • "install skill [name]" — ติดตั้ง skill ใหม่

💡 Tips:
  • แนบไฟล์ (📎) → ฉันอ่าน content แล้วช่วยวิเคราะห์
  • พูด (🎤) หรือเปิด LIVE mode แทนพิมพ์ได้
  • ถ้าต้องการ agent_id บอกชื่อ agent มาก็พอ ฉัน list ให้ก่อนได้
  • /llms.txt และ /llms-full.txt — machine-readable docs สำหรับ LLM`,
      ts: Date.now(),
      collapsible: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [hermesStatus, setHermesStatus] = useState<HermesRuntimeStatus | null>(null);
  const [parallelStatus, setParallelStatus] = useState<ParallelSystemStatus | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'system' | 'runtime' | 'parallel'>('system');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [cameraCaptures, setCameraCaptures] = useState<string[]>([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // Restore chat history from localStorage on first mount
  useEffect(() => {
    const saved = loadHistory();
    if (saved) setMessages(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist chat history to localStorage on every change (capped at HISTORY_MAX)
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-HISTORY_MAX)));
    } catch { /* storage full — ignore */ }
  }, [messages]);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/agent/status');
      if (!response.ok) return;
      const data = await response.json();
      setSystemStatus({
        ok: data.ok ?? data.status === 'ok',
        db: data.db ?? data.db_check,
        env: data.env ?? data.environment,
        commit: data.commit ?? data.git_sha,
        timestamp: data.timestamp,
      });
    } catch {
      setSystemStatus({ ok: false });
    }
  }, []);

  const fetchHermesStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/dsg/hermes/status');
      if (!response.ok) return;
      const data = await response.json();
      setHermesStatus(data as HermesRuntimeStatus);
    } catch {
      // non-fatal
    }
  }, []);

  const fetchParallelStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/parallel/queue/status');
      if (!response.ok) return;
      const data = await response.json();
      setParallelStatus(data as ParallelSystemStatus);
    } catch {
      // non-fatal — parallel API may not be deployed yet
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  useEffect(() => {
    fetchHermesStatus();
    const id = setInterval(fetchHermesStatus, 60_000);
    return () => clearInterval(id);
  }, [fetchHermesStatus]);

  useEffect(() => {
    fetchParallelStatus();
    const id = setInterval(fetchParallelStatus, 5_000); // Update every 5 seconds for real-time metrics
    return () => clearInterval(id);
  }, [fetchParallelStatus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        ts: Date.now(),
      };

      const agentMsgId = `agent-${Date.now()}`;
      const agentMsg: Message = {
        id: agentMsgId,
        role: 'agent',
        content: '',
        ts: Date.now(),
        steps: [],
      };

      setMessages((prev) => [...prev, userMsg, agentMsg]);
      setInput('');
      setBusy(true);

      try {
        const res = await fetch('/api/dsg/hermes/execute', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message: trimmed }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setMessages((prev) =>
            prev.map((item) =>
              item.id === agentMsgId
                ? { ...item, content: json.error || 'Request failed. Please try again.', decision: 'BLOCK' as Decision }
                : item,
            ),
          );
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const raw of events) {
            if (!raw.startsWith('data: ')) continue;
            const event = parseSseData(raw) as AgentChatEvent & {
              decision?: string;
              reason?: string;
              allowed_tools?: string[];
            };
            if (!event) continue;

            // startup_context event → show as a system message (not in agent bubble)
            if (event.type === 'startup_context' && (event as any).files?.length > 0) {
              setMessages((prev) => {
                const already = prev.some((m) => m.id === `startup-${agentMsgId}`);
                if (already) return prev;
                const sysMsg: Message = {
                  id: `startup-${agentMsgId}`,
                  role: 'system',
                  content: `📖 อ่าน ${(event as any).files.join(' + ')} แล้ว — Hermes ปฏิบัติตาม operating rules สำหรับ session นี้`,
                  ts: Date.now(),
                };
                const agentIdx = prev.findIndex((m) => m.id === agentMsgId);
                if (agentIdx === -1) return [...prev, sysMsg];
                return [...prev.slice(0, agentIdx), sysMsg, ...prev.slice(agentIdx)];
              });
              continue;
            }

            setMessages((prev) =>
              prev.map((item) => {
                if (item.id !== agentMsgId) return item;

                if (event.type === 'preflight') {
                  return {
                    ...item,
                    preflight: { decision: event.decision ?? 'ALLOW', reason: event.reason },
                  };
                }

                if (event.type === 'assistant_reply' && event.reply) {
                  return { ...item, content: event.reply, model: event.model };
                }

                if (event.type === 'plan' && Array.isArray(event.steps)) {
                  const steps: ToolStep[] = event.steps.map((step) => ({
                    id: step.id ?? '',
                    toolId: step.toolId ?? '',
                    status: 'pending',
                  }));
                  return { ...item, steps };
                }

                if (event.type === 'step_start') {
                  return {
                    ...item,
                    steps: (item.steps ?? []).map((step) =>
                      step.id === event.step ? { ...step, tool: event.tool, status: 'running' } : step,
                    ),
                  };
                }

                if (event.type === 'step_result') {
                  return {
                    ...item,
                    steps: (item.steps ?? []).map((step) =>
                      step.id === event.step ? { ...step, status: 'done', result: event.result } : step,
                    ),
                  };
                }

                if (event.type === 'step_error') {
                  return {
                    ...item,
                    steps: (item.steps ?? []).map((step) =>
                      step.id === event.step ? { ...step, status: 'error', error: event.error } : step,
                    ),
                  };
                }

                if (event.type === 'done') {
                  const hasErrors = (item.steps ?? []).some((step) => step.status === 'error');
                  return {
                    ...item,
                    content: item.content || (hasErrors ? 'Some steps failed. Inspect the trace below.' : 'Done. Inspect the trace below.'),
                  };
                }

                return item;
              }),
            );
          }
        }
      } catch (error) {
        setMessages((prev) =>
          prev.map((item) =>
            item.id === agentMsgId
              ? { ...item, content: error instanceof Error ? error.message : 'Request failed.' }
              : item,
          ),
        );
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [busy],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  // ── keep a stable ref to sendMessage so live-mode closure stays fresh ─────
  const sendMsgRef = useRef(sendMessage);
  useEffect(() => { sendMsgRef.current = sendMessage; }, [sendMessage]);

  // ── file attachment ────────────────────────────────────────────────────────
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      if (file.type.startsWith('image/')) {
        reader.onload = () => setCameraCaptures((prev) => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      } else {
        reader.onload = () =>
          setAttachedFiles((prev) => [
            ...prev,
            {
              id: `f-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              name: file.name,
              content: (reader.result as string).slice(0, 8000),
              isImage: false,
            },
          ]);
        reader.readAsText(file);
      }
    });
  }, []);

  // ── voice input (single utterance) ────────────────────────────────────────
  const toggleVoice = useCallback(() => {
    const SR = typeof window !== 'undefined' ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) : null;
    if (!SR) { alert('Speech Recognition is not supported in this browser.'); return; }
    if (voiceActive) { recognitionRef.current?.stop(); setVoiceActive(false); return; }
    const rec = new SR() as {
      lang: string; continuous: boolean; interimResults: boolean;
      onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: (() => void) | null;
      start(): void; stop(): void;
    };
    rec.lang = 'th-TH'; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e: any) => setInput(Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(''));
    rec.onend = () => setVoiceActive(false);
    rec.onerror = () => setVoiceActive(false);
    recognitionRef.current = rec;
    rec.start(); setVoiceActive(true);
  }, [voiceActive]);

  // ── live mode (continuous auto-send) ─────────────────────────────────────
  const toggleLive = useCallback(() => {
    const SR = typeof window !== 'undefined' ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) : null;
    if (!SR) { alert('Speech Recognition is not supported in this browser.'); return; }
    if (liveMode) { recognitionRef.current?.stop(); setLiveMode(false); return; }
    const rec = new SR() as {
      lang: string; continuous: boolean; interimResults: boolean;
      onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: (() => void) | null;
      start(): void; stop(): void;
    };
    rec.lang = 'th-TH'; rec.interimResults = true; rec.continuous = true;
    rec.onresult = (e: any) => {
      let final = ''; let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = (e.results as any)[i];
        if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript;
      }
      setInput(final || interim);
      if (final) setTimeout(() => { setInput(''); sendMsgRef.current(final); }, 300);
    };
    rec.onerror = () => setLiveMode(false);
    recognitionRef.current = rec;
    rec.start(); setLiveMode(true);
  }, [liveMode]);

  // ── camera ────────────────────────────────────────────────────────────────
  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
      });
    } catch { alert('Camera access denied or not available.'); }
  }, []);

  const capturePhoto = useCallback(() => {
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setCameraCaptures((prev) => [...prev, canvas.toDataURL('image/jpeg', 0.8)]);
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraOpen(false);
  }, []);

  const closeCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraOpen(false);
  }, []);

  // ── send with attachments ─────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    let text = input;
    if (attachedFiles.length > 0) {
      text = attachedFiles.map((f) => `[File: ${f.name}]\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n') + (text ? `\n\n${text}` : '');
    }
    if (cameraCaptures.length > 0) {
      text = `${text}${text ? '\n\n' : ''}[${cameraCaptures.length} image attachment(s) — describe what you see or help me with this visual context]`;
    }
    if (!text.trim()) return;
    setAttachedFiles([]);
    setCameraCaptures([]);
    sendMessage(text.trim());
  }, [input, attachedFiles, cameraCaptures, sendMessage]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* hidden inputs */}
      <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.ts,.tsx,.js,.json,.py,.yaml,.yml,.csv,.sh,.sql,.env.example" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <canvas ref={cameraCanvasRef} className="hidden" />

      {/* camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <p className="text-sm font-semibold text-white">Camera capture</p>
            <video ref={cameraVideoRef} autoPlay playsInline className="h-60 w-80 rounded-xl object-cover bg-slate-800" />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={capturePhoto}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-black shadow-lg transition hover:scale-105"
              >
                📸
              </button>
              <button
                type="button"
                onClick={closeCamera}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-300 hover:border-white/40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/20 text-xs font-bold text-violet-300">
            H
          </div>
          <div>
            <p className="text-sm font-bold text-white">Hermes Agent</p>
            <p className="text-xs text-slate-500">DSG ONE Control Plane - Governed execution</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
              setMessages([{
                id: 'welcome',
                role: 'agent',
                content: 'สวัสดี — ประวัติถูกล้างแล้ว พิมพ์คำถามได้เลย',
                ts: Date.now(),
              }]);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
            title="ล้างประวัติ"
          >
            ล้างประวัติ
          </button>
          <Link
            href="/dashboard/hermes/skills"
            className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20"
          >
            🎯 Skills Hub
          </Link>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${systemStatus?.ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : systemStatus === null ? 'border-slate-700 bg-slate-800 text-slate-500' : 'border-red-400/30 bg-red-400/10 text-red-300'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${systemStatus?.ok ? 'bg-emerald-400' : systemStatus === null ? 'animate-pulse bg-slate-600' : 'bg-red-400'}`} />
            {systemStatus === null ? 'Connecting...' : systemStatus.ok ? 'Online' : 'Degraded'}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/5 px-4 py-2">
            {QUICK_COMMANDS.map((command) => (
              <button
                key={command.label}
                type="button"
                onClick={() => sendMessage(command.cmd)}
                disabled={busy}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 transition hover:border-emerald-400/30 hover:text-emerald-200 disabled:opacity-40"
              >
                {command.label}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
            {/* Search bar */}
            <div className="sticky top-0 -mx-4 -mt-4 mb-4 space-y-2 border-b border-white/10 bg-slate-950 px-4 py-3">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2">
                <span className="text-slate-600">🔍</span>
                <input
                  type="text"
                  placeholder="Search messages, tools, decisions..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setShowSearch(true)}
                  className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="text-slate-600 hover:text-slate-300"
                  >
                    ✕
                  </button>
                )}
              </div>
              {showSearch && searchResults.length > 0 && (
                <div className="text-xs text-slate-500">
                  Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Message feed or search results */}
            {(searchQuery ? searchResults : messages).map((message) => (
              <MessageBubble key={message.id} msg={message} />
            ))}
            {busy && (
              <div className="flex gap-3">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/20 text-xs font-bold text-violet-300">H</div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-white/10 bg-slate-800/60 px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 border-t border-white/10 px-4 py-3">
            {/* attachment previews */}
            {(attachedFiles.length > 0 || cameraCaptures.length > 0) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachedFiles.map((f) => (
                  <div key={f.id} className="flex items-center gap-1.5 rounded-lg border border-blue-400/30 bg-blue-400/10 px-2 py-1 text-xs text-blue-300">
                    <span>📄</span>
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button type="button" onClick={() => setAttachedFiles((prev) => prev.filter((x) => x.id !== f.id))} className="ml-1 text-blue-500 hover:text-blue-300">✕</button>
                  </div>
                ))}
                {cameraCaptures.map((url, i) => (
                  <div key={i} className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-violet-400/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="capture" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setCameraCaptures((prev) => prev.filter((_, j) => j !== i))} className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl bg-black/60 text-[9px] text-white">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* live mode indicator */}
            {liveMode && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs text-red-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                Live voice — กำลังฟัง... พูดได้เลย (พูดหยุด = ส่งอัตโนมัติ)
                <button type="button" onClick={toggleLive} className="ml-auto text-red-400 hover:text-red-200">หยุด</button>
              </div>
            )}

            {/* main input box */}
            <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 focus-within:border-violet-400/40">
              {/* toolbar buttons */}
              <div className="mb-0.5 flex shrink-0 items-center gap-1">
                {/* attach file */}
                <button
                  type="button"
                  title="แนบไฟล์"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
                >
                  📎
                </button>
                {/* voice */}
                <button
                  type="button"
                  title={voiceActive ? 'หยุดฟัง' : 'สนทนาเสียง (ภาษาไทย)'}
                  onClick={toggleVoice}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm transition ${voiceActive ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/50' : 'text-slate-500 hover:bg-white/10 hover:text-slate-200'}`}
                >
                  🎤
                </button>
                {/* camera */}
                <button
                  type="button"
                  title="ถ่ายภาพ"
                  onClick={openCamera}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
                >
                  📷
                </button>
                {/* live */}
                <button
                  type="button"
                  title={liveMode ? 'หยุด Live' : 'เปิด Live voice (พูดต่อเนื่อง ส่งอัตโนมัติ)'}
                  onClick={toggleLive}
                  className={`flex h-7 items-center gap-1 rounded-lg px-1.5 text-xs font-bold transition ${liveMode ? 'bg-red-500/20 text-red-300 ring-1 ring-red-400/50' : 'text-slate-500 hover:bg-white/10 hover:text-slate-200'}`}
                >
                  {liveMode ? <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />LIVE</> : '🔴 LIVE'}
                </button>
              </div>

              {/* divider */}
              <div className="mb-1 h-5 w-px shrink-0 bg-white/10" />

              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={voiceActive ? 'กำลังฟังเสียง...' : liveMode ? 'Live mode — พูดได้เลย' : 'พิมพ์คำสั่งหรือถามคำถาม — Enter ส่ง, Shift+Enter ขึ้นบรรทัด'}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm leading-6 text-slate-100 placeholder-slate-600 focus:outline-none"
                style={{ maxHeight: '120px' }}
                onInput={(event) => {
                  const el = event.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                }}
                disabled={busy}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={busy || (!input.trim() && attachedFiles.length === 0 && cameraCaptures.length === 0)}
                className="shrink-0 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-40"
              >
                {busy ? '...' : 'Send'}
              </button>
            </div>
            <p className="mt-1.5 text-center text-xs text-slate-700">
              Every action is routed through ProofGate before execution.
            </p>
          </div>
        </div>

        <aside className="hidden w-72 shrink-0 flex-col border-l border-white/10 lg:flex">
          {/* tab switcher with badges */}
          <div className="flex shrink-0 border-b border-white/10">
            {(['system', 'runtime', 'parallel'] as const).map((tab) => {
              let badge: { text: string; color: string } | null = null;
              if (tab === 'parallel') {
                if (parallelStatus?.queue && (parallelStatus.queue.size / 10000) * 100 > 50) {
                  badge = { text: '!', color: 'bg-red-500 text-white' };
                } else if (parallelStatus?.harmonyEngine && parallelStatus.harmonyEngine.hitRate < 50) {
                  badge = { text: '⚠', color: 'bg-amber-500 text-white' };
                }
              }

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSidebarTab(tab)}
                  className={`relative flex-1 py-2.5 text-xs font-semibold transition ${sidebarTab === tab ? 'border-b-2 border-violet-400 text-violet-300' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {tab === 'system' ? 'System' : tab === 'runtime' ? 'Hermes' : '⚡ Parallel'}
                  {badge && (
                    <span className={`absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold ${badge.color}`}>
                      {badge.text}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {sidebarTab === 'system' ? (
              <>
                <StatusPanel status={systemStatus} />
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Gate decisions</p>
                  <div className="space-y-1.5">
                    {(['ALLOW', 'BLOCK', 'REVIEW'] as Decision[]).map((decision) => (
                      <div key={decision} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${decisionColor(decision)}`}>
                        <span className="font-bold">{decision}</span>
                        <span className="text-xs text-slate-500">
                          {decision === 'ALLOW' ? 'execute' : decision === 'BLOCK' ? 'stop' : 'human review'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <CapabilityList />
              </>
            ) : sidebarTab === 'runtime' ? (
              <>
                <HermesRuntimePanel data={hermesStatus} />
                <CredentialsPanel />
              </>
            ) : (
              <>
                <ParallelControlPlanePanel data={parallelStatus} />
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
