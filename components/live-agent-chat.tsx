'use client';

import { useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';

type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
};

export function LiveAgentChat() {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'agent',
      text: 'ผมคือ DSG Agent ที่ใช้ AI model จริงแล้วครับ ถามเรื่องแอป ฟีเจอร์ flow หลักฐาน หรือสิ่งที่ต้องการให้ builder สร้างได้เลย',
    },
  ]);

  function push(role: ChatMessage['role'], text: string) {
    setMessages((current) => [...current, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, text }]);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setError('');
    push('user', text);
    setBusy(true);
    try {
      const res = await fetch('/api/dsg/agent-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, context: { surface: 'build_workspace' } }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error?.message || json.error?.code || `HTTP_${res.status}`);
      push('agent', json.data.reply || 'โมเดลตอบกลับว่าง ลองถามใหม่อีกครั้งครับ');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AGENT_CHAT_FAILED';
      setError(message);
      push('agent', `ขออภัยครับ แชท AI ยังตอบไม่ได้: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#C8A24D] bg-[#071326] p-4 text-[#F5F7FA] shadow-[0_0_36px_rgba(200,162,77,0.18)]">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#E0B95B]" />
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#E0B95B]">Live AI Agent Chat</p>
      </div>
      <h2 className="mt-2 text-xl font-black">Ask the DSG Agent</h2>
      <p className="mt-1 text-sm text-[#D7D9DE]">This chat calls the server-side AI model. It is not a fixed preset response.</p>

      <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto rounded-xl border border-[#C8A24D]/30 bg-[#0C2340] p-3">
        {messages.map((message) => (
          <div key={message.id} className={message.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={message.role === 'user' ? 'inline-block max-w-[88%] rounded-2xl border border-[#C8A24D]/50 bg-[#E0B95B] px-3 py-2 text-left text-sm text-[#071326]' : 'inline-block max-w-[88%] rounded-2xl border border-[#C8A24D]/25 bg-[#071326] px-3 py-2 text-left text-sm text-[#F5F7FA]'}>
              <p className="mb-1 text-[10px] font-black uppercase opacity-70">{message.role === 'user' ? 'You' : 'DSG Agent'}</p>
              <p className="whitespace-pre-wrap leading-6">{message.text}</p>
            </div>
          </div>
        ))}
        {busy ? <div className="flex items-center gap-2 text-sm text-[#E0B95B]"><Loader2 className="h-4 w-4 animate-spin" /> Thinking with AI model...</div> : null}
      </div>

      {error ? <div className="mt-3 rounded-xl border border-[#D9363E] bg-[#D9363E]/15 p-3 text-sm text-[#ffb4b8]">{error}</div> : null}

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') send(); }}
          placeholder="Ask what to build, what is missing, or how to prove it..."
          className="h-11 min-w-0 flex-1 rounded-xl border border-[#C8A24D]/50 bg-[#0C2340] px-3 text-sm text-white outline-none placeholder:text-[#8aa0bd]"
        />
        <button onClick={send} disabled={busy || !input.trim()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#C8A24D] bg-[#E0B95B] px-4 text-sm font-black text-[#071326] disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </button>
      </div>
    </section>
  );
}
