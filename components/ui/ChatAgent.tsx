'use client';

import React, { useState } from 'react';
import { ChatMessage as ChatMessageType, ChatContext } from '@/types/chat';
import { chatWithHermes, createChatMessage } from '@/lib/hermes-chat';
import { ChatShell, type ChatMessage, type ChatSuggestion } from './ChatShell';

interface ChatAgentProps {
  context?: ChatContext;
  onAction?: (action: string, data?: unknown) => void;
  className?: string;
  compact?: boolean;
}

export function ChatAgent({ context, onAction, className = '', compact = false }: ChatAgentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content:
        'สวัสดี! ผมคือ Hermes, ตัวช่วยอัจฉริยะของคุณ 🚀\nถามผมเกี่ยวกับการ execute tasks, ตรวจสอบสถานะระบบ หรือประเมินการตัดสินใจ ได้เลย!',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const suggestions: ChatSuggestion[] = [
    { label: 'ตรวจสอบระบบ', prompt: 'check readiness' },
    { label: 'ดู audit log', prompt: 'show recent audit logs' },
  ];

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;
    setIsLoading(true);

    const userMessage = createChatMessage(message, 'user', {
      executionId: context?.executionId,
    });

    setMessages((prev) => [...prev, { id: userMessage.id, role: 'user', content: userMessage.content, timestamp: new Date() }]);

    try {
      // Convert ChatMessage[] to ChatMessageType[] for chatWithHermes
      const conversationHistory = messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        metadata: {},
      })) as unknown as ChatMessageType[];

      const response = await chatWithHermes({
        message,
        context,
        conversationHistory,
      });

      const assistantMessage = createChatMessage(response.reply, 'assistant', {
        action: response.action,
      });

      let content = assistantMessage.content;
      if (assistantMessage.metadata?.action && assistantMessage.metadata.action !== 'info') {
        content += `\n💡 ${assistantMessage.metadata.action}`;
      }

      setMessages((prev) => [...prev, { id: assistantMessage.id, role: 'assistant', content, timestamp: new Date() }]);

      if (response.action && response.action !== 'info' && onAction) {
        onAction(response.action, response.actionData);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: 'assistant', content: 'ขออภัย มีปัญหาขณะประมวลผล โปรดลองใหม่', timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <ChatShell
        title="Hermes Agent"
        description="AI Control Plane Assistant"
        messages={messages}
        onSubmit={handleSendMessage}
        isLoading={isLoading}
        suggestions={suggestions}
        inputPlaceholder="พูดกับ Hermes..."
        accentColor="blue"
        maxHeight={compact ? 'calc(100% - 120px)' : '600px'}
        compact={compact}
      />
    </div>
  );
}
