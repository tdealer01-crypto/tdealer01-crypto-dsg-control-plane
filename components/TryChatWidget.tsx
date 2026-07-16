'use client';

import { useState } from 'react';
import { ChatShell, type ChatMessage, type ChatSuggestion } from '@/components/ui';

const ENDPOINT = '/api/try/chat';

const SUGGESTIONS: ChatSuggestion[] = [
  { label: 'How do I connect my agent to DSG?', prompt: 'How do I connect my agent to DSG?' },
  { label: 'What is the DSG Gate?', prompt: 'What is the DSG Gate?' },
  { label: 'Pricing after the free trial', prompt: 'Pricing after the free trial' },
  { label: 'How does audit trail work?', prompt: 'How does audit trail work?' },
  { label: 'How to use DSG with LangChain', prompt: 'How to use DSG with LangChain' },
];

export default function TryChatWidget() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: 'DSG Expert ready — ask about the gate, audit trail, connecting your agent, or pricing 🛂',
    },
  ]);

  async function submit(message: string) {
    if (!message.trim() || busy) return;
    setBusy(true);

    const history = messages
      .filter((m) => m.role !== 'system')
      .slice(-10)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: message }]);

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', content: message }] }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      setMessages((prev) => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: data.reply ?? data.error ?? 'Sorry, please try again.' },
      ]);
    } catch {
      setMessages((prev) => [...prev, { id: `error-${Date.now()}`, role: 'assistant', content: 'Connection failed. Please try again.' }]);
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
    <div className="fixed bottom-6 right-6 z-50 h-[540px] w-[390px]">
      <ChatShell
        title="🛂 DSG Expert"
        description="Q&A in English · 15-day free trial"
        messages={messages}
        onSubmit={submit}
        isLoading={busy}
        suggestions={SUGGESTIONS}
        inputPlaceholder="Ask about DSG..."
        accentColor="emerald"
        onClose={() => setOpen(false)}
        maxHeight="calc(540px - 180px)"
      />
    </div>
  );
}
