'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader, AlertCircle, StopCircle } from 'lucide-react';
import { ReviewGatePanel, type ReviewGateDecision } from '@/components/ui/ReviewGatePanel';
import type { ReviewGate } from '@/lib/types/hermes';

interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  executionSummary?: {
    decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
    steps: number;
    completed: boolean;
  };
  preflight?: {
    risk?: 'LOW' | 'MEDIUM' | 'HIGH';
    affectedCount?: number;
    rollbackAvailable?: boolean;
    reason?: string;
  };
  reviewGate?: ReviewGate;
}

const REVIEW_GATE_TTL_MS = 5 * 60 * 1000;

export function HermesAgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'system',
      content: '🚀 Hermes Agent ready. Type a command or ask a question.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    setError(null);

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);

    try {
      const response = await fetch('/api/dashboard/hermes/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: messages[0]?.id || 'new',
          context: {
            messageCount: messages.length,
            lastRole: messages[messages.length - 1]?.role,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `API error: ${response.statusText}`
        );
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let agentContent = '';
        let executionSummary: Message['executionSummary'] | undefined;

        const agentMessage: Message = {
          id: `msg-${Date.now()}-agent`,
          role: 'agent',
          content: '',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, agentMessage]);

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === 'content') {
                    agentContent += data.content;
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      const lastMsg = newMessages[newMessages.length - 1];
                      if (lastMsg && lastMsg.role === 'agent') {
                        lastMsg.content = agentContent;
                      }
                      return newMessages;
                    });
                  } else if (data.type === 'execution') {
                    executionSummary = {
                      decision: data.decision || 'REVIEW',
                      steps: data.steps || 0,
                      completed: data.completed || false,
                    };
                  } else if (data.type === 'error') {
                    throw new Error(data.message || 'Unknown error');
                  }
                } catch {
                  // Ignore parse errors for non-JSON lines
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.role === 'agent' && executionSummary) {
            lastMsg.executionSummary = executionSummary;
            if (executionSummary.decision === 'REVIEW') {
              const now = Date.now();
              lastMsg.reviewGate = {
                status: 'PENDING',
                createdAt: new Date(now).toISOString(),
                expiresAt: new Date(now + REVIEW_GATE_TTL_MS).toISOString(),
              };
            }
          }
          return newMessages;
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-error`,
          role: 'system',
          content: `❌ Error: ${errorMessage}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReviewDecision = (messageId: string, decision: ReviewGateDecision) => {
    setMessages((prev) => {
      const next = prev.map((msg) =>
        msg.id === messageId && msg.reviewGate
          ? { ...msg, reviewGate: { ...msg.reviewGate, status: decision } }
          : msg
      );
      const label =
        decision === 'APPROVED' ? '✅ Operator confirmed the REVIEW-gated action'
        : decision === 'BLOCKED' ? '❌ Operator blocked the REVIEW-gated action'
        : '🤔 Operator delegated the REVIEW-gated action';
      next.push({
        id: `msg-${Date.now()}-gate`,
        role: 'system',
        content: `${label} (message ${messageId}). This updates the chat session only — no runtime commit is issued from this panel.`,
        timestamp: new Date(),
      });
      return next;
    });
  };

  const handleStop = async () => {
    try {
      await fetch('/api/dashboard/hermes/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      setIsStreaming(false);
    } catch {
      setError('Failed to stop execution');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[600px] bg-[#0c0e14] rounded-lg overflow-hidden border border-white/10">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-[#12141c]">
        <MessageCircle className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-lg font-bold text-white">Hermes Agent</h1>
          <p className="text-sm text-slate-400">
            Policy governance · Execution control · Audit trail
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-emerald-500/20 text-emerald-100 rounded-br-none'
                  : msg.role === 'agent'
                    ? 'bg-[#161822] text-slate-200 border border-white/10 rounded-bl-none'
                    : 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/20 rounded-bl-none'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>

              {msg.executionSummary && (
                <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        msg.executionSummary.decision === 'ALLOW'
                          ? 'bg-emerald-500/30 text-emerald-300'
                          : msg.executionSummary.decision === 'BLOCK'
                            ? 'bg-red-500/30 text-red-300'
                            : 'bg-yellow-500/30 text-yellow-300'
                      }`}
                    >
                      {msg.executionSummary.decision}
                    </span>
                    <span className="text-xs opacity-75">
                      {msg.executionSummary.steps}/2 steps
                    </span>
                  </div>
                  {msg.executionSummary.completed && (
                    <p className="text-xs opacity-75">✓ Execution complete</p>
                  )}
                </div>
              )}

              {msg.reviewGate && (
                <ReviewGatePanel
                  reviewGate={msg.reviewGate}
                  risk={msg.preflight?.risk ?? 'HIGH'}
                  affectedCount={msg.preflight?.affectedCount}
                  rollbackAvailable={msg.preflight?.rollbackAvailable}
                  reason={msg.preflight?.reason}
                  onDecision={(decision) => handleReviewDecision(msg.id, decision)}
                />
              )}

              <p className="text-xs opacity-60 mt-2">
                {msg.timestamp.toLocaleTimeString('th-TH')}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#161822] text-slate-200 rounded-lg px-4 py-3 flex items-center gap-2 border border-white/10">
              <Loader className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-sm">Agent is processing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-300 font-medium">Error</p>
            <p className="text-sm text-red-200 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 text-xs font-medium"
          >
            ✕
          </button>
        </div>
      )}

      <div className="border-t border-white/10 bg-[#12141c] px-4 py-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ถามเอเจนต์ หรือพิมพ์คำสั่ง... (Shift+Enter สำหรับขึ้นบรรทัด)"
            className="flex-1 px-4 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 resize-none text-sm text-white placeholder:text-slate-500 bg-[#0f1118]"
            rows={1}
            disabled={isLoading || isStreaming}
          />
          {isStreaming ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <StopCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Stop</span>
            </button>
          ) : (
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-lg hover:from-cyan-300 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Send</span>
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          💡 Hermes evaluates governance policies and returns ALLOW/BLOCK/REVIEW decisions
        </p>
      </div>
    </div>
  );
}
