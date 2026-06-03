'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

type ChatLine = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

function makeLine(role: ChatLine['role'], content: string): ChatLine {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
  };
}

const quickPrompts = ['Get started', 'Connect existing system', 'View monitor', 'export evidence', 'Pricing', 'Request demo'];

const commandLinks = [
  { href: '/proofgate', label: 'ProofGate' },
  { href: '/enterprise-ready', label: 'Setup flow' },
  { href: '/dashboard/integrations', label: 'Connect' },
  { href: '/gateway/monitor', label: 'Monitor' },
];

export default function PublicChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>(() => [
    makeLine('system', 'Ask DSG before logging in: connect existing systems, monitor, commands, pricing, demo — public mode does not execute actions'),
  ]);

  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/app-shell') || pathname?.startsWith('/approvals')) {
    return null;
  }

  async function submit(message: string) {
    const text = message.trim();
    if (!text || busy) return;

    setBusy(true);
    setDraft('');
    setLines((prev) => [...prev, makeLine('user', text)]);

    try {
      const response = await fetch('/api/public-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || 'Public chat failed'));
      setLines((prev) => [...prev, makeLine('assistant', String(json.reply || 'Ready to help.'))]);
    } catch (error) {
      setLines((prev) => [
        ...prev,
        makeLine('assistant', error instanceof Error ? error.message : 'Public chat failed'),
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 rounded-full border border-amber-300/50 bg-amber-300 px-5 py-4 text-sm font-extrabold text-black shadow-2xl shadow-amber-500/30 ring-2 ring-black/50 transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-amber-200"
        aria-label="Open public DSG command chat"
      >
        Ask / Command DSG
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[560px] w-[min(410px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-amber-300/25 bg-[#06080f] shadow-2xl shadow-black/70">
      <div className="flex items-center justify-between border-b border-amber-300/15 px-4 py-3">
        <div>
          <p className="text-sm font-black text-slate-100">DSG Command Assistant</p>
          <p className="text-[11px] text-slate-400">Ask easily · See next action · No runtime execution</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white" aria-label="Close public chat">✕</button>
      </div>

      <div className="grid grid-cols-4 gap-2 border-b border-amber-300/15 px-4 py-3">
        {commandLinks.map((item) => (
          <a key={item.href} href={item.href} className="rounded-xl border border-blue-300/25 bg-blue-300/10 px-2 py-2 text-center text-[11px] font-bold text-blue-100 hover:bg-blue-300/15">
            {item.label}
          </a>
        ))}
      </div>

      <div className="border-b border-amber-300/15 bg-amber-300/10 px-4 py-3 text-xs leading-6 text-amber-50">
        Customers typically want to see: what systems can connect, why an action was allowed/reviewed/blocked, whether evidence can be exported, and what the next step is.
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {lines.map((line) => (
          <div
            key={line.id}
            className={
              line.role === 'user'
                ? 'ml-auto max-w-[85%] rounded-xl border border-amber-300/30 bg-amber-300/20 px-3 py-2 text-xs text-amber-50'
                : line.role === 'system'
                  ? 'max-w-[92%] rounded-xl border border-blue-300/25 bg-blue-300/10 px-3 py-2 text-xs text-blue-100'
                  : 'max-w-[92%] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200'
            }
          >
            {line.content}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-amber-300/15 px-4 py-2">
        {quickPrompts.map((item) => (
          <button
            key={item}
            onClick={() => submit(item)}
            disabled={busy}
            className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-bold text-slate-200 hover:border-amber-300/50 hover:text-amber-100 disabled:opacity-50"
          >
            {item}
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(draft);
        }}
        className="flex gap-2 border-t border-amber-300/15 p-3"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask what to do next..."
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/60"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-black disabled:opacity-50"
        >
          {busy ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
