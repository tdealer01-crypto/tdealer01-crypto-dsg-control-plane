'use client';

import { useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';

type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
};

function toApiHistory(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.id !== 'welcome')
    .slice(-18)
    .map((message) => ({
      role: message.role === 'agent' ? 'assistant' : 'user',
      content: message.text,
    }));
}

export function LiveAgentChat() {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [memoryStatus, setMemoryStatus] = useState('memory pending');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'agent',
      text: 'ผมคือ DSG Agent ที่ใช้ AI model จริงแล้วครับ ถามเรื่องแอป ฟีเจอร์ flow หลักฐาน หรือสิ่งที่ต้องการให้ builder สร้างได้เลย',
    },
  ]);

  function makeMessage(role: ChatMessage['role'], text: string): ChatMessage {
    return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, text };
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const history = toApiHistory(messages);
    const userMessage = makeMessage('user', text);
    setInput('');
    setError('');
    setMessages((current) => [...current, userMessage]);
    setBusy(true);

    try {
      const res = await fetch('/api/dsg/agent-chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-dsg-workspace-id': 'dsg-one-v1-customer-workspace',
          'x-dsg-actor-id': 'dsg-agent-chat-user',
          'x-dsg-actor-role': 'customer',
        },
        body: JSON.stringify({
          message: text,
          history,
          context: { surface: 'build_workspace' },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error?.message || json.error?.code || `HTTP_${res.status}`);
      setMemoryStatus(json.data.memory?.status ? `memory ${json.data.memory.status}` : 'memory unknown');
      const reply = json.data.reply || 'โมเดลตอบกลับว่าง ลองถามใหม่อีกครั้งครับ';
      setMessages((current) => [...current, makeMessage('agent', reply)]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AGENT_CHAT_FAILED';
      setError(message);
      setMemoryStatus('memory unavailable');
      setMessages((current) => [...current, makeMessage('agent', `ขออภัยครับ แชท AI ยังตอบไม่ได้: ${message}`)]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#C8A24D] bg-[#071326] p-4 text-[#F5F7FA] shadow-[0_0_36px_rgba(200,162,77,0.18)]">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#E0B95B]" />
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#E0B95B]">Live AI Agent Chat</p>
        <span className="rounded-full border border-[#C8A24D]/40 px-2 py-0.5 text-[10px] font-black uppercase text-[#D7D9DE]">{memoryStatus}</span>
      </div>
      <h2 className="mt-2 text-xl font-black">Ask the DSG Agent</h2>
      <p className="mt-1 text-sm text-[#D7D9DE]">This chat calls the server-side AI model with recent history and persistent DSG memory. Memory is context, not proof.</p>

      <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto rounded-xl border border-[#C8A24D]/30 bg-[#0C2340] p-3">
        {messages.map((message) => (
          <div key={message.id} className={message.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={message.role === 'user' ? 'inline-block max-w-[88%] rounded-2xl border border-[#C8A24D]/50 bg-[#E0B95B] px-3 py-2 text-left text-sm text-[#071326]' : 'inline-block max-w-[88%] rounded-2xl border border-[#C8A24D]/25 bg-[#071326] px-3 py-2 text-left text-sm text-[#F5F7FA]'}>
              <p className="mb-1 text-[10px] font-black uppercase opacity-70">{message.role === 'user' ? 'You' : 'DSG Agent'}</p>
              <p className="whitespace-pre-wrap leading-6">{message.text}</p>
            </div>
          </div>
        ))}
        {busy ? <div className="flex items-center gap-2 text-sm text-[#E0B95B]"><Loader2 className="h-4 w-4 animate-spin" /> Thinking with AI model, chat history, and persistent memory...</div> : null}
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
