'use client';

import { useState, useEffect } from 'react';
import DsgChatInterface from '@/components/dsg-brain/DsgChatInterface';
import DsgExecutionHistory from '@/components/dsg-brain/DsgExecutionHistory';
import DsgConformanceReport from '@/components/dsg-brain/DsgConformanceReport';
import DsgConfigPanel from '@/components/dsg-brain/DsgConfigPanel';
import type { ChatMessage, ExecutionHistoryEntry, DsgBrainConfig } from '@/lib/dsg/brain/ui/types';
import {
  saveSession,
  loadSession,
  saveConfig,
  loadConfig,
  createNewSession,
  addMessageToSession,
  listSessions,
} from '@/lib/dsg/brain/ui/session-storage';

const DEFAULT_CONFIG: DsgBrainConfig = {
  allowedCommands: ['echo', 'ls', 'cat', 'find', 'grep'],
  allowedPaths: ['/tmp', '/var/tmp'],
};

export default function DsgBrainDashboard() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [config, setConfig] = useState<DsgBrainConfig>(DEFAULT_CONFIG);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string>('');
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistoryEntry[]>([]);

  // Initialize session on mount
  useEffect(() => {
    const savedConfig = loadConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }

    const sessionId = `session-${Date.now()}-new`;
    setCurrentSessionId(sessionId);
  }, []);

  // Update history when messages change
  useEffect(() => {
    const historyFromMessages: ExecutionHistoryEntry[] = [];
    messages.forEach((msg) => {
      if (msg.role === 'user' && msg.planHash && msg.status) {
        historyFromMessages.push({
          id: msg.id,
          input: msg.content,
          planHash: msg.planHash,
          success: msg.status === 'success',
          violations: [],
          timestamp: msg.timestamp,
        });
      }
    });
    setExecutionHistory(historyFromMessages);
  }, [messages]);

  const handleAddMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  };

  const handleConfigChange = (newConfig: DsgBrainConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const handleShowHistory = () => {
    // Scroll to history or show in panel
    setSelectedExecutionId('');
  };

  const handleShowConfig = () => {
    setShowConfigPanel(true);
  };

  const handleShowEvidence = (executionId: string) => {
    const entry = executionHistory.find((e) => e.id === executionId);
    if (entry) {
      setSelectedExecutionId(executionId);
    }
  };

  const handleRetry = () => {
    // Retry last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: lastUserMsg.content,
        timestamp: Date.now(),
      };
      handleAddMessage(newMsg);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setSelectedExecutionId('');
  };

  const handleExport = () => {
    const data = {
      config,
      messages,
      executionHistory,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dsg-brain-export-${Date.now()}.json`;
    a.click();
  };

  const handleSave = (name: string) => {
    const session = {
      id: `session-${Date.now()}`,
      name,
      messages,
      config,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveSession(session);
  };

  const handleLoad = (sessionId: string) => {
    const session = loadSession(sessionId);
    if (session) {
      setMessages(session.messages);
      setConfig(session.config);
      setCurrentSessionId(session.id);
      setSelectedExecutionId('');
    }
  };

  const selectedExecution =
    executionHistory.find((e) => e.id === selectedExecutionId) || executionHistory[0];

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">DSG Brain</h1>
          <p className="text-slate-400 text-sm mt-1">
            Execute tasks with Anthropic AI, governed by conformance rules
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chat (2 cols) */}
          <div className="lg:col-span-2 h-[600px]">
            <DsgChatInterface
              messages={messages}
              config={config}
              onAddMessage={handleAddMessage}
              onConfigChange={handleConfigChange}
              onShowHistory={handleShowHistory}
              onShowConfig={handleShowConfig}
              onShowEvidence={handleShowEvidence}
              onRetry={handleRetry}
              onClear={handleClear}
              onExport={handleExport}
              onSave={handleSave}
              onLoad={handleLoad}
            />
          </div>

          {/* Sidebar (1 col) */}
          <div className="space-y-4 h-[600px] overflow-y-auto">
            {/* History */}
            <div className="h-1/2">
              <DsgExecutionHistory entries={executionHistory} onSelectEntry={(e) => setSelectedExecutionId(e.id)} />
            </div>

            {/* Conformance Report */}
            <div className="h-1/2">
              <DsgConformanceReport entry={selectedExecution} />
            </div>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      {showConfigPanel && (
        <DsgConfigPanel
          config={config}
          onSave={handleConfigChange}
          onClose={() => setShowConfigPanel(false)}
        />
      )}
    </div>
  );
}
