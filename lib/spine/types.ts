import type { CanonicalInput } from '../runtime/canonical';

export type Decision = 'ALLOW' | 'STABILIZE' | 'BLOCK';

type CanonicalRecord = { [key: string]: CanonicalInput | undefined };

export type TruthState = {
  id?: string;
  canonical_hash: string;
  canonical_json: Record<string, unknown> | null;
  created_at?: string;
} | null;

export type PluginInput = {
  org_id: string;
  agent_id: string;
  action: string;
  payload: Record<string, unknown>;
  truth_state: TruthState;
  approval: {
    approval_id: string;
    approval_key: string;
    expires_at: string | null;
  } | null;
  spine: {
    request_id: string;
    received_at: string;
    billing_period: string;
  };
};

export type PluginOutput = {
  decision: Decision;
  reason: string;
  policy_version: string;
  latency_ms: number;
  proof: {
    proof_hash: string | null;
    proof_version: string | null;
    theorem_set_id: string | null;
    solver: string | null;
  };
  metrics: Record<string, unknown>;
};

export type PipelineStageTrace = {
  plugin_id: string;
  decision: Decision;
  reason: string;
  latency_ms: number;
  proof_hash: string | null;
};

export type PipelineResult = {
  final_decision: Decision;
  final_reason: string;
  final_policy_version: string;
  total_latency_ms: number;
  proof: PluginOutput['proof'];
  authoritative_plugin_id: string;
  stages: PipelineStageTrace[];
};

export type SpineIntentPayload = {
  agentId: string;
  action: string;
  input: CanonicalRecord;
  context: CanonicalRecord;
  canonicalRequest: {
    action: string;
    input: CanonicalRecord;
    context: CanonicalRecord;
  };
};

// Z3 / Simulation Framework Types (DeepTutor Integration)

export type GenomeId = string;

export interface GenomeParameters {
  rateLimitRpm: number;
  blockThreshold: number;
  allowThreshold: number;
  maxConcurrentExecutions: number;
  tokenBudgetPerUser: number;
  confidenceThreshold: number;
}

export interface Genome {
  id: GenomeId;
  parameters: GenomeParameters;
  fitness: number;
  generation: number;
}

export interface SLAContract {
  metric: string;
  operator: 'lt' | 'lte' | 'gt' | 'gte';
  threshold: number;
  description: string;
}

export interface SecurityInvariant {
  name: string;
  expression: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Z3ConstraintSet {
  slaContracts: SLAContract[];
  securityInvariants: SecurityInvariant[];
  resourceLimits: {
    maxConcurrentExecutions: number;
    maxMemoryMB: number;
    maxRpsPerAgent: number;
  };
  auditRequirements: Array<{
    eventType: string;
    required: boolean;
  }>;
}

export interface FitnessScore {
  latency: number;
  throughput: number;
  errorRate: number;
  costEfficiency: number;
  slaCompliance: boolean;
  zeroDataLoss: boolean;
  auditCompleteness: number;
  humanOverrideRate: number;
  quotaUtilization: number;
  composite: number;
}

export interface RequestTypeDistribution {
  [key: string]: number;
}

export interface SeasonalFactor {
  tick: number;
  multiplier: number;
}

export interface WorkloadTrace {
  durationTicks: number;
  requestsPerTick: number[];
  requestTypes: RequestTypeDistribution;
  seasonalFactors: SeasonalFactor[];
  traceHash: string;
}

export interface HumanSignals {
  overrides: number;
  corrections: number;
  averageResponseTime: number;
  satisfactionScore: number;
}

export interface ApprovalPattern {
  allowanceRate: number;
  blockageRate: number;
  overrideRate: number;
}

export interface SimulationConfig {
  maxTicks: number;
  populationSize: number;
  eliteSize: number;
  evolutionInterval: number;
  mutationRate: number;
  crossoverRate: number;
  snapshotInterval: number;
}

export interface SimulationInput {
  constraints: Z3ConstraintSet;
  telemetryBaseline: FitnessScore;
  workloadTrace: WorkloadTrace;
  humanSignals: HumanSignals;
  seedGenomes: Genome[];
  config: SimulationConfig;
  masterSeed: number;
}

export interface ExecutionRequest {
  id: string;
  type: string;
  priority: number;
  seed: number;
}

export interface ExecutionResult {
  requestId: string;
  decision: Decision;
  latency: number;
  status: 'success' | 'error' | 'timeout';
  genomeId: GenomeId;
}

export interface WorldState {
  tick: number;
  activeAgents: number;
  systemLoad: number;
}

export interface TelemetryEvent {
  timestamp: number;
  eventType: string;
  data: Record<string, unknown>;
}

export interface Z3Proof {
  proofHash: string;
  constraintId: string;
  satisfied: boolean;
}
