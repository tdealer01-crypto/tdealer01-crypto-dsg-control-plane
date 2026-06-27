import type { ActionDescriptor } from '@/lib/dsg/hermes-e2e/types';
import type { BrowserbaseSafeCompletion, GateDecision } from '@/lib/dsg/hermes-e2e/types';

export interface Task {
  id: string;
  name: string;
  domain: ActionDescriptor['domain'];
  operation: ActionDescriptor['operation'];
  target: string;
  dataSensitivity: ActionDescriptor['dataSensitivity'];
  externalEffect: boolean;
  reversibility: ActionDescriptor['reversibility'];
  userAuthorized: boolean;
  planAllowed: boolean;
  hasFreshEvidence: boolean;
  hasRollback: boolean;
  dependencies?: string[];
  estimatedDurationMs?: number;
  priority?: number;
  /** Executor type: 'browser' (default), 'android', etc. */
  executorType?: 'browser' | 'android';
}

export interface TaskDag {
  tasks: Task[];
  edges: Array<{ from: string; to: string }>;
}

export interface AgentAssignment {
  agentId: number;
  tasks: Task[];
  startOrder: string[];
}

export interface AgentCapacity {
  agentId: number;
  maxConcurrentTasks: number;
  maxTotalTasks: number;
  resourceAvailable: Record<string, number>;
}

export interface Z3ConstraintModel {
  agentAssignmentVars: Record<string, number>;
  taskCountPerAgent: Record<number, number>;
  constraints: string[];
  solveDurationMs: number;
  proofHash: string;
}

export interface AgentExecutionResult {
  agentId: number;
  taskId: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  decision: GateDecision;
  result?: BrowserbaseSafeCompletion;
  error?: string;
  executionTimeMs: number;
  evidenceHash?: string;
}

export interface BatchExecutionResult {
  batchId: string;
  status: 'COMPLETED' | 'PARTIAL_FAILURE' | 'FAILED';
  taskDagHash: string;
  constraintSetHash: string;
  assignmentHash: string;
  assignments: AgentAssignment[];
  results: AgentExecutionResult[];
  totalExecutionTimeMs: number;
  agentEvidenceHashes: Record<number, string>;
  masterEvidenceHash: string;
}
