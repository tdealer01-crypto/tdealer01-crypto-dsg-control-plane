/**
 * Chat message types for Hermes AI agent conversations
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    executionId?: string;
    agentId?: string;
    action?: 'allow' | 'deny' | 'escalate' | 'info';
  };
}

export interface ChatContext {
  executionId?: string;
  agentId?: string;
  systemStatus?: Record<string, unknown>;
  recentAlerts?: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: Date;
  }>;
  executorMetrics?: {
    utilization: number;
    capacity: number;
    queueLength: number;
  };
}

export interface ChatRequest {
  message: string;
  context?: ChatContext;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  action?: 'allow' | 'deny' | 'escalate' | 'info';
  actionData?: Record<string, unknown>;
  confidence: number;
}

export interface HermesAgentConfig {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}
