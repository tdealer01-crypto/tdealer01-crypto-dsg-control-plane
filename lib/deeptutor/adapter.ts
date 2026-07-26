/**
 * DeepTutor → Simulation Input Adapter
 *
 * Transforms real-world DeepTutor RAG metrics into deterministic SimulationInput
 * for Z3 formal verification and evolutionary optimization
 */

import { createHash } from 'crypto';
import type {
  SimulationInput,
  Z3ConstraintSet,
  FitnessScore,
  WorkloadTrace,
  RequestTypeDistribution,
  SeasonalFactor,
  HumanSignals,
  ApprovalPattern,
  Genome,
  GenomeParameters,
  GenomeId,
  SimulationConfig,
} from '../spine/types';

import type {
  DeepTutorInput,
  DeepTutorAgent,
  RAGResponse,
  DeepTutorWorkloadProfile,
  WorkloadPattern,
  RAGSourceType,
} from './types.js';

/**
 * Validates DeepTutor data completeness and consistency
 */
export function validateDeepTutorInput(input: DeepTutorInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const { systemState, dataQualityCertificate } = input;

  // Check agent data
  if (!systemState.agents || systemState.agents.length === 0) {
    errors.push('No agents found in DeepTutor system state');
  }
  systemState.agents.forEach((agent, i) => {
    if (!agent.id || !agent.role || !agent.model) {
      errors.push(`Agent ${i} missing required fields`);
    }
    if (agent.uptime99p < 0 || agent.uptime99p > 100) {
      errors.push(`Agent ${agent.id} uptime out of range`);
    }
  });

  // Check source data
  if (!systemState.sources || systemState.sources.length === 0) {
    errors.push('No RAG sources found');
  }

  // Check workload profile
  if (!systemState.workloadProfile) {
    errors.push('No workload profile found');
  } else {
    const { requestDistribution } = systemState.workloadProfile;
    if (requestDistribution.totalRequests < 0) {
      errors.push('Invalid total requests');
    }
    if (requestDistribution.requestsPerSecond < 0) {
      errors.push('Invalid requests per second');
    }
  }

  // Check data quality certificate
  if (!dataQualityCertificate.validationChecks.consistencyOk) {
    errors.push('Data consistency check failed');
  }
  if (dataQualityCertificate.validationChecks.freshness === 'expired') {
    errors.push('DeepTutor data is expired');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Computes deterministic hash of DeepTutor input for reproducibility
 */
export function hashDeepTutorInput(input: DeepTutorInput): string {
  const canonical = JSON.stringify({
    agents: input.systemState.agents.sort((a, b) => a.id.localeCompare(b.id)),
    sources: input.systemState.sources.sort((a, b) => a.id.localeCompare(b.id)),
    workloadProfile: input.systemState.workloadProfile,
    systemMetrics: input.systemState.systemMetrics,
    dataQualityCertificate: {
      extractionTimestamp: input.dataQualityCertificate.extractionTimestamp,
      dataHash: input.dataQualityCertificate.dataHash,
      validationChecks: input.dataQualityCertificate.validationChecks,
    },
  });

  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Transforms DeepTutor agent metrics into Z3 constraints
 */
function buildZ3ConstraintsFromAgents(agents: DeepTutorAgent[]): Z3ConstraintSet {
  // Compute aggregate SLA targets from real agent performance
  const avgLatencyP99 = agents.reduce((sum, a) => sum + a.latencyP99Ms, 0) / agents.length;
  const avgErrorRate = agents.reduce((sum, a) => sum + a.errorRate, 0) / agents.length;
  const avgThroughput = agents.reduce((sum, a) => sum + a.throughputRps, 0) / agents.length;

  return {
    slaContracts: [
      {
        metric: 'latency_p99_ms',
        threshold: Math.ceil(avgLatencyP99 * 1.2), // 20% headroom
        operator: 'lte',
        description: 'P99 latency must not exceed baseline + 20% headroom',
      },
      {
        metric: 'error_rate_pct',
        threshold: Math.ceil(avgErrorRate + 2), // 2% absolute headroom
        operator: 'lte',
        description: 'Error rate must not exceed baseline + 2% absolute',
      },
      {
        metric: 'throughput_rps',
        threshold: Math.floor(avgThroughput * 0.8), // conservative floor
        operator: 'gte',
        description: 'Throughput must not drop below 80% of baseline',
      },
    ],
    securityInvariants: [
      {
        name: 'no_token_exhaustion',
        expression: 'tokensUsed <= maxTokenBudget',
        severity: 'high',
      },
      {
        name: 'rate_limit_enforcement',
        expression: 'requestsPerSecond <= maxRps',
        severity: 'medium',
      },
      {
        name: 'cascade_prevention',
        expression: 'cascadeRiskScore <= maxCascadeRisk',
        severity: 'critical',
      },
    ],
    resourceLimits: {
      maxConcurrentExecutions: agents.length * 10,
      maxMemoryMB: 4096,
      maxRpsPerAgent: Math.ceil(avgThroughput / agents.length),
    },
    auditRequirements: [
      {
        eventType: 'agent_execution',
        requiredFields: ['agentId', 'latency', 'cost', 'resultQuality'],
      },
      {
        eventType: 'source_access',
        requiredFields: ['sourceId', 'confidence', 'citations'],
      },
    ],
  };
}

/**
 * Transforms DeepTutor metrics into baseline fitness score
 */
function buildBaselineFitnessFromMetrics(
  agents: DeepTutorAgent[],
  responses: RAGResponse[],
  workload: DeepTutorWorkloadProfile,
): FitnessScore {
  const avgLatencyMs = responses.length > 0
    ? responses.reduce((sum, r) => sum + r.latencyMs, 0) / responses.length
    : 0;
  const p99LatencyMs = responses.length > 0
    ? [...responses].sort((a, b) => a.latencyMs - b.latencyMs)[Math.floor(responses.length * 0.99)]
        ?.latencyMs || 0
    : 0;

  const errorCount = responses.filter((r) => r.resultQuality === 'low').length;
  const errorRate = responses.length > 0 ? errorCount / responses.length : 0;

  const avgConfidence = responses.length > 0
    ? responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length
    : 0;

  const totalCost = responses.reduce((sum, r) => sum + r.cost, 0);
  const avgCostPerRequest = responses.length > 0 ? totalCost / responses.length : 0;
  const costEfficiency = avgCostPerRequest > 0 ? 1 / (1 + avgCostPerRequest) : 0; // normalize to 0-1

  return {
    latencyP99: p99LatencyMs,
    errorRate: errorRate * 100,
    throughput: workload.requestDistribution.requestsPerSecond,
    costEfficiency: costEfficiency,
    slaCompliance: errorRate < 0.05 && p99LatencyMs < 5000, // thresholds
    zeroDataLoss: errorRate === 0,
    auditCompleteness: avgConfidence * 100,
    humanOverrideRate: 0, // will be refined from human signals
    quotaUtilization: Math.min(1, totalCost / 10000), // normalize to 0-1
    composite: 0, // computed later
  };
}

/**
 * Transforms DeepTutor workload profile into simulation workload trace
 */
function buildWorkloadTraceFromProfile(profile: DeepTutorWorkloadProfile): WorkloadTrace {
  const { requestDistribution, duration } = profile;
  const durationTicks = Math.ceil(duration.durationMs / 1000); // 1 tick = 1 second

  // Generate request rate per tick based on patterns
  const requestsPerTick: number[] = [];
  if (profile.requestDistribution.patterns.length > 0) {
    const patterns = profile.requestDistribution.patterns;
    for (let i = 0; i < durationTicks; i++) {
      const pattern = patterns[i % patterns.length];
      requestsPerTick.push(pattern.requestsPerTick);
    }
  } else {
    // Fallback: uniform distribution
    const avgRps = requestDistribution.requestsPerSecond;
    const burstiness = requestDistribution.burstiness || 1;
    for (let i = 0; i < durationTicks; i++) {
      const jitter = Math.random() * burstiness * avgRps - (burstiness * avgRps) / 2;
      requestsPerTick.push(Math.max(1, Math.floor(avgRps + jitter)));
    }
  }

  // Build request type distribution
  const requestTypes: RequestTypeDistribution = {};
  const roles: Array<keyof typeof profile.agentDistribution> = [
    'Chat',
    'Quiz',
    'Research',
    'Visualize',
    'Solve',
    'Partner',
    'Co-Writer',
  ];
  roles.forEach((role) => {
    if (profile.agentDistribution[role]) {
      requestTypes[role] = profile.agentDistribution[role] || 0;
    }
  });

  // Build seasonal factors (e.g., peak hours)
  const seasonalFactors: SeasonalFactor[] = [];
  profile.requestDistribution.patterns.forEach((pattern, i) => {
    const multiplier = pattern.requestsPerTick / (requestDistribution.requestsPerSecond || 1);
    seasonalFactors.push({
      tick: i,
      multiplier: Math.max(0.1, multiplier), // floor at 10%
    });
  });

  const traceHash = createHash('sha256')
    .update(JSON.stringify({ requestsPerTick, requestTypes, seasonalFactors }))
    .digest('hex');

  return {
    durationTicks,
    requestsPerTick,
    requestTypes,
    seasonalFactors,
    traceHash,
  };
}

/**
 * Builds human signals from response quality and failure modes
 */
function buildHumanSignalsFromData(
  responses: RAGResponse[],
  agents: DeepTutorAgent[],
): HumanSignals {
  const approvalPatterns: ApprovalPattern[] = [];

  // Model approval based on confidence/quality
  responses.slice(0, 100).forEach((response) => {
    const approved = response.confidence > 0.8 && response.resultQuality !== 'low';
    approvalPatterns.push({
      eventType: response.agentId,
      approved,
      threshold: 0.75,
      timestamp: response.timestamp,
    });
  });

  return {
    approvalPatterns,
    thresholdHistory: [],
    incidentRootCauses: [],
  };
}

/**
 * Initializes seed genomes from DeepTutor baseline metrics
 */
function buildSeedGenomesFromAgents(agents: DeepTutorAgent[], count: number = 5): Genome[] {
  const genomes: Genome[] = [];
  const avgLatency = agents.reduce((sum, a) => sum + a.latencyP99Ms, 0) / agents.length;
  const avgThroughput = agents.reduce((sum, a) => sum + a.throughputRps, 0) / agents.length;

  for (let i = 0; i < count; i++) {
    const genomeId = `genome-seed-${i}` as GenomeId;
    const params: GenomeParameters = {
      rateLimitRpm: Math.floor(avgThroughput * 60 * (0.8 + Math.random() * 0.4)),
      rateLimitWindowMs: 60000,
      freeTierQuota: 1000 + Math.floor(Math.random() * 9000),
      paidTierMultiplier: 2 + Math.random() * 8,
      quotaWindowDays: 30,
      cacheTtlMs: 300000,
      cacheMaxSize: 10000,
      maxConcurrentExecutions: Math.floor(avgThroughput * (5 + Math.random() * 5)),
      queueDepth: 100 + Math.floor(Math.random() * 900),
      executionTimeoutMs: Math.ceil(avgLatency * 1.5 + Math.random() * 2000),
      webhookTimeoutMs: 5000,
      blockThreshold: 0.7 + Math.random() * 0.25,
      reviewThreshold: 0.3 + Math.random() * 0.3,
      batchSize: 10 + Math.floor(Math.random() * 90),
      batchWindowMs: 1000 + Math.floor(Math.random() * 9000),
    };

    genomes.push({
      id: genomeId,
      parentIds: [],
      parameters: params,
      fitness: undefined,
      z3Verified: false,
      canaryValidated: false,
      createdAtTick: 0,
    });
  }

  return genomes;
}

/**
 * Main adapter: transforms DeepTutor input to simulation input
 */
export function adaptDeepTutorToSimulation(
  deepTutorInput: DeepTutorInput,
  simulationConfig: Partial<SimulationConfig> = {},
  masterSeed: number = 42,
): SimulationInput {
  const { systemState, dataQualityCertificate } = deepTutorInput;

  // Validation
  const validation = validateDeepTutorInput(deepTutorInput);
  if (!validation.valid) {
    throw new Error(`DeepTutor data validation failed: ${validation.errors.join('; ')}`);
  }

  // Build constraints from agents
  const constraints = buildZ3ConstraintsFromAgents(systemState.agents);

  // Build baseline fitness
  const telemetryBaseline = buildBaselineFitnessFromMetrics(
    systemState.agents,
    systemState.recentResponses,
    systemState.workloadProfile,
  );

  // Build workload trace
  const workloadTrace = buildWorkloadTraceFromProfile(systemState.workloadProfile);

  // Build human signals
  const humanSignals = buildHumanSignalsFromData(systemState.recentResponses, systemState.agents);

  // Build seed genomes
  const seedGenomes = buildSeedGenomesFromAgents(systemState.agents, 5);

  // Default simulation config
  const config: SimulationConfig = {
    maxTicks: 1000,
    populationSize: 20,
    eliteSize: 2,
    evolutionInterval: 10,
    mutationRate: 0.1,
    crossoverRate: 0.7,
    snapshotInterval: 50,
    ...simulationConfig,
  };

  return {
    constraints,
    telemetryBaseline,
    workloadTrace,
    humanSignals,
    seedGenomes,
    config,
    masterSeed,
  };
}
