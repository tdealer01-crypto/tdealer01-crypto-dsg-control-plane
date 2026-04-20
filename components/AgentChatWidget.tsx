'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { parseSseData, formatAgentEventMessage } from '../lib/agent/chat-event';

type ChatLine = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const STORAGE_KEY = 'dsg_chat_history';
const MAX_HISTORY = 100;

const PAGE_SUGGESTIONS: Record<string, { label: string; prompt: string }[]> = {
  '/dashboard': [{ label: 'Check readiness', prompt: 'check readiness' }],
  '/dashboard/agents': [
    { label: 'Create agent', prompt: 'create agent' },
    { label: 'List agents', prompt: 'list agents' },
  ],
  '/dashboard/policies': [{ label: 'List policies', prompt: 'list policies' }],
  '/dashboard/executions': [{ label: 'Check audit', prompt: 'audit lineage' }],
  '/dashboard/billing': [{ label: 'Check capacity', prompt: 'check capacity' }],
  '/dashboard/capacity': [{ label: 'Check quota', prompt: 'check capacity' }],
  '/dashboard/skills': [{ label: 'Run auto-setup', prompt: 'run auto_setup' }],
  '/dashboard/operations': [{ label: 'Audit lineage', prompt: 'audit lineage' }],
};

function makeLine(role: ChatLine['role'], content: string): ChatLine {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
  };
}

export default function AgentChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([
    makeLine('system', 'DSG Agent พร้อมช่วย — พิมพ์คำสั่งหรือกดปุ่มลัดตามหน้าที่ใช้งาน'),
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChatLine[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setLines(parsed.slice(-MAX_HISTORY));
      }
    } catch {
      // ignore storage read failures
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines.slice(-MAX_HISTORY)));
    } catch {
      // ignore storage write failures
    }
  }, [lines]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines]);

  const suggestions = useMemo(() => {
    return PAGE_SUGGESTIONS[pathname] || PAGE_SUGGESTIONS['/dashboard'] || [];
  }, [pathname]);

  async function submit(message: string) {
    if (!message.trim() || busy) return;
    setBusy(true);
    setLines((prev) => [...prev, makeLine('user', message)]);
    setDraft('');

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, pageContext: pathname }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Agent chat failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream body returned');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const raw of events) {
          if (!raw.startsWith('data: ')) continue;
          const event = parseSseData(raw);
          if (!event) continue;
          const message = formatAgentEventMessage(event);
          if (!message) continue;
          setLines((prev) => [...prev, makeLine('assistant', message)]);
        }
      }
    } catch (err) {
      setLines((prev) => [...prev, makeLine('assistant', err instanceof Error ? err.message : 'Agent chat failed')]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 transition hover:scale-105"
        aria-label="Open agent chat"
      >
        <svg className="mx-auto h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[380px] flex-col rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">DSG Agent</p>
          <p className="text-[10px] text-slate-400">{pathname}</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white" aria-label="Close agent chat">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {lines.map((line) => (
          <div
            key={line.id}
            className={
              line.role === 'user'
                ? 'ml-auto max-w-[85%] rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-3 py-2 text-xs text-emerald-100'
                : line.role === 'system'
                  ? 'max-w-[90%] rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200'
                  : 'max-w-[90%] rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200'
            }
          >
            <pre className="whitespace-pre-wrap break-all font-mono">{line.content}</pre>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-t border-slate-800 px-4 py-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.prompt}
            onClick={() => submit(suggestion.prompt)}
            disabled={busy}
            className="whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-medium text-slate-300 hover:border-emerald-400 disabled:opacity-50"
          >
            {suggestion.label}
          </button>
        ))}
      </div>

      <div className="border-t border-slate-800 p-3">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit(draft);
              }
            }}
            placeholder="พิมพ์คำสั่ง..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
          />
          <button
            onClick={() => submit(draft)}
            disabled={busy}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black disabled:bg-slate-700 disabled:text-slate-400"
          >
            {busy ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
