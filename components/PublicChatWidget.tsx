'use client';

import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { ChatShell, type ChatMessage, type ChatSuggestion } from '@/components/ui';

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
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'system',
      content: 'Ask DSG before logging in: connect existing systems, monitor, commands, pricing, demo — public mode does not execute actions',
    },
  ]);

  const suggestions: ChatSuggestion[] = useMemo(
    () => quickPrompts.map((label) => ({ label, prompt: label })),
    []
  );

  // Hide on protected routes
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/app-shell') || pathname?.startsWith('/approvals')) {
    return null;
  }

  async function submit(message: string) {
    const text = message.trim();
    if (!text || busy) return;

    setBusy(true);
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text }]);

    try {
      const response = await fetch('/api/public-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const json = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!response.ok) throw new Error(String(json.error || 'Public chat failed'));
      setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: String(json.reply || 'Ready to help.') }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Public chat failed',
        },
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
    <div className="fixed bottom-5 right-5 z-50 flex h-[560px] w-[min(410px,calc(100vw-24px))] flex-col overflow-hidden">
      <ChatShell
        title="DSG Command Assistant"
        description="Ask easily · See next action · No runtime execution"
        messages={messages}
        onSubmit={submit}
        isLoading={busy}
        suggestions={suggestions}
        inputPlaceholder="Ask or command, e.g. how to connect ERP..."
        accentColor="amber"
        onClose={() => setOpen(false)}
        maxHeight="calc(560px - 220px)"
      />

      {/* Command links section */}
      <div className="border-t border-amber-300/15 bg-[--dsg-surface] px-4 py-3">
        <div className="grid grid-cols-4 gap-2">
          {commandLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-xl border border-blue-300/25 bg-blue-300/10 px-2 py-2 text-center text-[11px] font-bold text-blue-100 hover:bg-blue-300/15 transition"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      {/* Info section */}
      <div className="border-t border-amber-300/15 bg-amber-300/10 px-4 py-3 text-xs leading-6 text-amber-50">
        Customers typically want to see: what systems can connect, why an action was allowed/reviewed/blocked, whether evidence can be exported, and what the next step is.
      </div>
    </div>
  );
}
