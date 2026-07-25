/**
 * DeepTutor Multi-Agent RAG Data Schema
 *
 * Defines the structure of real-world data coming from DeepTutor's
 * Multi-Engine RAG system for use in deterministic Z3 simulations
 */

// DeepTutor RAG Agent Types
export type DeepTutorAgentRole = 'Chat' | 'Quiz' | 'Research' | 'Visualize' | 'Solve' | 'Partner' | 'Co-Writer';

export interface DeepTutorAgent {
  id: string;
  role: DeepTutorAgentRole;
  model: string;
  capabilities: string[];
  memoryTiers: MemoryTier[];
  uptime99p: number; // percentage
  errorRate: number; // percentage
  latencyP99Ms: number;
  throughputRps: number; // requests per second
  costPerRequest: number;
}

export interface MemoryTier {
  level: number; // L1, L2, L3
  sizeBytes: number;
  ttlMs: number;
  hitRate: number;
}

// DeepTutor RAG Source Types
export type RAGSourceType = 'PDF' | 'DOCX' | 'XLSX' | 'PPTX' | 'Markdown' | 'API' | 'Database';

export interface RAGSource {
  id: string;
  type: RAGSourceType;
  engine: 'LlamaIndex' | 'GraphRAG' | 'LightRAG' | 'Obsidian';
  dataCharacteristics: {
    totalTokens: number;
    uniqueConcepts: number;
    averageRelevanceScore: number;
    freshness: 'real-time' | 'hourly' | 'daily' | 'weekly';
    reliability: number; // 0-1
  };
}

// DeepTutor Request/Response Metrics
export interface RAGRequest {
  id: string;
  agentId: string;
  sourceIds: string[];
  query: string;
  timestamp: number;
  priority: number;
}

export interface RAGResponse {
  requestId: string;
  agentId: string;
  latencyMs: number;
  tokensUsed: number;
  confidence: number; // 0-1, relevance score
  citations: string[];
  resultQuality: 'high' | 'medium' | 'low';
  cost: number;
  timestamp: number;
}

// DeepTutor Integration Data
export interface DeepTutorIntegrationPoint {
  platform: 'Telegram' | 'Slack' | 'Dingtalk' | 'Matrix';
  responseTimeMs: number;
  messageQueueDepth: number;
  deliveryRate: number; // 0-1
  botLatencyP99Ms: number;
}

// DeepTutor Workload Profile
export interface DeepTutorWorkloadProfile {
  profileId: string;
  duration: {
    startTime: number;
    endTime: number;
    durationMs: number;
  };
  requestDistribution: {
    totalRequests: number;
    requestsPerSecond: number;
    peakRps: number;
    burstiness: number; // std deviation / mean
    patterns: WorkloadPattern[];
  };
  sourceDistribution: {
    [sourceType in RAGSourceType]?: number;
  };
  agentDistribution: {
    [role in DeepTutorAgentRole]?: number;
  };
  qualityMetrics: {
    averageConfidence: number;
    lowQualityRate: number; // percentage
    averageCost: number;
    costVariance: number;
  };
}

export interface WorkloadPattern {
  tick: number;
  requestsPerTick: number;
  averageLatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
}

// DeepTutor Failure Modes (for adversarial testing)
export interface DeepTutorFailureMode {
  id: string;
  type: 'timeout' | 'rate-limit' | 'token-exhaustion' | 'source-unavailable' | 'memory-pressure' | 'cascade-failure';
  probability: number; // 0-1
  affectedAgents: string[];
  affectedSources: string[];
  recoveryTimeMs: number;
  cascadeRiskScore: number; // 0-1
}

// Complete DeepTutor System State
export interface DeepTutorSystemState {
  timestamp: number;
  agents: DeepTutorAgent[];
  sources: RAGSource[];
  integrationPoints: DeepTutorIntegrationPoint[];
  recentRequests: RAGRequest[];
  recentResponses: RAGResponse[];
  workloadProfile: DeepTutorWorkloadProfile;
  failureModes: DeepTutorFailureMode[];
  systemMetrics: {
    totalAgents: number;
    activeAgents: number;
    totalSources: number;
    systemCpuUsage: number; // percentage
    systemMemoryUsage: number; // percentage
    networkBandwidthUsedMbps: number;
    cumulativeCost: number;
  };
}

// DeepTutor Data Quality Certificate
export interface DataQualityCertificate {
  sourceState: DeepTutorSystemState;
  extractionTimestamp: number;
  dataHash: string;
  validationChecks: {
    completenessPct: number;
    consistencyOk: boolean;
    outlierDetected: boolean;
    freshness: 'current' | 'stale' | 'expired';
  };
  deterministicNonce: string; // for reproducibility
}

// Complete input from DeepTutor system
export interface DeepTutorInput {
  systemState: DeepTutorSystemState;
  dataQualityCertificate: DataQualityCertificate;
}
