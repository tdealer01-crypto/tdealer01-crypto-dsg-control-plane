'use client';

import { useEffect, useRef, useState } from 'react';

type ChatLine = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type ChatResponse = {
  ok?: boolean;
  reply?: string;
  error?: string;
  meta?: {
    provider?: 'openai' | 'nvidia';
    mode?: 'llm';
  };
};

const ENDPOINT = '/api/try/chat';

const SUGGESTIONS = [
  'How do I connect my agent to DSG?',
  'What is the DSG Gate?',
  'How does the audit trail work?',
  'What does PASS, REVIEW, or BLOCK mean?',
  'How do I verify evidence?',
];

function makeLine(role: ChatLine['role'], content: string): ChatLine {
  return { id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`, role, content };
}

export default function TryChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([
    makeLine('system', 'DSG Assistant — ask how the gate, evidence, or customer flow works.'),
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines, open]);

  async function submit(message: string) {
    const trimmed = message.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setLines((prev) => [...prev, makeLine('user', trimmed)]);
    setDraft('');

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as ChatResponse;

      if (!res.ok) {
        setLines((prev) => [
          ...prev,
          makeLine('assistant', data.error ?? 'DSG Assistant is unavailable right now. Please try again later.'),
        ]);
        return;
      }

      const providerLabel = data.meta?.provider ? `\n\nProvider: ${data.meta.provider}` : '';
      setLines((prev) => [
        ...prev,
        makeLine('assistant', `${data.reply ?? 'No response returned.'}${providerLabel}`),
      ]);
    } catch {
      setLines((prev) => [
        ...prev,
        makeLine('assistant', 'DSG Assistant is unavailable right now. Please try again later.'),
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-emerald-500/40 bg-slate-900 px-4 py-3 text-sm font-bold text-emerald-300 shadow-lg shadow-emerald-500/10 transition hover:scale-105 hover:border-emerald-400 hover:bg-slate-800"
        aria-label="Ask DSG Assistant"
      >
        <span className="text-lg">🛂</span>
        <span>Ask DSG Assistant</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[540px] w-[390px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-sm font-black text-slate-100">🛂 DSG Assistant</p>
          <p className="text-[10px] text-slate-400">Live provider only · no fabricated fallback answer</p>
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
            Checking live provider...
          </div>
        )}
      </div>

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
