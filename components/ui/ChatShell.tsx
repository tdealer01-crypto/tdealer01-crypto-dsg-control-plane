'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Send, Loader, MessageCircle, X } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatSuggestion {
  label: string;
  prompt: string;
}

interface ChatShellProps {
  title: string;
  description?: string;
  messages: ChatMessage[];
  onSubmit: (message: string) => Promise<void> | void;
  isLoading?: boolean;
  suggestions?: ChatSuggestion[];
  inputPlaceholder?: string;
  accentColor?: 'blue' | 'amber' | 'emerald' | 'red' | 'purple';
  onClose?: () => void;
  compact?: boolean;
  maxHeight?: string;
}

function getAccentClasses(color: string) {
  switch (color) {
    case 'amber':
      return {
        header: 'bg-gradient-to-r from-amber-600/20 to-yellow-600/20 border-amber-500/30',
        button: 'bg-amber-500 hover:bg-amber-600 text-white',
        input: 'border-amber-500/20',
        userMsg: 'bg-amber-600 text-white',
      };
    case 'emerald':
      return {
        header: 'bg-gradient-to-r from-emerald-600/20 to-green-600/20 border-emerald-500/30',
        button: 'bg-emerald-500 hover:bg-emerald-600 text-white',
        input: 'border-emerald-500/20',
        userMsg: 'bg-emerald-600 text-white',
      };
    case 'red':
      return {
        header: 'bg-gradient-to-r from-red-600/20 to-pink-600/20 border-red-500/30',
        button: 'bg-red-500 hover:bg-red-600 text-white',
        input: 'border-red-500/20',
        userMsg: 'bg-red-600 text-white',
      };
    case 'purple':
      return {
        header: 'bg-gradient-to-r from-purple-600/20 to-violet-600/20 border-purple-500/30',
        button: 'bg-purple-500 hover:bg-purple-600 text-white',
        input: 'border-purple-500/20',
        userMsg: 'bg-purple-600 text-white',
      };
    case 'blue':
    default:
      return {
        header: 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-blue-500/30',
        button: 'bg-blue-500 hover:bg-blue-600 text-white',
        input: 'border-blue-500/20',
        userMsg: 'bg-blue-600 text-white',
      };
  }
}

export function ChatShell({
  title,
  description,
  messages,
  onSubmit,
  isLoading = false,
  suggestions = [],
  inputPlaceholder = 'Type a message...',
  accentColor = 'blue',
  onClose,
  compact = false,
  maxHeight = '600px',
}: ChatShellProps) {
  const [inputValue, setInputValue] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const accentClasses = getAccentClasses(accentColor);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (message: string = inputValue) => {
    if (!message.trim() || isLoading) return;

    setInputValue('');
    try {
      await onSubmit(message);
    } catch (error) {
      console.error('Chat error:', error);
    }
  };

  const handleSuggestion = (prompt: string) => {
    setInputValue(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-[--dsg-surface] border border-white/10 rounded-[--radius-xl] overflow-hidden shadow-xl">
      {/* Header */}
      <div className={`border-b border-white/10 p-[--space-4] flex items-center justify-between ${accentClasses.header}`}>
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            {title}
          </h3>
          {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto p-[--space-4] space-y-[--space-3]"
        style={{ maxHeight }}
      >
        {messages.length === 0 && suggestions.length > 0 && !isLoading && (
          <div className="text-center py-8">
            <MessageCircle className="h-8 w-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-4">What would you like to do?</p>
            <div className="space-y-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    handleSuggestion(suggestion.prompt);
                  }}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-gray-300 hover:text-gray-100"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-[--space-3] py-[--space-2] rounded-[--radius-lg] text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? `${accentClasses.userMsg} rounded-br-none shadow-lg`
                  : 'bg-[--dsg-surface-2] text-gray-200 rounded-bl-none border border-white/10'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[--dsg-surface-2] text-gray-400 px-[--space-3] py-[--space-2] rounded-[--radius-lg] flex items-center gap-2">
              <Loader className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 p-[--space-3] space-y-3">
        {suggestions.length > 0 && messages.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {suggestions.slice(0, 2).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestion(suggestion.prompt)}
                disabled={isLoading}
                className="text-left text-xs px-2 py-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-gray-400 hover:text-gray-300 disabled:opacity-50"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        )}

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
            placeholder={inputPlaceholder}
            disabled={isLoading}
            className={`flex-1 text-sm bg-[--dsg-surface-2] border-white/10 ${accentClasses.input}`}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputValue.trim()}
            className={`p-2 rounded-lg transition-all border border-white/10 disabled:opacity-50 ${accentClasses.button}`}
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
