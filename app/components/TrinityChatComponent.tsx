/**
 * Trinity Control Chat
 *
 * Chat-style widget over three read endpoints that exist in this app today:
 *   - GET /api/agents                       (org-scoped agent list + usage)
 *   - GET /api/settings/security/audit-events (requires org_admin/runtime_auditor)
 *   - GET /api/usage/analytics               (quota + cost history)
 *
 * Auth follows the same pattern already used by app/components/super-dashboard.tsx:
 * POST /api/auth/login with email/password returns a Supabase access_token,
 * held in component state and sent as a Bearer header. No token is ever read
 * from or written to localStorage.
 *
 * Two tools from the original design (agent mode switching, state continuity)
 * were dropped: no backing route exists for either in this app.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Send, AlertCircle, CheckCircle, Zap } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface ToolResult {
  toolName: string;
  status: 'success' | 'error';
  data?: unknown;
  error?: string;
  timestamp: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolResults?: ToolResult[];
  timestamp: string;
}

interface ToolCall {
  tool: 'get_agents_status' | 'get_security_audit' | 'get_cost_tracker';
  arguments: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definitions (only tools with a real backing route)
// ─────────────────────────────────────────────────────────────────────────────

const TRINITY_TOOLS = [
  {
    name: 'get_agents_status',
    label: 'Agent status',
    description: 'List org agents with status and this-month usage.',
    endpoint: '/api/agents',
  },
  {
    name: 'get_security_audit',
    label: 'Security audit',
    description: 'Latest audit events (requires org_admin or runtime_auditor role).',
    endpoint: '/api/settings/security/audit-events',
  },
  {
    name: 'get_cost_tracker',
    label: 'Usage / cost',
    description: 'Quota usage, 6-month history, top agents by execution count.',
    endpoint: '/api/usage/analytics',
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Auth + API hook
// ─────────────────────────────────────────────────────────────────────────────

function useTrinityAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `Login failed (${response.status})`);
      }

      const data = await response.json();
      setToken(data.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const callTool = async (toolCall: ToolCall): Promise<unknown> => {
    if (!token) {
      throw new Error('Not logged in.');
    }

    const tool = TRINITY_TOOLS.find((t) => t.name === toolCall.tool);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolCall.tool}`);
    }

    const params = new URLSearchParams(toolCall.arguments);
    const query = params.toString();
    const url = query ? `${tool.endpoint}?${query}` : tool.endpoint;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      throw new Error('Session expired. Log in again.');
    }
    if (response.status === 403) {
      throw new Error('Insufficient permissions for this action.');
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Request failed (${response.status}): ${body}`);
    }

    return response.json();
  };

  return { token, email, setEmail, password, setPassword, loggingIn, authError, login, callTool };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Component
// ─────────────────────────────────────────────────────────────────────────────

export function TrinityChatComponent() {
  const { token, email, setEmail, password, setPassword, loggingIn, authError, login, callTool } =
    useTrinityAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const detectToolCall = (text: string): ToolCall | null => {
    const lower = text.toLowerCase();

    if (lower.includes('status') || lower.includes('agent') || lower.includes('health')) {
      return { tool: 'get_agents_status', arguments: {} };
    }
    if (lower.includes('security') || lower.includes('audit')) {
      return { tool: 'get_security_audit', arguments: { page_size: '10' } };
    }
    if (lower.includes('cost') || lower.includes('budget') || lower.includes('usage') || lower.includes('quota')) {
      return { tool: 'get_cost_tracker', arguments: {} };
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !token) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const toolCall = detectToolCall(input);

      if (toolCall) {
        const result = await callTool(toolCall);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Ran ${toolCall.tool}:`,
            toolResults: [
              {
                toolName: toolCall.tool,
                status: 'success',
                data: result,
                timestamp: new Date().toISOString(),
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Try asking about:\n\n${TRINITY_TOOLS.map((t) => `• "${t.label}" - ${t.description}`).join('\n')}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="max-w-md">
        <h2 className="text-xl font-bold text-[#F8FAFC] mb-1">Trinity Control Chat</h2>
        <p className="text-sm text-[#AAB3C5] mb-4">Log in to query agents, audits, and usage.</p>

        {authError && (
          <div className="mb-3 flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" /> {authError}
          </div>
        )}

        <form onSubmit={login} className="flex flex-col gap-3">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={loggingIn}>
            {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log in'}
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full max-h-[600px]">
      <div className="border-b border-[rgba(247,220,120,0.16)] pb-3 mb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#F8FAFC]">Trinity Control Chat</h2>
          <Badge variant="success">
            <CheckCircle className="w-3 h-3" /> Connected
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-4 mb-3">
        {messages.length === 0 && (
          <div className="text-center text-[#AAB3C5] py-8">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Start chatting to query Trinity tools</p>
            <p className="text-sm mt-1">Try: &quot;Check agent status&quot; or &quot;Show usage&quot;</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xl p-3 rounded-lg text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[rgba(212,175,55,0.16)] text-[#F8FAFC]'
                  : 'bg-[rgba(255,255,255,0.04)] text-[#F8FAFC]'
              }`}
            >
              <p>{msg.content}</p>

              {msg.toolResults?.map((result, idx) => (
                <div key={idx} className="mt-3 border-t border-[rgba(247,220,120,0.16)] pt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs bg-[rgba(255,255,255,0.06)] px-2 py-1 rounded">
                      {result.toolName}
                    </code>
                    {result.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <pre className="bg-[rgba(0,0,0,0.3)] p-2 rounded overflow-auto max-h-48 text-xs">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[rgba(255,255,255,0.04)] p-3 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-[rgba(247,220,120,0.16)] pt-3">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about agents, usage, security..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
          {TRINITY_TOOLS.map((tool) => (
            <Button
              key={tool.name}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setInput(tool.label)}
            >
              {tool.label}
            </Button>
          ))}
        </div>
      </form>
    </Card>
  );
}

export default TrinityChatComponent;
