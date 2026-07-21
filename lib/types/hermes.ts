/**
 * Hermes dashboard type definitions
 * Shared types used by Hermes components and utilities
 */

export type Decision = 'ALLOW' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED';

export type ReviewGateStatus = 'PENDING' | 'APPROVED' | 'BLOCKED' | 'DELEGATED';

export type ReviewGate = {
  status: ReviewGateStatus;
  /** Runtime decision id when the gate is backed by a persisted decision. */
  decisionId?: string;
  /** ISO timestamps used by UI countdown/expiry displays. */
  createdAt?: string;
  expiresAt?: string;
};

export type ToolStep = {
  id: string;
  toolId: string;
  tool?: string;
  status: 'pending' | 'running' | 'done' | 'error';
  result?: unknown;
  error?: string;
};

export type Message = {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  ts: number;
  decision?: Decision;
  steps?: ToolStep[];
  model?: string;
  preflight?: {
    decision: string;
    reason?: string;
    risk?: 'LOW' | 'MEDIUM' | 'HIGH';
    affectedCount?: number;
    rollbackAvailable?: boolean;
  };
  collapsible?: boolean;
  reviewGate?: ReviewGate;
};

export type SystemStatus = {
  ok: boolean;
  db?: string;
  env?: string;
  commit?: string;
  timestamp?: string;
};

export type ParallelQueueStats = {
  size: number;
  avgWaitMs: number;
  p95WaitMs: number;
  p99WaitMs: number;
  priorityDistribution: {
    p1: number;
    p2: number;
    p3: number;
  };
  oldestRequestAgeMs: number;
};

export type HarmonyEngineStats = {
  totalLookups: number;
  heuristicHits: number;
  embeddingHits: number;
  misses: number;
  heuristicRate: number;
  embeddingRate: number;
  hitRate: number;
  avgLatency: number;
  indexSize: {
    heuristic: number;
    embedding: number;
  };
};

export type ExecutorCapacityStatus = {
  'virtual-pc': { current: number; max: number; utilization: number; peak: number };
  'browserbase': { current: number; max: number; utilization: number; peak: number };
  'terminal': { current: number; max: number; utilization: number; peak: number };
  'deploy': { current: number; max: number; utilization: number; peak: number };
};

export type ParallelSystemStatus = {
  queue?: ParallelQueueStats;
  harmonyEngine?: HarmonyEngineStats;
  executorCapacity?: ExecutorCapacityStatus;
  activeEnvironments?: number;
  totalAgents?: number;
  cacheMetrics?: {
    totalEntries: number;
    avgEntriesPerEnv: number;
  };
};

export type AttachedFile = {
  id: string;
  name: string;
  content: string;
  isImage: boolean;
};

export type HermesRuntimeStatus = {
  ok: boolean;
  runtime: string;
  status: string;
  model?: {
    provider: string;
    name: string;
    hosting: string | null;
    configured: boolean;
  };
  philosophy: Record<string, string>;
  modules: Record<string, string>;
  workers: string[];
  dsgGate: {
    planEndpoint: string;
    actionEndpoint: string;
    evidenceEndpoint: string;
    decisionModel: Record<string, string>;
  };
  memory: {
    layers: string[];
    claimRule: string;
  };
  skillLifecycle: string[];
  adaptiveExecution: Record<string, boolean>;
};
