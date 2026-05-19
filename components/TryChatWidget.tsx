'use client';

import { useEffect, useRef, useState } from 'react';

type ChatLine = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const ENDPOINT = '/api/try/chat';
const STORAGE_KEY = 'dsg_try_chat_v1';
const MAX_HISTORY = 40;

const SUGGESTIONS = [
  'How do I connect my agent to DSG?',
  'What is the DSG Gate?',
  'Pricing after the free trial',
  'How does audit trail work?',
  'How to use DSG with LangChain',
];

function makeLine(role: ChatLine['role'], content: string): ChatLine {
  return { id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`, role, content };
}

export default function TryChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([
    makeLine('system', 'DSG Expert ready — ask about the gate, audit trail, connecting your agent, or pricing 🛂'),
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChatLine[];
      if (Array.isArray(parsed) && parsed.length > 0) setLines(parsed.slice(-MAX_HISTORY));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines.slice(-MAX_HISTORY))); } catch { /* ignore */ }
  }, [lines]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines, open]);

  async function submit(message: string) {
    if (!message.trim() || busy) return;
    setBusy(true);

    const history = lines
      .filter((l) => l.role !== 'system')
      .slice(-10)
      .map((l) => ({ role: l.role as 'user' | 'assistant', content: l.content }));

    setLines((prev) => [...prev, makeLine('user', message)]);
    setDraft('');

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', content: message }] }),
      });
      const data = await res.json().catch(() => ({})) as { reply?: string; error?: string };
      setLines((prev) => [...prev, makeLine('assistant', data.reply ?? data.error ?? 'Sorry, please try again.')]);
    } catch {
      setLines((prev) => [...prev, makeLine('assistant', 'Connection failed. Please try again.')]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-emerald-500/40 bg-slate-900 px-4 py-3 text-sm font-bold text-emerald-300 shadow-lg shadow-emerald-500/10 transition hover:scale-105 hover:border-emerald-400 hover:bg-slate-800"
        aria-label="Ask DSG Expert"
      >
        <span className="text-lg">🛂</span>
        <span>Ask DSG Expert</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[540px] w-[390px] flex-col rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-sm font-black text-slate-100">🛂 DSG Expert</p>
          <p className="text-[10px] text-slate-400">Q&amp;A in English · 15-day free trial</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-slate-400 hover:text-white"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {lines.map((line) => (
          <div
            key={line.id}
            className={
              line.role === 'user'
                ? 'ml-auto max-w-[88%] rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-100'
                : line.role === 'system'
                  ? 'max-w-[92%] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400 italic'
                  : 'max-w-[92%] rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100'
            }
          >
            <pre className="whitespace-pre-wrap break-words font-sans">{line.content}</pre>
          </div>
        ))}
        {busy && (
          <div className="max-w-[92%] rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-400">
            Thinking...
          </div>
        )}
      </div>

      {/* Quick suggestions */}
      <div className="flex gap-1.5 overflow-x-auto border-t border-slate-800 px-3 py-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => submit(s)}
            disabled={busy}
            className="whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-medium text-slate-300 transition hover:border-emerald-400 hover:text-emerald-300 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
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
            placeholder="Ask about DSG..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
          />
          <button
            onClick={() => submit(draft)}
            disabled={busy || !draft.trim()}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-black disabled:bg-slate-700 disabled:text-slate-400"
          >
            {busy ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
