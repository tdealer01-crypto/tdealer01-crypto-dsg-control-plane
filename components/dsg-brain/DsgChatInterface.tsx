'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, ExecutionResult, DsgBrainConfig } from '@/lib/dsg/brain/ui/types';
import { executeDsgBrainPlan, sanitizeError } from '@/lib/dsg/brain/ui/ui-client';
import { parseInput, getHelpText } from '@/lib/dsg/brain/ui/command-parser';

interface DsgChatInterfaceProps {
  messages: ChatMessage[];
  config: DsgBrainConfig;
  onAddMessage: (msg: ChatMessage) => void;
  onConfigChange: (config: DsgBrainConfig) => void;
  onShowHistory: () => void;
  onShowConfig: () => void;
  onShowEvidence: (executionId: string) => void;
  onRetry: () => void;
  onClear: () => void;
  onExport: () => void;
  onSave: (name: string) => void;
  onLoad: (sessionId: string) => void;
}

export default function DsgChatInterface({
  messages,
  config,
  onAddMessage,
  onConfigChange,
  onShowHistory,
  onShowConfig,
  onShowEvidence,
  onRetry,
  onClear,
  onExport,
  onSave,
  onLoad,
}: DsgChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Check for slash commands
    const parsed = parseInput(text);
    if (parsed) {
      handleCommand(parsed.command, parsed.args);
      setInput('');
      return;
    }

    // Normal execution
    setLoading(true);
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'pending',
    };

    onAddMessage(userMessage);
    setInput('');

    try {
      const result = await executeDsgBrainPlan(text, config);
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-result`,
        role: 'assistant',
        content: formatResultMessage(result),
        timestamp: Date.now(),
        planHash: result.planHash,
        status: result.success ? 'success' : result.violations.length > 0 ? 'blocked' : 'error',
      };
      onAddMessage(assistantMessage);
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Error: ${sanitizeError(error)}`,
        timestamp: Date.now(),
        status: 'error',
      };
      onAddMessage(assistantMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCommand = async (command: string, args: string[]) => {
    const systemMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'system',
      content: '',
      timestamp: Date.now(),
    };

    switch (command) {
      case 'help':
        systemMessage.content = getHelpText();
        onAddMessage(systemMessage);
        break;
      case 'history':
        onShowHistory();
        break;
      case 'config':
        onShowConfig();
        break;
      case 'save':
        if (args.length > 0) {
          onSave(args.join(' '));
          systemMessage.content = `✓ Session saved as "${args.join(' ')}"`;
          onAddMessage(systemMessage);
        } else {
          systemMessage.content = 'Usage: /save <session-name>';
          onAddMessage(systemMessage);
        }
        break;
      case 'clear':
        onClear();
        break;
      case 'retry':
        onRetry();
        break;
      case 'export':
        onExport();
        systemMessage.content = '✓ Conversation exported as JSON';
        onAddMessage(systemMessage);
        break;
      case 'evidence':
        if (args.length > 0) {
          onShowEvidence(args[0]);
        } else {
          systemMessage.content = 'Usage: /evidence <execution-id>';
          onAddMessage(systemMessage);
        }
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 py-8">
            <p>Welcome to DSG Brain</p>
            <p className="text-sm mt-2">Type /help for available commands</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs px-3 py-2 rounded text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.role === 'system'
                    ? 'bg-slate-700 text-slate-100'
                    : msg.status === 'success'
                      ? 'bg-emerald-900 text-emerald-100'
                      : msg.status === 'blocked'
                        ? 'bg-amber-900 text-amber-100'
                        : 'bg-red-900 text-red-100'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              {msg.planHash && (
                <div className="text-xs mt-1 opacity-75">Hash: {msg.planHash.slice(0, 12)}...</div>
              )}
              <div className="text-xs opacity-50 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 text-slate-100 px-3 py-2 rounded text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                Processing...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700 p-4 bg-slate-900">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a task or /help for commands (Shift+Enter for newline)"
          disabled={loading}
          className="w-full bg-slate-800 text-white border border-slate-600 rounded px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 disabled:opacity-50 resize-none"
          rows={3}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded text-sm font-medium transition"
        >
          {loading ? 'Executing...' : 'Execute'}
        </button>
      </div>
    </div>
  );
}

function formatResultMessage(result: ExecutionResult): string {
  const lines: string[] = [];

  lines.push(`Plan Hash: ${result.planHash.slice(0, 16)}...`);
  lines.push('');

  if (result.success) {
    lines.push('✓ Success - Execution completed within constraints');
    if (result.result?.executedCommands) {
      lines.push('');
      lines.push('Commands executed:');
      result.result.executedCommands.forEach((cmd) => {
        lines.push(`  $ ${cmd.command} ${cmd.args.join(' ')}`);
      });
    }
  } else if (result.violations.length > 0) {
    lines.push('✗ Blocked - Conformance violations:');
    lines.push('');
    result.violations.forEach((v) => {
      lines.push(`  Rule: ${v.rule}`);
      lines.push(`  ${v.message}`);
    });
  } else {
    lines.push('✗ Error - Execution failed');
  }

  return lines.join('\n');
}
