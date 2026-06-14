'use client';

import React, { useState } from 'react';
import { ChatAgent } from '@/components/ui/ChatAgent';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function ChatDemoPage() {
  const [lastAction, setLastAction] = useState<{ action: string; time: Date } | null>(null);

  // Example context with executor metrics
  const chatContext = {
    executionId: 'exec-78f6d23a',
    agentId: 'hermes-01',
    executorMetrics: {
      utilization: 78,
      capacity: 100,
      queueLength: 5,
    },
    recentAlerts: [
      {
        severity: 'warning' as const,
        message: 'Executor near capacity limit (78%)',
        timestamp: new Date(),
      },
      {
        severity: 'info' as const,
        message: 'New task queued: data-processing-batch-4',
        timestamp: new Date(),
      },
    ],
  };

  const handleAction = (action: string, data?: unknown) => {
    console.log('[Chat Demo] Action:', action, data);
    setLastAction({ action, time: new Date() });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[--color-surface-primary] via-[#0D1117] to-[--color-surface-primary] p-[--space-6]">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-[--space-8]">
        <h1 className="text-[--text-3xl] font-bold text-white mb-[--space-3]">
          ✨ Hermes Chat Agent Demo
        </h1>
        <p className="text-[--color-text-secondary] text-[--text-base]">
          Ask Hermes natural language questions about your executions and system status.
          Try asking in Thai or English!
        </p>
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-[--space-6]">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <ChatAgent context={chatContext} onAction={handleAction} className="h-[600px]" />
        </div>

        {/* Info Panel */}
        <div className="space-y-[--space-6]">
          {/* Context Info */}
          <Card variant="default" className="h-fit">
            <h2 className="text-[--text-base] font-bold text-white mb-[--space-4]">
              Current Context
            </h2>

            <div className="space-y-[--space-3]">
              <div>
                <p className="text-[--text-xs] text-gray-400 uppercase tracking-wide">Execution ID</p>
                <p className="text-[--text-sm] text-white font-mono">{chatContext.executionId}</p>
              </div>

              <div>
                <p className="text-[--text-xs] text-gray-400 uppercase tracking-wide">Executor Utilization</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-[--color-surface-secondary] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 to-red-500"
                      style={{ width: `${chatContext.executorMetrics.utilization}%` }}
                    />
                  </div>
                  <span className="text-[--text-sm] text-white font-bold">
                    {chatContext.executorMetrics.utilization}%
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[--text-xs] text-gray-400 uppercase tracking-wide">Queue Length</p>
                <p className="text-[--text-lg] font-bold text-blue-400">
                  {chatContext.executorMetrics.queueLength} tasks
                </p>
              </div>
            </div>
          </Card>

          {/* Recent Alerts */}
          <Card variant="default" className="h-fit">
            <h3 className="text-[--text-base] font-bold text-white mb-[--space-3]">Alerts</h3>
            <div className="space-y-[--space-2]">
              {chatContext.recentAlerts.map((alert, i) => (
                <div key={i} className="flex gap-2">
                  <Badge
                    variant={alert.severity === 'warning' ? 'warning' : 'info'}
                    className="flex-shrink-0"
                  >
                    {alert.severity}
                  </Badge>
                  <p className="text-[--text-xs] text-gray-300">{alert.message}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Last Action */}
          {lastAction && (
            <Card variant="success" className="h-fit">
              <h3 className="text-[--text-base] font-bold text-white mb-[--space-2]">
                Last Action
              </h3>
              <div>
                <Badge variant="success" className="mb-[--space-2]">
                  {lastAction.action.toUpperCase()}
                </Badge>
                <p className="text-[--text-xs] text-gray-300">
                  {lastAction.time.toLocaleTimeString()}
                </p>
              </div>
            </Card>
          )}

          {/* Example Queries */}
          <Card variant="default" className="h-fit">
            <h3 className="text-[--text-base] font-bold text-white mb-[--space-3]">
              📝 Try These Queries
            </h3>
            <div className="space-y-[--space-2] text-[--text-xs]">
              <p className="text-gray-300">
                • เช็คพลังงาน executor ตอนนี้ได้มั้ย?
              </p>
              <p className="text-gray-300">
                • มีงานกำลังรออยู่กี่อัน?
              </p>
              <p className="text-gray-300">
                • ลดโหลด executor สักหน่อย
              </p>
              <p className="text-gray-300">
                • What's the current system status?
              </p>
              <p className="text-gray-300">
                • Should I escalate this alert?
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Feature Description */}
      <div className="max-w-7xl mx-auto mt-[--space-12]">
        <Card variant="blue">
          <h2 className="text-[--text-xl] font-bold text-white mb-[--space-4]">
            🚀 Hermes Agent Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[--space-6] text-[--text-sm] text-gray-200">
            <div>
              <h3 className="font-bold text-blue-300 mb-2">Natural Language</h3>
              <p>Ask questions in Thai or English, Hermes understands context and responds naturally</p>
            </div>
            <div>
              <h3 className="font-bold text-blue-300 mb-2">System Aware</h3>
              <p>Hermes has access to real-time metrics, alerts, and execution context</p>
            </div>
            <div>
              <h3 className="font-bold text-blue-300 mb-2">Actionable</h3>
              <p>Suggests and executes actions: allow, deny, escalate based on your queries</p>
            </div>
            <div>
              <h3 className="font-bold text-blue-300 mb-2">Conversational</h3>
              <p>Maintains conversation history for coherent, multi-turn interactions</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
