'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseSseData, type AgentChatEvent } from '@/lib/agent/chat-event';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  readiness: 'ตรวจสถานะระบบ',
  execute_action: 'รัน Action ผ่าน Gate',
  list_agents: 'ดูรายการ Agent',
  create_agent: 'สร้าง Agent',
  list_policies: 'ดู Policy',
  list_executions: 'ดู Execution History',
  get_execution_proof: 'ดู Execution Proof',
  get_audit: 'ดู Audit Log',
  get_usage: 'ดู Usage',
  get_metrics: 'ดู Metrics',
  capacity: 'ดู Capacity',
  get_agent_detail: 'ดูรายละเอียด Agent',
  update_agent: 'แก้ไข Agent',
  rotate_agent_key: 'หมุน API Key',
  delete_agent: 'ลบ Agent',
  checkpoint: 'บันทึก Checkpoint',
  audit_summary: 'สรุป Audit',
  recovery_validate: 'ตรวจสอบ Recovery',
  get_enterprise_proof: 'ดู Enterprise Proof',
  auto_setup: 'Auto Setup',
  realtime_web_search: 'ค้นหาเว็บ',
  telegram_send: 'ส่ง Telegram',
  browser_navigate: 'เปิด Browser (Browserbase)',
  list_proofs: 'ดู Proof ทั้งหมด',
  get_ledger: 'ดู Ledger',
  get_integration: 'ดู Integration',
  reconcile_effect: 'Reconcile Effect',
  write_code_file: 'เขียน Code ไฟล์',
  run_code: 'รัน Code (Hermes Brain)',
  fetch_url: 'ดึงข้อมูล URL',
  get_compliance_status: 'CCVS Compliance Status',
  get_delivery_proof: 'Delivery Proof Scan',
};

const QUICK_COMMANDS = [
  { label: 'ดูสถานะระบบ', cmd: 'ตรวจสอบสถานะระบบทั้งหมดและ capacity' },
  { label: 'ดู Agent', cmd: 'แสดงรายการ agent ทั้งหมดที่มีอยู่' },
  { label: 'ดู Policy', cmd: 'แสดง policy ทั้งหมดที่ใช้งานอยู่' },
  { label: 'ดู Execution', cmd: 'แสดง execution ล่าสุด 10 รายการ' },
  { label: 'ดู Audit', cmd: 'แสดง audit log ล่าสุด' },
  { label: 'ดู Usage', cmd: 'แสดงสถิติการใช้งานและ billing' },
  { label: 'เขียน Python', cmd: 'เขียน python script คำนวณ fibonacci(20) แล้วรันให้ดูผลลัพธ์' },
  { label: 'รัน Node.js', cmd: 'เขียน node.js script แสดงวันที่และเวลาปัจจุบัน แล้วรัน' },
  { label: 'ดึง URL', cmd: 'ดึงข้อมูลจาก https://httpbin.org/json แล้วแสดงผล' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decisionColor(d?: Decision | string) {
  if (d === 'ALLOW') return 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10';
  if (d === 'BLOCK') return 'text-red-300 border-red-400/30 bg-red-400/10';
  if (d === 'REVIEW') return 'text-amber-300 border-amber-400/30 bg-amber-400/10';
  return 'text-slate-400 border-slate-700 bg-slate-800/50';
}

function stepStatusIcon(s: ToolStep['status']) {
  if (s === 'running') return <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />;
  if (s === 'done') return <span className="text-emerald-400">✓</span>;
  if (s === 'error') return <span className="text-red-400">✗</span>;
  return <span className="text-slate-600">·</span>;
}

function formatResult(result: unknown): string {
  if (result === null || result === undefined) return '—';
  if (typeof result === 'string') return result;
  try {
    const str = JSON.stringify(result, null, 2);
    return str.length > 600 ? str.slice(0, 600) + '\n…' : str;
  } catch {
    return String(result);
  }
}

// ─── Components ───────────────────────────────────────────────────────────────

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
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition"
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>{steps.length} tool{steps.length > 1 ? 's' : ''} executed</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {steps.map((s) => (
            <div key={s.id} className="rounded-lg border border-white/8 bg-slate-900/60 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                {stepStatusIcon(s.status)}
                <span className="font-semibold text-slate-200">{TOOL_LABELS[s.toolId] ?? s.tool ?? s.toolId}</span>
                <span className="text-slate-600">({s.id})</span>
              </div>
              {s.error && <p className="mt-1 text-red-400">{s.error}</p>}
              {s.result !== undefined && s.status === 'done' && (
                <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-slate-400 leading-5">
                  {formatResult(s.result)}
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
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-emerald-500/20 border border-emerald-400/20 px-4 py-3 text-sm text-slate-100">
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

  // agent
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex-shrink-0 h-7 w-7 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-xs text-violet-300 font-bold">
        H
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-violet-300">Hermes Agent</span>
          {msg.model && <span className="text-xs text-slate-600">· {msg.model}</span>}
          {msg.preflight && <DecisionBadge decision={msg.preflight.decision} />}
          {msg.decision && !msg.preflight && <DecisionBadge decision={msg.decision} />}
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-slate-800/60 border border-white/8 px-4 py-3 text-sm text-slate-100 leading-7 whitespace-pre-wrap">
          {msg.content || <span className="text-slate-600 italic">กำลังคิด…</span>}
        </div>
        {msg.steps && <StepTrace steps={msg.steps} />}
        <p className="mt-1 text-xs text-slate-700">
          {new Date(msg.ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function StatusPanel({ status }: { status: SystemStatus | null }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">System</p>
      {status === null ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-600" />
          กำลังตรวจสอบ…
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">สถานะ</span>
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
    { label: 'ดูข้อมูล', tools: ['readiness', 'list_agents', 'list_policies', 'list_executions', 'get_audit', 'get_usage', 'capacity', 'get_metrics'] },
    { label: 'จัดการ Agent', tools: ['create_agent', 'get_agent_detail', 'update_agent', 'rotate_agent_key', 'delete_agent'] },
    { label: 'Execute & Gate', tools: ['execute_action', 'checkpoint', 'recovery_validate'] },
    { label: 'หลักฐาน', tools: ['get_execution_proof', 'list_proofs', 'get_enterprise_proof', 'get_ledger', 'audit_summary'] },
    { label: 'Code', tools: ['write_code_file', 'run_code'] },
    { label: 'Web / Browser', tools: ['fetch_url', 'browser_navigate', 'realtime_web_search'] },
    { label: 'Compliance / Proof', tools: ['get_compliance_status', 'get_delivery_proof'] },
    { label: 'อื่นๆ', tools: ['auto_setup', 'telegram_send'] },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Capabilities</p>
      {groups.map((g) => (
        <div key={g.label}>
          <p className="text-xs text-slate-600 mb-1.5">{g.label}</p>
          <div className="flex flex-wrap gap-1">
            {g.tools.map((t) => (
              <span key={t} className="rounded-md border border-white/8 bg-white/[0.03] px-2 py-0.5 text-xs text-slate-400">
                {TOOL_LABELS[t] ?? t}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HermesAgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'agent',
      content: 'สวัสดีครับ ผมคือ Hermes Agent ควบคุม DSG ONE ครับ\n\nผมสามารถช่วย:\n• ตรวจสอบสถานะระบบทั้งหมด\n• จัดการ Agent และ Policy\n• ดู Execution History และ Audit Log\n• รัน Action ผ่าน governance gate\n• ดูหลักฐาน Proof และ Ledger\n\nพิมพ์คำสั่งหรือถามเป็นภาษาไทย/อังกฤษได้เลยครับ',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch system status on mount and every 30s
  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/agent/status');
      if (!r.ok) return;
      const data = await r.json();
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

  const sendMessage = useCallback(async (text: string) => {
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
          prev.map((m) =>
            m.id === agentMsgId
              ? { ...m, content: json.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่', decision: 'BLOCK' as Decision }
              : m,
          ),
        );
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
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
            prev.map((m) => {
              if (m.id !== agentMsgId) return m;

              if (event.type === 'preflight') {
                return {
                  ...m,
                  preflight: { decision: event.decision ?? 'ALLOW', reason: event.reason },
                };
              }

              if (event.type === 'assistant_reply' && event.reply) {
                return { ...m, content: event.reply, model: event.model };
              }

              if (event.type === 'plan' && Array.isArray(event.steps)) {
                const steps: ToolStep[] = event.steps.map((s) => ({
                  id: s.id ?? '',
                  toolId: s.toolId ?? '',
                  status: 'pending',
                }));
                return { ...m, steps };
              }

              if (event.type === 'step_start') {
                return {
                  ...m,
                  steps: (m.steps ?? []).map((s) =>
                    s.id === event.step ? { ...s, tool: event.tool, status: 'running' } : s,
                  ),
                };
              }

              if (event.type === 'step_result') {
                return {
                  ...m,
                  steps: (m.steps ?? []).map((s) =>
                    s.id === event.step ? { ...s, status: 'done', result: event.result } : s,
                  ),
                };
              }

              if (event.type === 'step_error') {
                return {
                  ...m,
                  steps: (m.steps ?? []).map((s) =>
                    s.id === event.step ? { ...s, status: 'error', error: event.error } : s,
                  ),
                };
              }

              if (event.type === 'done') {
                const hasErrors = (m.steps ?? []).some((s) => s.status === 'error');
                return {
                  ...m,
                  content: m.content || (hasErrors ? 'บางส่วนมีข้อผิดพลาด ดู tool trace ด้านล่าง' : 'เสร็จสิ้นครับ ดูผลลัพธ์จาก tool trace ด้านล่าง'),
                };
              }

              return m;
            }),
          );
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsgId
            ? { ...m, content: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด' }
            : m,
        ),
      );
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [busy]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between border-b border-white/8 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-xs text-violet-300 font-bold">
            H
          </div>
          <div>
            <p className="text-sm font-bold text-white">Hermes Agent</p>
            <p className="text-xs text-slate-500">DSG ONE Control Plane · Governed Execution</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${systemStatus?.ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : systemStatus === null ? 'border-slate-700 bg-slate-800 text-slate-500' : 'border-red-400/30 bg-red-400/10 text-red-300'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${systemStatus?.ok ? 'bg-emerald-400' : systemStatus === null ? 'bg-slate-600 animate-pulse' : 'bg-red-400'}`} />
            {systemStatus === null ? 'Connecting…' : systemStatus.ok ? 'Online' : 'Degraded'}
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Quick commands */}
          <div className="flex-shrink-0 flex gap-2 overflow-x-auto px-4 py-2 border-b border-white/5">
            {QUICK_COMMANDS.map((q) => (
              <button
                key={q.label}
                onClick={() => sendMessage(q.cmd)}
                disabled={busy}
                className="flex-shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 hover:border-emerald-400/30 hover:text-emerald-200 transition disabled:opacity-40"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {busy && (
              <div className="flex gap-3">
                <div className="mt-1 flex-shrink-0 h-7 w-7 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-xs text-violet-300 font-bold">H</div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-slate-800/60 border border-white/8 px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-white/8 px-4 py-3">
            <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 focus-within:border-violet-400/40">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="พิมพ์คำสั่ง หรือถามเป็นภาษาไทย/อังกฤษ… (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder-slate-600 focus:outline-none leading-6"
                style={{ maxHeight: '120px' }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                }}
                disabled={busy}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={busy || !input.trim()}
                className="flex-shrink-0 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-40"
              >
                {busy ? '…' : 'ส่ง'}
              </button>
            </div>
            <p className="mt-1.5 text-center text-xs text-slate-700">
              ทุก action ผ่าน ProofGate — BLOCK จะหยุดก่อน execute เสมอ
            </p>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="hidden lg:flex flex-col w-72 flex-shrink-0 border-l border-white/8 overflow-y-auto px-4 py-4 space-y-4">
          <StatusPanel status={systemStatus} />
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Gate Decisions</p>
            <div className="space-y-1.5">
              {(['ALLOW', 'BLOCK', 'REVIEW'] as Decision[]).map((d) => (
                <div key={d} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${decisionColor(d)}`}>
                  <span className="font-bold">{d}</span>
                  <span className="text-slate-500 text-xs">
                    {d === 'ALLOW' ? 'ผ่าน → execute' : d === 'BLOCK' ? 'หยุด → ไม่รัน' : 'รอ human อนุมัติ'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <CapabilityList />
        </div>
      </div>
    </div>
  );
}
