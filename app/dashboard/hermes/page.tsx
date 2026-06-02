'use client';

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
};

type SystemStatus = {
  ok: boolean;
  db?: string;
  env?: string;
  commit?: string;
  timestamp?: string;
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
  write_code_file: 'Write code file',
  run_code: 'Run code',
  fetch_url: 'Fetch URL',
};

const QUICK_COMMANDS = [
  { label: 'System status', cmd: 'Check full system status, readiness, and capacity.' },
  { label: 'Agents', cmd: 'List all agents in this organization.' },
  { label: 'Policies', cmd: 'List all active policies.' },
  { label: 'Executions', cmd: 'Show the latest 10 executions.' },
  { label: 'Audit', cmd: 'Show the latest audit log.' },
  { label: 'Usage', cmd: 'Show current usage and billing posture.' },
  { label: 'Proofs', cmd: 'List the latest proof artifacts and evidence status.' },
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

function StepTrace({ steps }: { steps: ToolStep[] }) {
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
        <div className="mt-2 space-y-1.5">
          {steps.map((step) => (
            <div key={step.id} className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                {stepStatusIcon(step.status)}
                <span className="font-semibold text-slate-200">{TOOL_LABELS[step.toolId] ?? step.tool ?? step.toolId}</span>
                <span className="text-slate-600">{step.id}</span>
              </div>
              {step.error && <p className="mt-1 text-red-400">{step.error}</p>}
              {step.result !== undefined && step.status === 'done' && (
                <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap text-slate-400 leading-5">
                  {formatResult(step.result)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
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
        <div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-white/10 bg-slate-800/60 px-4 py-3 text-sm leading-7 text-slate-100">
          {msg.content || <span className="italic text-slate-600">Thinking...</span>}
        </div>
        {msg.steps && <StepTrace steps={msg.steps} />}
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
    { label: 'Web', tools: ['fetch_url', 'browser_navigate', 'realtime_web_search'] },
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

export default function HermesAgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'agent',
      content:
        'Hello. I am Hermes Agent for DSG ONE. I can inspect system status, list agents and policies, review executions, read audit logs, and route actions through the governance gate before execution.',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

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
        const res = await fetch('/api/agent-chat', {
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
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
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
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${systemStatus?.ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : systemStatus === null ? 'border-slate-700 bg-slate-800 text-slate-500' : 'border-red-400/30 bg-red-400/10 text-red-300'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${systemStatus?.ok ? 'bg-emerald-400' : systemStatus === null ? 'animate-pulse bg-slate-600' : 'bg-red-400'}`} />
          {systemStatus === null ? 'Connecting...' : systemStatus.ok ? 'Online' : 'Degraded'}
        </span>
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
            {messages.map((message) => (
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
            <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 focus-within:border-violet-400/40">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or ask a question. Enter sends, Shift+Enter inserts a new line."
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm leading-6 text-slate-100 placeholder-slate-600 focus:outline-none"
                style={{ maxHeight: '120px' }}
                onInput={(event) => {
                  const element = event.currentTarget;
                  element.style.height = 'auto';
                  element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
                }}
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={busy || !input.trim()}
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

        <aside className="hidden w-72 shrink-0 flex-col space-y-4 overflow-y-auto border-l border-white/10 px-4 py-4 lg:flex">
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
        </aside>
      </div>
    </div>
  );
}
