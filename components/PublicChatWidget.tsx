'use client';

import { useState } from 'react';

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

export default function PublicChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([
    makeLine('system', 'ถาม DSG Agent, pricing, demo หรือวิธีเริ่มใช้งานได้เลย — public mode ไม่ execute action'),
  ]);

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
      if (!response.ok) {
        throw new Error(String(json.error || 'Public chat failed'));
      }
      setLines((prev) => [...prev, makeLine('assistant', String(json.reply || 'พร้อมช่วยครับ'))]);
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
        className="fixed bottom-5 right-5 z-[80] rounded-full border border-emerald-300/30 bg-emerald-400 px-4 py-3 text-sm font-bold text-black shadow-2xl shadow-emerald-500/30 transition hover:scale-105"
        aria-label="Open public DSG chat"
      >
        ถาม DSG
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex h-[480px] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">DSG Public Assistant</p>
          <p className="text-[11px] text-slate-400">ถามได้ก่อนล็อกอิน · ไม่มี runtime execution</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white" aria-label="Close public chat">
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {lines.map((line) => (
          <div
            key={line.id}
            className={
              line.role === 'user'
                ? 'ml-auto max-w-[85%] rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-3 py-2 text-xs text-emerald-100'
                : line.role === 'system'
                  ? 'max-w-[92%] rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100'
                  : 'max-w-[92%] rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200'
            }
          >
            {line.content}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-800 px-4 py-2">
        {['ราคา', 'ขอ demo', 'DSG Agent คืออะไร', 'เริ่มใช้งาน'].map((item) => (
          <button
            key={item}
            onClick={() => submit(item)}
            disabled={busy}
            className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:border-emerald-400 disabled:opacity-50"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="border-t border-slate-800 p-3">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void submit(draft);
              }
            }}
            placeholder="ถามก่อนล็อกอิน..."
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
          />
          <button
            onClick={() => submit(draft)}
            disabled={busy}
            className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-bold text-black disabled:bg-slate-700 disabled:text-slate-400"
          >
            {busy ? '...' : 'ส่ง'}
          </button>
        </div>
      </div>
    </div>
  );
}
