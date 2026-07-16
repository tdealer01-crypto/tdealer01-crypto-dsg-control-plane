'use client';

import React, { useState } from 'react';
import { ChatShell, type ChatMessage, type ChatSuggestion } from '@/components/ui';
import { StopCircle } from 'lucide-react';

export function HermesAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: '🚀 Hermes Agent ready. Type a command or ask a question.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions: ChatSuggestion[] = [
    { label: 'Check governance', prompt: 'Review current policies and execution status' },
    { label: 'Show alerts', prompt: 'Display active governance alerts' },
  ];

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    setError(null);
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: message }]);
    setIsLoading(true);
    setIsStreaming(true);

    try {
      const response = await fetch('/api/dashboard/hermes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
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
        throw new Error(errorData.message || `API error: ${response.statusText}`);
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let agentContent = '';
        let executionSummary: { decision: 'ALLOW' | 'BLOCK' | 'REVIEW'; steps: number; completed: boolean } | undefined;

        const agentMessage: ChatMessage = {
          id: `agent-${Date.now()}`,
          role: 'assistant',
          content: '',
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
                      if (lastMsg && lastMsg.role === 'assistant') {
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

        if (executionSummary) {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.content += `\n\n[Decision: ${executionSummary.decision} | Steps: ${executionSummary.steps}/2${executionSummary.completed ? ' | ✓ Complete' : ''}]`;
            }
            return newMessages;
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setMessages((prev) => [...prev, { id: `error-${Date.now()}`, role: 'assistant', content: `❌ Error: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
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
    <div className="flex flex-col h-full">
      <ChatShell
        title="Hermes Agent"
        description="Policy governance · Execution control · Audit trail"
        messages={messages}
        onSubmit={handleSendMessage}
        isLoading={isLoading}
        suggestions={suggestions}
        inputPlaceholder="ถามเอเจนต์ หรือพิมพ์คำสั่ง..."
        accentColor="blue"
        maxHeight="calc(100% - 140px)"
        compact={false}
      />
      {isStreaming && (
        <div className="border-t border-white/10 bg-[#0B0B0F] px-4 py-2 flex items-center gap-2">
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            <StopCircle className="w-4 h-4" />
            <span>Stop</span>
          </button>
          <span className="text-xs text-slate-400">Streaming...</span>
        </div>
      )}
      {error && (
        <div className="border-t border-red-400/35 bg-red-500/10 px-4 py-2 text-xs text-red-100">
          {error}
        </div>
      )}
    </div>
  );
}
