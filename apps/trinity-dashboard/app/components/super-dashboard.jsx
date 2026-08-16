'use client';

import React, { useState } from 'react';

const AGENTS = [
  { id: 'mind', name: 'Mind', role: 'Planner' },
  { id: 'hand', name: 'Hand', role: 'Executor' },
  { id: 'eye', name: 'Eye', role: 'Observer' },
  { id: 'nerve', name: 'Nerve', role: 'Processor' },
  { id: 'spine', name: 'Spine', role: 'Reflexes' },
];

const QUICK_ACTIONS = [
  { label: 'Run Audit', action: 'run_audit', endpoint: '/api/execute', method: 'POST' },
  { label: 'Cost Report', action: 'cost_report', endpoint: '/api/usage?period=24h', method: 'GET' },
  { label: 'Policy Check', action: 'policy_check', endpoint: '/api/v1/governance/evaluate', method: 'POST' },
  { label: 'Status', action: 'get_status', endpoint: '/api/agent/status', method: 'GET' },
  { label: 'Audit Log', action: 'get_audit', endpoint: '/api/v1/audit?limit=10', method: 'GET' },
  { label: 'Usage', action: 'get_usage', endpoint: '/api/usage', method: 'GET' },
];

export default function SuperDashboard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('mind');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [lastResult, setLastResult] = useState(null);

  const authenticated = typeof token === 'string' && token.length > 0;

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.token !== 'string' || !body.token) {
        throw new Error(body.error || `LOGIN_HTTP_${response.status}`);
      }
      setToken(body.token);
    } catch (loginError) {
      setToken(null);
      setError(loginError instanceof Error ? loginError.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleChatSend() {
    const text = chatInput.trim();
    if (!text || !authenticated) return;

    setChatInput('');
    setMessages((current) => [...current, { sender: 'user', text }]);
    try {
      const response = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agent_id: selectedAgent, message: text }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.response !== 'string') {
        throw new Error(body.error || `AGENT_CHAT_HTTP_${response.status}`);
      }
      setMessages((current) => [...current, { sender: 'agent', text: body.response }]);
    } catch (chatError) {
      setMessages((current) => [
        ...current,
        { sender: 'system', text: `Agent unavailable: ${chatError instanceof Error ? chatError.message : 'unknown error'}` },
      ]);
    }
  }

  async function handleQuickAction(item) {
    if (!authenticated) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(item.endpoint, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `${item.action.toUpperCase()}_HTTP_${response.status}`);
      setLastResult({ action: item.action, data: body, receivedAt: new Date().toISOString() });
    } catch (actionError) {
      setLastResult(null);
      setError(actionError instanceof Error ? actionError.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-8 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">Trinity Dashboard</h1>
            <p className="mt-2 text-sm text-gray-400">Authentication requires the configured live Supabase service.</p>
          </div>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded bg-gray-800 px-4 py-3"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded bg-gray-800 px-4 py-3"
            required
          />
          {error && <div className="rounded bg-red-950 p-3 text-sm text-red-200">{error}</div>}
          <button disabled={loading} className="w-full rounded bg-blue-600 px-4 py-3 font-semibold disabled:opacity-50">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div>
            <h1 className="text-2xl font-bold">Trinity Dashboard</h1>
            <p className="text-sm text-gray-400">Only API-returned results are displayed.</p>
          </div>
          <button onClick={() => setToken(null)} className="rounded bg-gray-800 px-4 py-2">Logout</button>
        </header>

        {error && <div className="rounded border border-red-800 bg-red-950 p-4 text-red-200">{error}</div>}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
            <h2 className="text-lg font-semibold">Agent Chat</h2>
            <select
              value={selectedAgent}
              onChange={(event) => setSelectedAgent(event.target.value)}
              className="w-full rounded bg-gray-800 px-3 py-2"
            >
              {AGENTS.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name} — {agent.role}</option>
              ))}
            </select>
            <div className="h-64 overflow-auto rounded bg-black/30 p-3 space-y-2">
              {messages.length === 0 && <p className="text-sm text-gray-500">No messages yet.</p>}
              {messages.map((message, index) => (
                <div key={`${message.sender}-${index}`} className="rounded bg-gray-800 p-2 text-sm">
                  <span className="font-semibold">{message.sender}: </span>{message.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void handleChatSend()}
                placeholder="Send a task or question"
                className="flex-1 rounded bg-gray-800 px-3 py-2"
              />
              <button onClick={() => void handleChatSend()} className="rounded bg-blue-600 px-4 py-2">Send</button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-lg font-semibold">Actions</h2>
            <div className="mt-4 grid gap-2">
              {QUICK_ACTIONS.map((item) => (
                <button
                  key={item.action}
                  onClick={() => void handleQuickAction(item)}
                  disabled={loading}
                  className="rounded bg-gray-800 px-4 py-3 text-left hover:bg-gray-700 disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-lg font-semibold">Latest verified API response</h2>
          {lastResult ? (
            <pre className="mt-4 max-h-96 overflow-auto rounded bg-black/40 p-4 text-xs">{JSON.stringify(lastResult, null, 2)}</pre>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No successful API result recorded in this session.</p>
          )}
        </section>
      </div>
    </main>
  );
}
