/**
 * DeepTutor Data Pipeline Integration Tests
 *
 * Tests complete data flow from DeepTutor RAG to deterministic Z3 simulation
 */

import { describe, it, expect } from 'vitest';
import type { DeepTutorInput, DeepTutorSystemState, DataQualityCertificate } from '../../lib/deeptutor/types.js';
import {
  validateDeepTutorInput,
  hashDeepTutorInput,
  adaptDeepTutorToSimulation,
} from '../../lib/deeptutor/adapter.js';
import {
  DeepTutorDataPipeline,
  runDeepTutorPipeline,
} from '../../lib/deeptutor/data-pipeline.js';

/**
 * Mock DeepTutor system state for testing
 */
function mockDeepTutorSystemState(): DeepTutorSystemState {
  return {
    timestamp: Date.now(),
    agents: [
      {
        id: 'agent-chat-1',
        role: 'Chat',
        model: 'gpt-4-turbo',
        capabilities: ['streaming', 'memory', 'web-search'],
        memoryTiers: [
          { level: 1, sizeBytes: 102400, ttlMs: 3600000, hitRate: 0.85 },
          { level: 2, sizeBytes: 1048576, ttlMs: 86400000, hitRate: 0.72 },
          { level: 3, sizeBytes: 10485760, ttlMs: 2592000000, hitRate: 0.58 },
        ],
        uptime99p: 99.95,
        errorRate: 0.02,
        latencyP99Ms: 800,
        throughputRps: 100,
        costPerRequest: 0.015,
      },
      {
        id: 'agent-research-1',
        role: 'Research',
        model: 'gpt-4-turbo',
        capabilities: ['web-search', 'synthesis', 'citations'],
        memoryTiers: [
          { level: 1, sizeBytes: 51200, ttlMs: 1800000, hitRate: 0.78 },
          { level: 2, sizeBytes: 524288, ttlMs: 43200000, hitRate: 0.65 },
          { level: 3, sizeBytes: 5242880, ttlMs: 1296000000, hitRate: 0.52 },
        ],
        uptime99p: 99.90,
        errorRate: 0.05,
        latencyP99Ms: 2500,
        throughputRps: 50,
        costPerRequest: 0.03,
      },
      {
        id: 'agent-solve-1',
        role: 'Solve',
        model: 'gpt-4-turbo',
        capabilities: ['step-by-step', 'validation', 'proof'],
        memoryTiers: [
          { level: 1, sizeBytes: 204800, ttlMs: 7200000, hitRate: 0.92 },
          { level: 2, sizeBytes: 2097152, ttlMs: 172800000, hitRate: 0.81 },
          { level: 3, sizeBytes: 20971520, ttlMs: 5184000000, hitRate: 0.68 },
        ],
        uptime99p: 99.92,
        errorRate: 0.01,
        latencyP99Ms: 1200,
        throughputRps: 75,
        costPerRequest: 0.025,
      },
    ],
    sources: [
      {
        id: 'source-pdf-1',
        type: 'PDF',
        engine: 'LlamaIndex',
        dataCharacteristics: {
          totalTokens: 500000,
          uniqueConcepts: 1200,
          averageRelevanceScore: 0.82,
          freshness: 'daily',
          reliability: 0.95,
        },
      },
      {
        id: 'source-docs-1',
        type: 'Markdown',
        engine: 'Obsidian',
        dataCharacteristics: {
          totalTokens: 300000,
          uniqueConcepts: 800,
          averageRelevanceScore: 0.88,
          freshness: 'hourly',
          reliability: 0.98,
        },
      },
    ],
    integrationPoints: [
      {
        platform: 'Slack',
        responseTimeMs: 250,
        messageQueueDepth: 5,
        deliveryRate: 0.999,
        botLatencyP99Ms: 150,
      },
    ],
    recentRequests: [],
    recentResponses: [
      {
        requestId: 'req-1',
        agentId: 'agent-chat-1',
        latencyMs: 750,
        tokensUsed: 200,
        confidence: 0.92,
        citations: ['source-pdf-1', 'source-docs-1'],
        resultQuality: 'high',
        cost: 0.012,
        timestamp: Date.now() - 5000,
      },
      {
        requestId: 'req-2',
        agentId: 'agent-research-1',
        latencyMs: 2300,
        tokensUsed: 1500,
        confidence: 0.85,
        citations: ['source-docs-1'],
        resultQuality: 'high',
        cost: 0.035,
        timestamp: Date.now() - 4000,
      },
      {
        requestId: 'req-3',
        agentId: 'agent-chat-1',
        latencyMs: 850,
        tokensUsed: 150,
        confidence: 0.88,
        citations: ['source-pdf-1'],
        resultQuality: 'medium',
        cost: 0.010,
        timestamp: Date.now() - 3000,
      },
    ],
    workloadProfile: {
      profileId: 'profile-1',
      duration: {
        startTime: Date.now() - 86400000,
        endTime: Date.now(),
        durationMs: 86400000,
      },
      requestDistribution: {
        totalRequests: 8640,
        requestsPerSecond: 0.1,
        peakRps: 0.5,
        burstiness: 1.2,
        patterns: [
          { tick: 0, requestsPerTick: 100, averageLatencyMs: 800, p99LatencyMs: 1500, errorRate: 0.01 },
          { tick: 1, requestsPerTick: 95, averageLatencyMs: 750, p99LatencyMs: 1400, errorRate: 0.02 },
          { tick: 2, requestsPerTick: 110, averageLatencyMs: 900, p99LatencyMs: 1700, errorRate: 0.015 },
        ],
      },
      sourceDistribution: {
        PDF: 0.4,
        Markdown: 0.5,
        DOCX: 0.1,
      },
      agentDistribution: {
        Chat: 0.5,
        Research: 0.3,
        Solve: 0.2,
      },
      qualityMetrics: {
        averageConfidence: 0.88,
        lowQualityRate: 0.05,
        averageCost: 0.019,
        costVariance: 0.015,
      },
    },
    failureModes: [],
    systemMetrics: {
      totalAgents: 3,
      activeAgents: 3,
      totalSources: 2,
      systemCpuUsage: 45,
      systemMemoryUsage: 62,
      networkBandwidthUsedMbps: 128,
      cumulativeCost: 150.5,
    },
  };
}

/**
 * Mock data quality certificate
 */
function mockDataQualityCertificate(): DataQualityCertificate {
  return {
    sourceState: mockDeepTutorSystemState(),
    extractionTimestamp: Date.now(),
    dataHash: 'abc123def456',
    validationChecks: {
      completenessPct: 98,
      consistencyOk: true,
      outlierDetected: false,
      freshness: 'current',
    },
    deterministicNonce: 'nonce-12345',
  };
}

/**
 * Test data validation
 */
describe('DeepTutor Data Pipeline — Validation', () => {
  it('validates complete and valid DeepTutor input', () => {
    const input: DeepTutorInput = {
      systemState: mockDeepTutorSystemState(),
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const result = validateDeepTutorInput(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects missing agents', () => {
    const input: DeepTutorInput = {
      systemState: {
        ...mockDeepTutorSystemState(),
        agents: [],
      },
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const result = validateDeepTutorInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('No agents'))).toBe(true);
  });

  it('detects invalid uptime values', () => {
    const state = mockDeepTutorSystemState();
    state.agents[0]!.uptime99p = 150; // invalid

    const input: DeepTutorInput = {
      systemState: state,
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const result = validateDeepTutorInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('uptime'))).toBe(true);
  });

  it('detects stale data', () => {
    const cert = mockDataQualityCertificate();
    cert.validationChecks.freshness = 'expired';

    const input: DeepTutorInput = {
      systemState: mockDeepTutorSystemState(),
      dataQualityCertificate: cert,
    };

    const result = validateDeepTutorInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('expired'))).toBe(true);
  });
});

/**
 * Test data adaptation
 */
describe('DeepTutor Data Pipeline — Adaptation', () => {
  it('transforms DeepTutor input to simulation input', () => {
    const input: DeepTutorInput = {
      systemState: mockDeepTutorSystemState(),
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const simInput = adaptDeepTutorToSimulation(input, {}, 42);

    expect(simInput).toBeDefined();
    expect(simInput.constraints).toBeDefined();
    expect(simInput.constraints.slaContracts.length).toBeGreaterThan(0);
    expect(simInput.seedGenomes.length).toBeGreaterThan(0);
    expect(simInput.workloadTrace).toBeDefined();
    expect(simInput.config).toBeDefined();
  });

  it('creates valid seed genomes from agents', () => {
    const input: DeepTutorInput = {
      systemState: mockDeepTutorSystemState(),
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const simInput = adaptDeepTutorToSimulation(input);

    simInput.seedGenomes.forEach((genome) => {
      expect(genome.id).toBeDefined();
      expect(genome.parameters).toBeDefined();
      expect(genome.parameters.rateLimitRpm).toBeGreaterThan(0);
      expect(genome.parameters.blockThreshold).toBeGreaterThanOrEqual(0);
      expect(genome.parameters.blockThreshold).toBeLessThanOrEqual(1);
    });
  });

  it('preserves workload distribution', () => {
    const input: DeepTutorInput = {
      systemState: mockDeepTutorSystemState(),
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const simInput = adaptDeepTutorToSimulation(input);

    expect(simInput.workloadTrace.requestsPerTick.length).toBeGreaterThan(0);
    expect(simInput.workloadTrace.requestTypes).toBeDefined();
    expect(Object.keys(simInput.workloadTrace.requestTypes).length).toBeGreaterThan(0);
  });

  it('generates Z3 constraints from agent SLAs', () => {
    const input: DeepTutorInput = {
      systemState: mockDeepTutorSystemState(),
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const simInput = adaptDeepTutorToSimulation(input);
    const { constraints } = simInput;

    expect(constraints.slaContracts).toBeDefined();
    expect(constraints.slaContracts.some((c) => c.metric === 'latency_p99_ms')).toBe(true);
    expect(constraints.slaContracts.some((c) => c.metric === 'error_rate_pct')).toBe(true);
  });
});

/**
 * Test reproducibility
 */
describe('DeepTutor Data Pipeline — Reproducibility', () => {
  it('generates same hash for same input', () => {
    const input: DeepTutorInput = {
      systemState: mockDeepTutorSystemState(),
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const hash1 = hashDeepTutorInput(input);
    const hash2 = hashDeepTutorInput(input);

    expect(hash1).toBe(hash2);
  });

  it('generates different hash for different input', () => {
    const input1: DeepTutorInput = {
      systemState: mockDeepTutorSystemState(),
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const state2 = mockDeepTutorSystemState();
    state2.agents[0]!.latencyP99Ms = 500;
    const input2: DeepTutorInput = {
      systemState: state2,
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const hash1 = hashDeepTutorInput(input1);
    const hash2 = hashDeepTutorInput(input2);

    expect(hash1).not.toBe(hash2);
  });

  it('deterministic adaptation with same seed produces reproducible output', () => {
    const input: DeepTutorInput = {
      systemState: mockDeepTutorSystemState(),
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const output1 = adaptDeepTutorToSimulation(input, {}, 42);
    const output2 = adaptDeepTutorToSimulation(input, {}, 42);

    // Same master seed should produce same config
    expect(output1.masterSeed).toBe(output2.masterSeed);
    expect(output1.config).toEqual(output2.config);
  });
});

/**
 * Test pipeline orchestration
 */
describe('DeepTutor Data Pipeline — Orchestration', () => {
  it('executes complete pipeline successfully', async () => {
    const input: DeepTutorInput = {
      systemState: mockDeepTutorSystemState(),
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const result = await runDeepTutorPipeline(input, {}, 42);

    expect(result).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.metadata.pipelineId).toBeDefined();
    expect(result.simulationInput).toBeDefined();
    expect(result.dataLineage).toBeDefined();
    expect(result.reproducibilityToken).toBeDefined();
  });

  it('includes complete data lineage', async () => {
    const input: DeepTutorInput = {
      systemState: mockDeepTutorSystemState(),
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const result = await runDeepTutorPipeline(input);

    const { dataLineage } = result;
    expect(dataLineage.transformationSteps.length).toBeGreaterThan(0);
    expect(dataLineage.transformationSteps.some((s) => s.step === 'validation')).toBe(true);
    expect(dataLineage.transformationSteps.some((s) => s.step === 'adaptation')).toBe(true);
  });

  it('generates reproducibility token with CLI command', async () => {
    const input: DeepTutorInput = {
      systemState: mockDeepTutorSystemState(),
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const result = await runDeepTutorPipeline(input, {}, 99);

    expect(result.reproducibilityToken.command).toContain('deeptutor-pipeline run');
    expect(result.reproducibilityToken.masterSeed).toBe(99);
  });

  it('pipeline can be rerun with reproducibility token', async () => {
    const input: DeepTutorInput = {
      systemState: mockDeepTutorSystemState(),
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const result1 = await runDeepTutorPipeline(input, {}, 42);
    const result2 = await runDeepTutorPipeline(input, {}, 42);

    // Same input + same seed = same output hashes
    expect(result1.reproducibilityToken.inputHash).toBe(result2.reproducibilityToken.inputHash);
    expect(result1.reproducibilityToken.masterSeed).toBe(result2.reproducibilityToken.masterSeed);
  });
});

/**
 * Test quality metrics
 */
describe('DeepTutor Data Pipeline — Quality Metrics', () => {
  it('computes quality metrics for pipeline run', async () => {
    const input: DeepTutorInput = {
      systemState: mockDeepTutorSystemState(),
      dataQualityCertificate: mockDataQualityCertificate(),
    };

    const pipeline = new DeepTutorDataPipeline();
    const result = await pipeline.execute(input);
    const metrics = pipeline.computeQualityMetrics(input, result);

    expect(metrics.dataCompleteness).toBeGreaterThan(0);
    expect(metrics.dataCompleteness).toBeLessThanOrEqual(100);
    expect(metrics.dataConsistency).toBe(true);
    expect(metrics.transformationFidelity).toBeGreaterThan(0);
    expect(metrics.z3ReadinessScore).toBeGreaterThanOrEqual(0);
  });
});
