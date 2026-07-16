'use client';

import React, { useRef, useEffect } from 'react';

export interface ChatShellProps {
  title: string;
  accentColor?: 'emerald' | 'amber' | 'blue' | 'cyan';
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content?: string;
    events?: unknown[];
    isTyping?: boolean;
  }>;
  children?: React.ReactNode;
  messageRenderer?: (msg: any) => React.ReactNode;
  onSubmit: (message: string) => void | Promise<void>;
  busy?: boolean;
  suggestions?: Array<{ label: string; prompt: string }>;
  placeholder?: string;
  subtitle?: string;
  actionButtons?: React.ReactNode;
}

export function ChatShell({
  title,
  accentColor = 'emerald',
  messages,
  children,
  messageRenderer,
  onSubmit,
  busy = false,
  suggestions = [],
  placeholder = 'พิมพ์ข้อความ...',
  subtitle = 'พร้อมช่วยเหลือ',
  actionButtons,
}: ChatShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = React.useState('');

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const accentMap = {
    emerald: {
      gradient: 'from-emerald-400 to-cyan-500',
      button: 'border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-200',
      badge: 'bg-emerald-500/20 text-emerald-100',
      header: 'bg-[#12141c] border-white/10',
    },
    amber: {
      gradient: 'from-amber-400 to-orange-500',
      button: 'border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 text-amber-200',
      badge: 'bg-amber-500/20 text-amber-100',
      header: 'bg-[#12141c] border-white/10',
    },
    blue: {
      gradient: 'from-blue-400 to-cyan-500',
      button: 'border-blue-400/30 bg-blue-400/10 hover:bg-blue-400/20 text-blue-200',
      badge: 'bg-blue-500/20 text-blue-100',
      header: 'bg-[#12141c] border-white/10',
    },
    cyan: {
      gradient: 'from-cyan-400 to-blue-500',
      button: 'border-cyan-400/30 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-200',
      badge: 'bg-cyan-500/20 text-cyan-100',
      header: 'bg-[#12141c] border-white/10',
    },
  };

  const colors = accentMap[accentColor];

  const handleSubmit = async () => {
    if (!draft.trim() || busy) return;
    const message = draft;
    setDraft('');
    await onSubmit(message);
  };

  const handleSuggestion = async (prompt: string) => {
    if (busy) return;
    setDraft('');
    await onSubmit(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0e14] shadow-2xl shadow-black/60">
      {/* Header */}
      <div className={`flex items-center justify-between border-b ${colors.header} px-4 py-3`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${colors.gradient}`}>
            <span className="text-sm">🤖</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className={`text-[10px] ${accentColor === 'emerald' ? 'text-emerald-400' : `text-${accentColor}-400`}`}>
              {subtitle}
            </p>
          </div>
        </div>
        {actionButtons}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={msg.role === 'user' ? 'ml-auto max-w-[85%]' : 'max-w-[90%]'}
          >
            {msg.role === 'system' ? (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ) : msg.role === 'user' ? (
              <div className={`rounded-2xl rounded-br-md ${colors.badge} px-3 py-2 text-xs`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ) : (
              <div className="rounded-2xl rounded-bl-md border border-white/10 bg-[#161822] px-3 py-2 text-xs text-slate-200">
                {messageRenderer ? messageRenderer(msg) : msg.isTyping ? (
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '0ms' }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '150ms' }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '300ms' }} />
                    {msg.content && <span className="ml-2 text-slate-400">{msg.content}</span>}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && !busy && (
        <div className="flex gap-2 overflow-x-auto border-t border-white/5 px-4 py-2">
          {suggestions.map((s) => (
            <button
              key={s.prompt}
              onClick={() => handleSuggestion(s.prompt)}
              disabled={busy}
              className={`whitespace-nowrap rounded-full border ${colors.button} px-3 py-1 text-[11px] transition disabled:opacity-50`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/10 bg-[#12141c] p-3">
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-white/10 bg-[#0f1118] px-3 py-2 text-xs text-white placeholder-slate-500 transition focus:border-emerald-400/30 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={busy || !draft.trim()}
            className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${colors.gradient} text-white transition disabled:opacity-50`}
            aria-label="ส่งข้อความ"
          >
            {busy ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.5 3A1.5 1.5 0 00.93 4.5c.5 1 1.5 2 2.78 3.13C5.44 8.62 8 11 11 13.72V9a1 1 0 112 0v9a1 1 0 11-2 0v-4.72C8 13 5.44 15.38 3.71 16.87c-1.28 1.12-2.28 2.12-2.78 3.12A1.5 1.5 0 002.5 21h15a1 1 0 001-1v-2.5a1 1 0 10-2 0V19H4v-2.5a1 1 0 10-2 0V19H.5a1 1 0 01-1-1v-2.5z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Children (additional UI) */}
      {children}
    </div>
  );
}
