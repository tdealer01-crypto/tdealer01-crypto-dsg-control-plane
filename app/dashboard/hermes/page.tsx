'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { parseSseData, type AgentChatEvent } from '@/lib/agent/chat-event';
import { usePageMemory } from '../../../hooks/usePageMemory';

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

type AttachedFile = {
  id: string;
  name: string;
  content: string;
};

type HermesRuntimeStatus = {
  ok: boolean;
  runtime: string;
  status: string;
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

type HermesPageMemory = Record<string, unknown> & {
  input: string;
  messages: Message[];
  notice: string;
};

const PAGE_KEY = '/dashboard/hermes';
const HISTORY_MAX = 120;
const ATTACHMENT_MAX_CHARS = 8_000;

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

function welcomeMessage(): Message {
  return {
    id: 'welcome',
    role: 'agent',
    content: `สวัสดี — ฉันคือ Hermes Agent สำหรับ DSG ONE Control Plane

หน้านี้ใช้ server-backed page memory ผ่าน /api/ui-memory แล้ว ดังนั้น refresh หน้าแล้ว chat history จะกลับมาได้เมื่อ migration dsg_ui_memory ถูก apply แล้ว

ฟีเจอร์ที่เปิดใช้:
• chat history + input draft จำผ่าน server-backed memory
• file attachment / camera capture / voice input ใช้เป็น ephemeral session data ไม่เขียนลง DB
• ทุก action ต้องผ่าน DSG gate และหลักฐานจริงก่อน claim`,
    ts: Date.now(),
  };
}

const INITIAL_MEMORY: HermesPageMemory = {
  input: '',
  messages: [welcomeMessage()],
  notice: '',
};

function decisionColor(decision?: Decision | string) {
  if (decision === 'ALLOW') return 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10';
  if (decision === 'BLOCK') return 'text-red-300 border-red-400/30 bg-red-400/10';
  if (decision === 'REVIEW') return 'text-amber-300 border-amber-400/30 bg-amber-400/10';
  return 'text-slate-400 border-slate-700 bg-slate-800/50';
}

function stepStatusIcon(status: ToolStep['status']) {
  if (status === 'running') return <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />;
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
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${decisionColor(decision)}`}>{decision}</span>;
}

function StepTrace({ steps }: { steps: ToolStep[] }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300">
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
              {step.result !== undefined && step.status === 'done' && <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap text-slate-400 leading-5">{formatResult(step.result)}</pre>}
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
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm border border-emerald-400/20 bg-emerald-500/20 px-4 py-3 text-sm text-slate-100">{msg.content}</div>
      </div>
    );
  }

  if (msg.role === 'system') {
    return (
      <div className="flex justify-center">
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-500">{msg.content}</div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/20 text-xs font-bold text-violet-300">H</div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-xs font-semibold text-violet-300">Hermes Agent</span>
          {msg.model && <span className="text-xs text-slate-600">- {msg.model}</span>}
          {msg.preflight && <DecisionBadge decision={msg.preflight.decision} />}
          {msg.decision && !msg.preflight && <DecisionBadge decision={msg.decision} />}
        </div>
        <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-slate-800/60 px-4 py-3">
          {msg.content ? <p className="whitespace-pre-wrap text-sm leading-7 text-slate-100">{msg.content}</p> : <span className="italic text-slate-600 text-sm">Thinking...</span>}
        </div>
        {msg.steps && <StepTrace steps={msg.steps} />}
        <p className="mt-1 text-xs text-slate-700">{new Date(msg.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
      </div>
    </div>
  );
}

function StatusPanel({ status }: { status: SystemStatus | null }) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-slate-900/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">System</p>
      {status === null ? (
        <div className="flex items-center gap-2 text-xs text-slate-500"><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-600" />Checking status...</div>
      ) : (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between"><span className="text-slate-400">Status</span><span className={`font-semibold ${status.ok ? 'text-emerald-300' : 'text-red-300'}`}>{status.ok ? 'Online' : 'Degraded'}</span></div>
          {status.db && <div className="flex items-center justify-between"><span className="text-slate-400">DB</span><span className={status.db === 'ok' ? 'text-emerald-300' : 'text-amber-300'}>{status.db}</span></div>}
          {status.env && <div className="flex items-center justify-between"><span className="text-slate-400">Env</span><span className="text-slate-300">{status.env}</span></div>}
          {status.commit && <div className="flex items-center justify-between"><span className="text-slate-400">Commit</span><span className="font-mono text-slate-400">{status.commit.slice(0, 7)}</span></div>}
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
            {group.tools.map((tool) => <span key={tool} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-slate-400">{TOOL_LABELS[tool] ?? tool}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function HermesRuntimePanel({ data }: { data: HermesRuntimeStatus | null }) {
  if (!data) return <div className="space-y-3 rounded-xl border border-white/10 bg-slate-900/60 p-4"><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Hermes Runtime</p><div className="flex items-center gap-2 text-xs text-slate-500"><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-600" />Loading runtime...</div></div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-4">
        <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Hermes Runtime</p><span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${data.status === 'ready' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>{data.status}</span></div>
        <p className="mt-1 font-mono text-[10px] text-slate-500">{data.runtime}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Workers ({data.workers.length})</p>
        <div className="flex flex-wrap gap-1.5">{data.workers.map((worker) => <span key={worker} className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-slate-300">{worker}</span>)}</div>
      </div>
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Memory ({data.memory.layers.length} layers)</p>
        <div className="space-y-1">{data.memory.layers.map((layer, index) => <div key={layer} className="flex items-start gap-2 text-xs text-slate-400"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-slate-800 font-mono text-[10px] text-slate-500">{index + 1}</span><span>{layer}</span></div>)}</div>
        <p className="mt-2 text-[10px] italic text-slate-600">{data.memory.claimRule}</p>
      </div>
    </div>
  );
}

export default function HermesAgentPage() {
  const [busy, setBusy] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [hermesStatus, setHermesStatus] = useState<HermesRuntimeStatus | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [cameraCaptures, setCameraCaptures] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const sendMsgRef = useRef<(text: string) => void>(() => undefined);

  const { value: memory, setValue: setMemory, loaded: memoryLoaded, error: memoryError, reset: resetMemory } = usePageMemory<HermesPageMemory>(PAGE_KEY, INITIAL_MEMORY);
  const messages = Array.isArray(memory.messages) && memory.messages.length > 0 ? memory.messages : INITIAL_MEMORY.messages;

  const memoryBanner = useMemo(() => {
    if (memoryError) return memoryError;
    if (!memoryLoaded) return 'Loading server-backed page memory...';
    if (attachedFiles.length > 0 || cameraCaptures.length > 0) return 'Attachments and camera captures are session-only for privacy; chat/input are server-backed.';
    return '';
  }, [attachedFiles.length, cameraCaptures.length, memoryError, memoryLoaded]);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch('/api/agent/status')
        .then(async (response) => response.ok ? response.json() : null)
        .then((data) => { if (alive && data) setSystemStatus({ ok: data.ok ?? data.status === 'ok', db: data.db ?? data.db_check, env: data.env ?? data.environment, commit: data.commit ?? data.git_sha, timestamp: data.timestamp }); })
        .catch(() => { if (alive) setSystemStatus({ ok: false }); });
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    let alive = true;
    const loadRuntime = () => {
      fetch('/api/dsg/hermes/status')
        .then(async (response) => response.ok ? response.json() : null)
        .then((data) => { if (alive && data) setHermesStatus(data as HermesRuntimeStatus); })
        .catch(() => undefined);
    };
    loadRuntime();
    const id = setInterval(loadRuntime, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.stop?.();
    };
  }, []);

  function setMessages(updater: (previous: Message[]) => Message[]) {
    setMemory((previous) => ({ ...previous, messages: updater(previous.messages || []).slice(-HISTORY_MAX) }));
  }

  function updateAgentMessage(agentMsgId: string, updater: (message: Message) => Message) {
    setMessages((previous) => previous.map((message) => message.id === agentMsgId ? updater(message) : message));
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const now = Date.now();
    const userMsg: Message = { id: `user-${now}`, role: 'user', content: trimmed, ts: now };
    const agentMsgId = `agent-${now}`;
    const agentMsg: Message = { id: agentMsgId, role: 'agent', content: '', ts: now, steps: [] };

    setMessages((previous) => [...previous, userMsg, agentMsg]);
    setMemory((previous) => ({ ...previous, input: '', notice: '' }));
    setBusy(true);

    let sawDone = false;

    try {
      const res = await fetch('/api/dsg/hermes/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: trimmed, sessionId: PAGE_KEY }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        updateAgentMessage(agentMsgId, (item) => ({ ...item, content: json.error || 'Request failed. Please try again.', decision: 'BLOCK' }));
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
          const event = parseSseData(raw) as AgentChatEvent & { decision?: string; reason?: string; allowed_tools?: string[] };
          if (!event) continue;

          if (event.type === 'startup_context' && (event as any).files?.length > 0) {
            setMessages((previous) => {
              if (previous.some((message) => message.id === `startup-${agentMsgId}`)) return previous;
              const sysMsg: Message = { id: `startup-${agentMsgId}`, role: 'system', content: `📖 อ่าน ${(event as any).files.join(' + ')} แล้ว — Hermes ปฏิบัติตาม operating rules สำหรับ session นี้`, ts: Date.now() };
              const agentIndex = previous.findIndex((message) => message.id === agentMsgId);
              if (agentIndex === -1) return [...previous, sysMsg];
              return [...previous.slice(0, agentIndex), sysMsg, ...previous.slice(agentIndex)];
            });
            continue;
          }

          updateAgentMessage(agentMsgId, (item) => {
            if (event.type === 'preflight') return { ...item, preflight: { decision: event.decision ?? 'ALLOW', reason: event.reason } };
            if (event.type === 'assistant_reply' && event.reply) return { ...item, content: event.reply, model: event.model };
            if (event.type === 'plan' && Array.isArray(event.steps)) return { ...item, steps: event.steps.map((step) => ({ id: step.id ?? '', toolId: step.toolId ?? '', status: 'pending' })) };
            if (event.type === 'step_start') return { ...item, steps: (item.steps ?? []).map((step) => step.id === event.step ? { ...step, tool: event.tool, status: 'running' } : step) };
            if (event.type === 'step_result') return { ...item, steps: (item.steps ?? []).map((step) => step.id === event.step ? { ...step, status: 'done', result: event.result } : step) };
            if (event.type === 'step_error') return { ...item, steps: (item.steps ?? []).map((step) => step.id === event.step ? { ...step, status: 'error', error: event.error } : step) };
            if (event.type === 'done') {
              sawDone = true;
              const hasErrors = (item.steps ?? []).some((step) => step.status === 'error');
              return { ...item, content: item.content || (hasErrors ? 'Some steps failed. Inspect the trace below.' : 'Done. Inspect the trace below.') };
            }
            return item;
          });
        }
      }

      if (!sawDone) updateAgentMessage(agentMsgId, (item) => ({ ...item, content: item.content || '⚠️ Stream ended before final done event. Inspect runtime logs before claiming completion.' }));
    } catch (error) {
      updateAgentMessage(agentMsgId, (item) => ({ ...item, content: error instanceof Error ? error.message : 'Request failed.', decision: 'BLOCK' }));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  useEffect(() => {
    sendMsgRef.current = sendMessage;
  });

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (file.type.startsWith('image/')) {
          const dataUrl = String(reader.result || '');
          if (dataUrl) setCameraCaptures((previous) => [...previous, dataUrl]);
          return;
        }
        setAttachedFiles((previous) => [
          ...previous,
          {
            id: `f-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: file.name,
            content: String(reader.result || '').slice(0, ATTACHMENT_MAX_CHARS),
          },
        ]);
      };
      if (file.type.startsWith('image/')) reader.readAsDataURL(file);
      else reader.readAsText(file);
    });
  }

  function toggleVoice() {
    const SpeechRecognition = typeof window !== 'undefined' ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) : null;
    if (!SpeechRecognition) {
      setMemory((previous) => ({ ...previous, notice: 'Speech Recognition is not supported in this browser.' }));
      return;
    }
    if (voiceActive) {
      recognitionRef.current?.stop?.();
      setVoiceActive(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[]).map((result: any) => result[0].transcript).join('');
      setMemory((previous) => ({ ...previous, input: transcript }));
    };
    recognition.onend = () => setVoiceActive(false);
    recognition.onerror = () => setVoiceActive(false);
    recognitionRef.current = recognition;
    recognition.start();
    setVoiceActive(true);
  }

  function toggleLive() {
    const SpeechRecognition = typeof window !== 'undefined' ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) : null;
    if (!SpeechRecognition) {
      setMemory((previous) => ({ ...previous, notice: 'Speech Recognition is not supported in this browser.' }));
      return;
    }
    if (liveMode) {
      recognitionRef.current?.stop?.();
      setLiveMode(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      setMemory((previous) => ({ ...previous, input: finalText || interimText }));
      if (finalText.trim()) {
        setTimeout(() => {
          setMemory((previous) => ({ ...previous, input: '' }));
          sendMsgRef.current(finalText.trim());
        }, 300);
      }
    };
    recognition.onerror = () => setLiveMode(false);
    recognitionRef.current = recognition;
    recognition.start();
    setLiveMode(true);
  }

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
      });
    } catch {
      setMemory((previous) => ({ ...previous, notice: 'Camera access denied or not available.' }));
    }
  }

  function closeCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setCameraCaptures((previous) => [...previous, canvas.toDataURL('image/jpeg', 0.8)]);
    closeCamera();
  }

  function handleSend() {
    let text = memory.input || '';
    if (attachedFiles.length > 0) {
      text = `${attachedFiles.map((file) => `[File: ${file.name}]\n\`\`\`\n${file.content}\n\`\`\``).join('\n\n')}${text ? `\n\n${text}` : ''}`;
    }
    if (cameraCaptures.length > 0) {
      text = `${text}${text ? '\n\n' : ''}[${cameraCaptures.length} image attachment(s) captured in browser session — describe or use this visual context if the runtime supports image handling]`;
    }
    if (!text.trim()) return;
    setAttachedFiles([]);
    setCameraCaptures([]);
    sendMessage(text.trim());
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleReset() {
    resetMemory();
    setAttachedFiles([]);
    setCameraCaptures([]);
    setMemory({ ...INITIAL_MEMORY, messages: [{ ...welcomeMessage(), content: 'สวัสดี — ประวัติถูกล้างแล้ว พิมพ์คำถามได้เลย' }] });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.ts,.tsx,.js,.json,.py,.yaml,.yml,.csv,.sh,.sql,.env.example,image/*" className="hidden" onChange={(event) => handleFiles(event.target.files)} />
      <canvas ref={cameraCanvasRef} className="hidden" />

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <p className="text-sm font-semibold text-white">Camera capture</p>
            <video ref={cameraVideoRef} autoPlay playsInline className="h-60 w-80 rounded-xl object-cover bg-slate-800" />
            <div className="flex gap-3">
              <button type="button" onClick={capturePhoto} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-black shadow-lg transition hover:scale-105">📸</button>
              <button type="button" onClick={closeCamera} className="rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-300 hover:border-white/40">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/20 text-xs font-bold text-violet-300">H</div>
          <div>
            <p className="text-sm font-bold text-white">Hermes Agent</p>
            <p className="text-xs text-slate-500">DSG ONE Control Plane - server-backed memory + multimodal input</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleReset} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/10 hover:text-slate-200" title="ล้างประวัติ">ล้างประวัติ</button>
          <Link href="/dashboard/hermes/skills" className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20">🎯 Skills Hub</Link>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${systemStatus?.ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : systemStatus === null ? 'border-slate-700 bg-slate-800 text-slate-500' : 'border-red-400/30 bg-red-400/10 text-red-300'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${systemStatus?.ok ? 'bg-emerald-400' : systemStatus === null ? 'animate-pulse bg-slate-600' : 'bg-red-400'}`} />
            {systemStatus === null ? 'Connecting...' : systemStatus.ok ? 'Online' : 'Degraded'}
          </span>
        </div>
      </header>

      {memoryBanner || memory.notice ? <div className="border-b border-amber-300/20 bg-amber-300/10 px-6 py-2 text-xs text-amber-100">{memoryBanner || memory.notice}</div> : null}
      {liveMode && <div className="border-b border-red-400/20 bg-red-400/10 px-6 py-2 text-xs text-red-200">Live voice is listening. Stop live mode before sharing sensitive information nearby.</div>}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/5 px-4 py-2">
            {QUICK_COMMANDS.map((command) => <button key={command.label} type="button" onClick={() => sendMessage(command.cmd)} disabled={busy} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 transition hover:border-emerald-400/30 hover:text-emerald-200 disabled:opacity-40">{command.label}</button>)}
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
            {messages.map((message) => <MessageBubble key={message.id} msg={message} />)}
            {busy && <div className="flex gap-3"><div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/20 text-xs font-bold text-violet-300">H</div><div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-white/10 bg-slate-800/60 px-4 py-3"><span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" /></div></div>}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 border-t border-white/10 px-4 py-3">
            {(attachedFiles.length > 0 || cameraCaptures.length > 0) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachedFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-1.5 rounded-lg border border-blue-400/30 bg-blue-400/10 px-2 py-1 text-xs text-blue-300">
                    <span>📄</span>
                    <span className="max-w-[140px] truncate">{file.name}</span>
                    <button type="button" onClick={() => setAttachedFiles((previous) => previous.filter((item) => item.id !== file.id))} className="ml-1 text-blue-500 hover:text-blue-300">✕</button>
                  </div>
                ))}
                {cameraCaptures.map((url, index) => (
                  <div key={`${index}-${url.slice(0, 24)}`} className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-violet-400/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="capture" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setCameraCaptures((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl bg-black/60 text-[9px] text-white">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 focus-within:border-violet-400/40">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 transition hover:text-slate-200 disabled:opacity-40" title="Attach file">📎</button>
              <button type="button" onClick={openCamera} disabled={busy} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 transition hover:text-slate-200 disabled:opacity-40" title="Camera">📷</button>
              <button type="button" onClick={toggleVoice} disabled={busy} className={`rounded-lg border px-3 py-2 text-sm transition disabled:opacity-40 ${voiceActive ? 'border-red-400/40 bg-red-400/10 text-red-300' : 'border-white/10 text-slate-400 hover:text-slate-200'}`} title="Voice input">🎙️</button>
              <button type="button" onClick={toggleLive} disabled={busy} className={`rounded-lg border px-3 py-2 text-sm transition disabled:opacity-40 ${liveMode ? 'border-red-400/40 bg-red-400/10 text-red-300' : 'border-white/10 text-slate-400 hover:text-slate-200'}`} title="Live voice">🔴</button>
              <textarea ref={inputRef} value={memory.input} onChange={(event) => setMemory((previous) => ({ ...previous, input: event.target.value }))} onKeyDown={handleKeyDown} placeholder="พิมพ์คำสั่งหรือถามคำถาม — Enter ส่ง, Shift+Enter ขึ้นบรรทัด" rows={1} className="flex-1 resize-none bg-transparent text-sm leading-6 text-slate-100 placeholder-slate-600 focus:outline-none" style={{ maxHeight: '120px' }} disabled={busy} />
              <button type="button" onClick={handleSend} disabled={busy || (!memory.input.trim() && attachedFiles.length === 0 && cameraCaptures.length === 0)} className="shrink-0 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-40">{busy ? '...' : 'Send'}</button>
            </div>
            <p className="mt-1.5 text-center text-xs text-slate-700">Every action is routed through ProofGate before execution. Chat history/input persist server-side; files, camera, and live voice stay session-only.</p>
          </div>
        </div>

        <aside className="hidden w-80 shrink-0 space-y-4 overflow-y-auto border-l border-white/10 p-4 xl:block">
          <StatusPanel status={systemStatus} />
          <HermesRuntimePanel data={hermesStatus} />
          <CapabilityList />
        </aside>
      </div>
    </div>
  );
}
