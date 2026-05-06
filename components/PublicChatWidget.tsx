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

const quickPrompts = ['เริ่มใช้งาน', 'ต่อระบบเดิม', 'ดู monitor', 'export evidence', 'ราคา', 'ขอ demo'];

const commandLinks = [
  { href: '/proofgate', label: 'ProofGate' },
  { href: '/enterprise-ready', label: 'Setup flow' },
  { href: '/dashboard/integrations', label: 'Connect' },
  { href: '/gateway/monitor', label: 'Monitor' },
];

export default function PublicChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([
    makeLine('system', 'ถาม DSG ได้ก่อนล็อกอิน: ต่อระบบเดิม, monitor, command, pricing, demo — public mode ไม่ execute action'),
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
      if (!response.ok) throw new Error(String(json.error || 'Public chat failed'));
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
        className="fixed bottom-5 right-5 z-50 rounded-full border border-amber-300/50 bg-amber-300 px-5 py-4 text-sm font-extrabold text-black shadow-2xl shadow-amber-500/30 ring-2 ring-black/50 transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-amber-200"
        aria-label="Open public DSG command chat"
      >
        ถาม / สั่ง DSG
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[560px] w-[min(410px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-amber-300/25 bg-[#06080f] shadow-2xl shadow-black/70">
      <div className="flex items-center justify-between border-b border-amber-300/15 px-4 py-3">
        <div>
          <p className="text-sm font-black text-slate-100">DSG Command Assistant</p>
          <p className="text-[11px] text-slate-400">ถามง่าย · เห็น next action · ไม่มี runtime execution</p>
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
        ลูกค้ามักต้องการเห็น: ระบบต่อกับอะไรได้, action ถูก allow/review/block เพราะอะไร, evidence export ได้ไหม, และต้องทำขั้นตอนถัดไปอะไร.
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
            className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:border-amber-300 disabled:opacity-50"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="border-t border-amber-300/15 p-3">
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
            placeholder="ถาม/สั่งงาน เช่น ต่อ ERP ยังไง..."
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-300"
          />
          <button
            onClick={() => submit(draft)}
            disabled={busy}
            className="rounded-xl bg-amber-300 px-3 py-2 text-sm font-black text-black disabled:bg-slate-700 disabled:text-slate-400"
          >
            {busy ? '...' : 'ส่ง'}
          </button>
        </div>
      </div>
    </div>
  );
}
