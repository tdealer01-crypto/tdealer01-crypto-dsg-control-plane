/**
 * DSG Brain UI Types
 * Shared TypeScript types for dashboard components
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  planHash?: string;
  status?: 'pending' | 'success' | 'error' | 'blocked';
}

export interface ExecutionResult {
  success: boolean;
  planHash: string;
  violations: ConformanceViolation[];
  result?: {
    success: boolean;
    planHash: string;
    executedCommands: Array<{ command: string; args: string[] }>;
    fileChanges: Array<{ path: string; operation: string }>;
    evidence: Array<{
      type: string;
      id: string;
      hash: string;
      timestamp: number;
    }>;
  };
  message: string;
}

export interface ConformanceViolation {
  rule: string;
  expected: unknown;
  actual: unknown;
  message: string;
}

export interface ExecutionHistoryEntry {
  id: string;
  input: string;
  planHash: string;
  success: boolean;
  violations: ConformanceViolation[];
  timestamp: number;
  result?: ExecutionResult['result'];
}

export interface DsgBrainConfig {
  allowedCommands: string[];
  allowedPaths: string[];
  model?: string;
}

export interface SessionData {
  id: string;
  name: string;
  messages: ChatMessage[];
  config: DsgBrainConfig;
  createdAt: number;
  updatedAt: number;
}

export interface SlashCommand {
  name: string;
  description: string;
  usage: string;
  handler: (args: string[], context: any) => Promise<void> | void;
}
