'use client';

import React, { useState, useEffect, useRef } from 'react';

const AGENTS = [
  { id: 'mind', name: '🧠 Mind', role: 'Planner', color: '#3b82f6' },
  { id: 'hand', name: '✋ Hand', role: 'Executor', color: '#ef4444' },
  { id: 'eye', name: '👁️ Eye', role: 'Observer', color: '#10b981' },
  { id: 'nerve', name: '⚡ Nerve', role: 'Processor', color: '#f59e0b' },
  { id: 'spine', name: '🔗 Spine', role: 'Reflexes', color: '#8b5cf6' },
];

const QUICK_ACTIONS = [
  { label: '🚀 Run Audit', action: 'run_audit', description: 'Run security audit' },
  { label: '📊 Cost Report', action: 'cost_report', description: 'Get cost breakdown' },
  { label: '🔐 Policy Check', action: 'policy_check', description: 'Evaluate policy' },
  { label: '📈 Status', action: 'get_status', description: 'Check agent status' },
  { label: '📝 Audit Log', action: 'get_audit', description: 'View audit trail' },
  { label: '💾 Usage', action: 'get_usage', description: 'Check quota usage' },
];

export default function SuperDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'system',
      text: 'Welcome to Trinity! Chat with agents, run tasks, or use quick actions.',
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('mind');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [lastResult, setLastResult] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error('Login failed');

      const data = await response.json();
      setToken(data.token);
      setIsLoggedIn(true);

      addSystemMessage('✅ Logged in successfully! Ready to use Trinity.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      addSystemMessage(`❌ Login failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;

    const userMsg = {
      id: messages.length + 1,
      sender: 'user',
      text: chatInput,
      timestamp: new Date(),
    };
    setMessages([...messages, userMsg]);
    setChatInput('');

    try {
      const response = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          agent_id: selectedAgent,
          message: chatInput,
        }),
      });

      if (!response.ok) {
        addMessage('system', '⚠️ Could not reach agent. Please try again.');
        return;
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        addMessage('system', '⚠️ No response stream');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let hasResponse = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const jsonStr = line.slice(6).trim();
            const event = JSON.parse(jsonStr);

            if (event.type === 'assistant_reply' && event.reply) {
              if (!hasResponse) {
                addMessage('agent', event.reply);
                hasResponse = true;
              }
            } else if (event.type === 'token' && event.text) {
              // Progressive token display (could be enhanced for better UX)
              if (!hasResponse) {
                addMessage('agent', event.text);
                hasResponse = true;
              }
            } else if (event.type === 'error' && event.message) {
              addMessage('system', `❌ ${event.message}`);
            }
          } catch (e) {
            // Skip unparseable SSE lines
          }
        }
      }

      if (!hasResponse) {
        addMessage('system', 'Agent processed your request');
      }
    } catch (err) {
      addMessage('system', `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleQuickAction = async (action: string) => {
    addSystemMessage(`⏳ Executing: ${action}...`);

    try {
      let endpoint = '';
      let method = 'GET';

      switch (action) {
        case 'run_audit':
          endpoint = '/api/execute';
          method = 'POST';
          break;
        case 'cost_report':
          endpoint = '/api/usage?period=24h';
          break;
        case 'policy_check':
          endpoint = '/api/v1/governance/evaluate';
          method = 'POST';
          break;
        case 'get_status':
          endpoint = '/api/agent/status';
          break;
        case 'get_audit':
          endpoint = '/api/v1/audit?limit=10';
          break;
        case 'get_usage':
          endpoint = '/api/usage';
          break;
        default:
          return;
      }

      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      };

      const response = await fetch(endpoint, options);
      if (response.ok) {
        const data = await response.json();
        setLastResult({ action, data, timestamp: new Date() });
        addSystemMessage(`✅ ${action} completed`);

        if (data.executions) {
          setExecutions(data.executions.slice(0, 5));
        }
      } else {
        addSystemMessage(`❌ ${action} failed`);
      }
    } catch (err) {
      addSystemMessage(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const addMessage = (sender: string, text: string) => {
    setMessages((m) => [...m, {
      id: m.length + 1,
      sender,
      text,
      timestamp: new Date(),
    }]);
  };

  const addSystemMessage = (text: string) => {
    addMessage('system', text);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-white mb-2">Trinity Dashboard</h1>
          <p className="text-gray-400 mb-6">Sign in to start orchestrating</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-gray-700 text-white rounded px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password (6+ chars)"
                className="w-full bg-gray-700 text-white rounded px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900 text-red-200 p-3 rounded text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-gray-400 text-xs mt-6 text-center">
            Demo: Use any email + password (6+ chars)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 space-y-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">🚀 Trinity Dashboard</h1>
          <p className="text-gray-400 text-sm">Production orchestration engine</p>
        </div>
        <button
          onClick={() => {
            setIsLoggedIn(false);
            setToken(null);
          }}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <label className="text-sm text-gray-300 block mb-2">Select Agent</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`p-2 rounded text-sm text-center transition ${
                    selectedAgent === agent.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  }`}
                >
                  <div>{agent.name}</div>
                  <div className="text-xs opacity-75">{agent.role}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 h-96 flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-3">💬 Chat</h2>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : msg.sender === 'system'
                        ? 'bg-purple-900 text-purple-200'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder="Ask agent to run task..."
                className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleChatSend}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3">⚡ Quick Actions</h2>
            <div className="space-y-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.action}
                  onClick={() => handleQuickAction(action.action)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-3 rounded text-left text-sm transition"
                >
                  <div className="font-semibold">{action.label}</div>
                  <div className="text-xs opacity-75">{action.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {lastResult && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-3">📊 Last Result</h2>
          <div className="bg-gray-900 rounded p-3 text-gray-300 text-sm max-h-60 overflow-y-auto">
            <pre>{JSON.stringify(lastResult.data, null, 2).slice(0, 500)}...</pre>
          </div>
        </div>
      )}

      {executions.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-3">📝 Recent Executions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Decision</th>
                  <th className="text-left py-2">Policy</th>
                  <th className="text-left py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((exec: any) => (
                  <tr key={exec.id} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="py-2">{exec.id.slice(0, 8)}</td>
                    <td className="py-2">{exec.decision}</td>
                    <td className="py-2">{exec.policy_version}</td>
                    <td className="py-2 text-xs">{new Date(exec.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
