"use client";

import { useState, useRef, useEffect } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

const QUICK_ACTIONS = [
  { label: '🔍 ตรวจสอบระบบ', message: 'readiness check' },
  { label: '👥 ดู Agents', message: 'list agents' },
  { label: '📊 ดู Executions', message: 'show recent executions' },
  { label: '💰 ดูความจุ', message: 'check capacity' },
  { label: '🛡 สั่งงานผิดกฎ (ลอง)', message: 'delete all user records' },
];

const GATE_QUICK = [
  { label: '1. Declare Session', action: 'declare' },
  { label: '2. Gate Action (ALLOW)', action: 'allow' },
  { label: '3. Gate Action (BLOCK)', action: 'block' },
];

export default function DemoPage() {
  const [tab, setTab] = useState<'chat' | 'gate'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'สวัสดีครับ ผมคือ DSG Agent พร้อมช่วยเหลื้อคุณ\n\nลองถามคำถาม หรือกดปุ่มด้านล่างเพื่อเริ่มต้นใช้งาน' },
  ]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState('demo-' + Math.random().toString(36).slice(2, 10));
  const [declared, setDeclared] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (msg: string) => {
    if (!msg.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setInput('');

    try {
      const res = await fetch('/api/try/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      const response = data.response || data.error || 'Sorry, I could not answer that.';
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ ไม่สามารถเชื่อมต่อได้' }]);
    }
  };

  const handleGate = async (action: 'declare' | 'allow' | 'block') => {
    if (action === 'declare') {
      setMessages((prev) => [...prev, { role: 'user', content: 'Declare Session: read database, send email' }]);
      try {
        const res = await fetch('/api/try/gate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            declared_actions: ['read database', 'send email', 'update user record'],
            ttl_minutes: 30,
          }),
        });
        const data = await res.json();
        const content = data.ok
          ? `✅ Session declared!\nStamp: ${data.declaration_stamp}\nActions: ${data.declared_actions.join(', ')}\nTTL: ${data.ttl_minutes} นาที`
          : `❌ ${data.error}`;
        setMessages((prev) => [...prev, { role: 'assistant', content }]);
        setDeclared(true);
      } catch {
        setMessages((prev) => [...prev, { role: 'assistant', content: '❌ ไม่สามารถเชื่อมต่อได้' }]);
      }
    } else if (action === 'allow') {
      setMessages((prev) => [...prev, { role: 'user', content: 'send email to customer@example.com' }]);
      try {
        const res = await fetch('/api/try/gate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, action: 'send email to customer@example.com' }),
        });
        const data = await res.json();
        const content = data.decision === 'ALLOW'
          ? `✅ ${data.decision}\nStamp: ${data.stamp}\nStamps issued: ${data.session_state?.stamps_issued}`
          : `❌ ${data.decision}\nReason: ${data.reason}`;
        setMessages((prev) => [...prev, { role: 'assistant', content }]);
      } catch {
        setMessages((prev) => [...prev, { role: 'assistant', content: '❌ ไม่สามารถเชื่อมต่อได้' }]);
      }
    } else if (action === 'block') {
      setMessages((prev) => [...prev, { role: 'user', content: 'delete all user records' }]);
      try {
        const res = await fetch('/api/try/gate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, action: 'delete all user records' }),
        });
        const data = await res.json();
        const content = data.decision === 'BLOCK'
          ? `🛡️ ${data.decision}\nReason: ${data.reason}\n\n💡 Agent Guidance:\n${data.agent_guidance?.suggested_llm_prompt}`
          : `✅ ${data.decision}\nStamp: ${data.stamp}`;
        setMessages((prev) => [...prev, { role: 'assistant', content }]);
      } catch {
        setMessages((prev) => [...prev, { role: 'assistant', content: '❌ ไม่สามารถเชื่อมต่อได้' }]);
      }
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#07080b] text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-bold text-black">
            DSG
          </div>
          <div>
            <h1 className="text-sm font-semibold">DSG ONE Demo</h1>
            <p className="text-[10px] text-slate-500">Interactive AI Control Plane</p>
          </div>
        </div>
        <div className="flex gap-1 rounded-xl bg-white/5 p-1">
          <button
            onClick={() => setTab('chat')}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              tab === 'chat' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setTab('gate')}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              tab === 'gate' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            🛡️ Gate
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden p-4">
        {/* Tabs Content */}
        {tab === 'chat' ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === 'user' ? 'ml-auto max-w-[80%]' : 'max-w-[80%]'}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-500/20 text-emerald-100'
                        : 'border border-white/10 bg-white/[0.03] text-slate-200'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-3 flex gap-2 overflow-x-auto py-1">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => sendMessage(qa.message)}
                  className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-emerald-400/30 hover:bg-emerald-400/10"
                >
                  {qa.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="mt-3 flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ถามคำถามหรือสั่งงาน..."
                className="flex-1 rounded-xl border border-white/10 bg-[#0a0c12] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400/50"
              />
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              >
                ส่ง
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Gate Status */}
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Session ID</span>
                  <code className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs text-emerald-300">{sessionId}</code>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  declared ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {declared ? '✅ Active' : '⏳ Not declared'}
                </span>
              </div>
            </div>

            {/* Gate Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              {messages.length === 1 && !declared && (
                <div className="text-center text-sm text-slate-500">
                  <p>🛡️ DSG Gate Demo</p>
                  <p className="mt-2">กดปุ่มด้านล่างเพื่อเริ่มต้นใช้งาน</p>
                </div>
              )}
              {messages.slice(1).map((msg, i) => (
                <div key={i} className={msg.role === 'user' ? 'ml-auto max-w-[80%]' : 'max-w-[80%]'}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-500/20 text-blue-100'
                        : msg.content.includes('✅') || msg.content.includes('Stamp')
                          ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                          : msg.content.includes('🛡️') || msg.content.includes('❌')
                            ? 'border border-rose-400/30 bg-rose-400/10 text-rose-200'
                            : 'border border-white/10 bg-white/[0.03] text-slate-200'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                  </div>
                </div>
              ))}
            </div>

            {/* Gate Quick Actions */}
            <div className="mt-3 space-y-2">
              <div className="flex gap-2 overflow-x-auto py-1">
                {GATE_QUICK.map((qa) => (
                  <button
                    key={qa.action}
                    onClick={() => handleGate(qa.action as 'declare' | 'allow' | 'block')}
                    disabled={qa.action !== 'declare' && !declared}
                    className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-emerald-400/30 hover:bg-emerald-400/10 disabled:opacity-30"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
