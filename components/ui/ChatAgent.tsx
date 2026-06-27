'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader, MessageCircle } from 'lucide-react';
import { ChatMessage, ChatContext } from '@/types/chat';
import { chatWithHermes, createChatMessage } from '@/lib/hermes-chat';
import { Button } from './Button';
import { Input } from './Input';

interface ChatAgentProps {
  context?: ChatContext;
  onAction?: (action: string, data?: unknown) => void;
  className?: string;
  compact?: boolean;
}

export function ChatAgent({ context, onAction, className = '', compact = false }: ChatAgentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createChatMessage(
      'สวัสดี! ผมคือ Hermes, ตัวช่วยอัจฉริยะของคุณ 🚀\nถามผมเกี่ยวกับการ execute tasks, ตรวจสอบสถานะระบบ หรือประเมินการตัดสินใจ ได้เลย!',
      'assistant'
    ),
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(!compact);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = createChatMessage(inputValue, 'user', {
      executionId: context?.executionId,
    });

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await chatWithHermes({
        message: userMessage.content,
        context,
        conversationHistory: messages,
      });

      const assistantMessage = createChatMessage(response.reply, 'assistant', {
        action: response.action,
      });

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.action && response.action !== 'info' && onAction) {
        onAction(response.action, response.actionData);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = createChatMessage(
        'ขออภัย มีปัญหาขณะประมวลผล โปรดลองใหม่',
        'assistant'
      );
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (compact && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center z-40"
        title="Open Hermes Chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className={`flex flex-col h-full bg-[--color-surface-primary] border border-white/10 rounded-[--radius-xl] overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10 p-[--space-4] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-blue-400" />
          <div>
            <h3 className="text-[--text-sm] font-bold text-white">Hermes Agent</h3>
            <p className="text-[--text-xs] text-gray-400">AI Control Plane Assistant</p>
          </div>
        </div>
        {compact && (
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-[--space-4] space-y-[--space-3]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-[--space-3] py-[--space-2] rounded-[--radius-lg] text-[--text-sm] ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-[--color-surface-secondary] text-gray-200 rounded-bl-none border border-white/10'
              }`}
            >
              {msg.content}
              {msg.metadata?.action && msg.role === 'assistant' && (
                <div className="text-[--text-xs] text-gray-300 mt-[--space-1]">
                  💡 {msg.metadata.action}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[--color-surface-secondary] text-gray-400 px-[--space-3] py-[--space-2] rounded-[--radius-lg] flex items-center gap-2">
              <Loader className="h-4 w-4 animate-spin" />
              <span className="text-[--text-sm]">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-[--space-3] space-y-2">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="พูดกับ Hermes..."
            disabled={isLoading}
            className="flex-1 text-[--text-sm] bg-[--color-surface-secondary] border-white/10"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="p-2"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[--text-xs] text-gray-500">
          💬 Type a message or ask about your executions
        </p>
      </div>
    </div>
  );
}
