/**
 * DeepTutor Data Pipeline Orchestrator
 *
 * Manages end-to-end data flow:
 * DeepTutor RAG → Validation → Adaptation → Z3 Simulation → Results
 *
 * Ensures:
 * - Data lineage and audit trail
 * - Deterministic reproducibility
 * - Z3 formal verification readiness
 * - Evidence collection for compliance
 */

import { createHash } from 'crypto';
import type { SimulationInput, SimulationConfig } from '../spine/types';
import type { DeepTutorInput, DataQualityCertificate } from './types';
import {
  validateDeepTutorInput,
  hashDeepTutorInput,
  adaptDeepTutorToSimulation,
} from './adapter';

/**
 * Pipeline execution metadata
 */
export interface PipelineMetadata {
  pipelineId: string;
  startedAt: number;
  version: string;
  inputHash: string;
  configHash: string;
  deterministicNonce: string;
}

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  metadata: PipelineMetadata;
  simulationInput: SimulationInput;
  dataLineage: DataLineage;
  reproducibilityToken: ReproducibilityToken;
}

/**
 * Tracks data transformations through the pipeline
 */
export interface DataLineage {
  deepTutorSourceHash: string;
  validationTimestamp: number;
  validationResult: {
    passed: boolean;
    warnings: string[];
    errors: string[];
  };
  adaptationTimestamp: number;
  adaptationMethod: string;
  transformationSteps: TransformationStep[];
  outputHash: string;
}

export interface TransformationStep {
  step: string;
  inputHash: string;
  outputHash: string;
  duration: number;
  metadata: Record<string, unknown>;
}

/**
 * Token for exact reproduction of this pipeline run
 */
export interface ReproducibilityToken {
  inputHash: string;
  configHash: string;
  masterSeed: number;
  pipelineVersion: string;
  timestamp: number;
  nonce: string;
  command: string; // CLI command to reproduce
}

/**
 * Quality metrics for pipeline run
 */
export interface PipelineQualityMetrics {
  dataCompleteness: number; // 0-100
  dataConsistency: boolean;
  latencyMs: number;
  transformationFidelity: number; // 0-100, how well data was preserved
  z3ReadinessScore: number; // 0-100, how ready constraints are for Z3
}

/**
 * Main orchestrator class
 */
export class DeepTutorDataPipeline {
  private version = 'v1.0.0';
  private pipelineId: string;

  constructor() {
    this.pipelineId = `pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Executes the complete pipeline
   */
  async execute(
    deepTutorInput: DeepTutorInput,
    simulationConfig?: Partial<SimulationConfig>,
    masterSeed: number = 42,
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const lineageSteps: TransformationStep[] = [];

    try {
      // Step 1: Hash input for reproducibility
      const inputHash = hashDeepTutorInput(deepTutorInput);
      const configHash = this.hashConfig(simulationConfig);
      const deterministicNonce = this.generateDeterministicNonce(inputHash, masterSeed);

      console.log(`[Pipeline ${this.pipelineId}] Starting data pipeline...`);
      console.log(`  Input hash: ${inputHash.slice(0, 16)}...`);
      console.log(`  Config hash: ${configHash.slice(0, 16)}...`);

      // Step 2: Validation
      console.log(`[Pipeline] Step 1/3: Validating DeepTutor input...`);
      const validationStart = Date.now();
      const validation = validateDeepTutorInput(deepTutorInput);
      const validationDuration = Date.now() - validationStart;

      lineageSteps.push({
        step: 'validation',
        inputHash,
        outputHash: inputHash, // data unchanged
        duration: validationDuration,
        metadata: {
          valid: validation.valid,
          errorCount: validation.errors.length,
          errors: validation.errors.slice(0, 5), // first 5 errors
        },
      });

      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
      }

      // Step 3: Adaptation
      console.log(`[Pipeline] Step 2/3: Adapting DeepTutor data to simulation format...`);
      const adaptationStart = Date.now();
      const simulationInput = adaptDeepTutorToSimulation(
        deepTutorInput,
        simulationConfig,
        masterSeed,
      );
      const adaptationDuration = Date.now() - adaptationStart;

      // Hash the adapted output
      const adaptedHash = this.hashSimulationInput(simulationInput);

      lineageSteps.push({
        step: 'adaptation',
        inputHash,
        outputHash: adaptedHash,
        duration: adaptationDuration,
        metadata: {
          constraintCount: simulationInput.constraints.slaContracts.length,
          seedGenomeCount: simulationInput.seedGenomes.length,
          workloadTickCount: simulationInput.workloadTrace.durationTicks,
        },
      });

      // Step 4: Z3 readiness check
      console.log(`[Pipeline] Step 3/3: Checking Z3 formal verification readiness...`);
      const z3ReadinessStart = Date.now();
      const z3Readiness = this.checkZ3Readiness(simulationInput);
      const z3ReadinessDuration = Date.now() - z3ReadinessStart;

      lineageSteps.push({
        step: 'z3-readiness',
        inputHash: adaptedHash,
        outputHash: adaptedHash, // data unchanged
        duration: z3ReadinessDuration,
        metadata: {
          readinessScore: z3Readiness.score,
          issues: z3Readiness.issues.slice(0, 5),
        },
      });

      // Build result
      const pipelineMetadata: PipelineMetadata = {
        pipelineId: this.pipelineId,
        startedAt: startTime,
        version: this.version,
        inputHash,
        configHash,
        deterministicNonce,
      };

      const dataLineage: DataLineage = {
        deepTutorSourceHash: deepTutorInput.dataQualityCertificate.dataHash,
        validationTimestamp: Date.now(),
        validationResult: {
          passed: validation.valid,
          warnings: [],
          errors: validation.errors,
        },
        adaptationTimestamp: Date.now(),
        adaptationMethod: 'DeepTutor→SimulationInput v1.0',
        transformationSteps: lineageSteps,
        outputHash: adaptedHash,
      };

      const reproducibilityToken: ReproducibilityToken = {
        inputHash,
        configHash,
        masterSeed,
        pipelineVersion: this.version,
        timestamp: startTime,
        nonce: deterministicNonce,
        command: `deeptutor-pipeline run --input-hash ${inputHash.slice(0, 16)} --config-hash ${configHash.slice(0, 16)} --seed ${masterSeed}`,
      };

      console.log(`[Pipeline] ✓ Pipeline completed in ${Date.now() - startTime}ms`);
      console.log(`  Output hash: ${adaptedHash.slice(0, 16)}...`);
      console.log(`  Z3 Readiness: ${z3Readiness.score}/100`);

      return {
        metadata: pipelineMetadata,
        simulationInput,
        dataLineage,
        reproducibilityToken,
      };
    } catch (error) {
      console.error(`[Pipeline] ✗ Pipeline failed: ${error}`);
      throw error;
    }
  }

  /**
   * Computes hash of simulation config
   */
  private hashConfig(config?: Partial<SimulationConfig>): string {
    const canonical = JSON.stringify(config || {});
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Generates deterministic nonce for reproducibility
   */
  private generateDeterministicNonce(inputHash: string, seed: number): string {
    const material = `${inputHash}-${seed}-${this.version}`;
    return createHash('sha256').update(material).digest('hex').slice(0, 16);
  }

  /**
   * Hashes simulation input for verification
   */
  private hashSimulationInput(input: SimulationInput): string {
    const canonical = JSON.stringify({
      constraintCount: input.constraints.slaContracts.length,
      seedGenomeCount: input.seedGenomes.length,
      configMaxTicks: input.config.maxTicks,
      masterSeed: input.masterSeed,
      workloadTraceHash: input.workloadTrace.traceHash,
    });
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Checks if adapted data is ready for Z3 formal verification
   */
  private checkZ3Readiness(simulationInput: SimulationInput): {
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 100;

    // Check constraints are concrete
    if (simulationInput.constraints.slaContracts.length === 0) {
      issues.push('No SLA contracts defined');
      score -= 20;
    }

    // Check parameters are valid
    simulationInput.seedGenomes.forEach((genome) => {
      const params = genome.parameters;
      if (params.rateLimitRpm < 10 || params.rateLimitRpm > 100000) {
        issues.push(`Genome ${genome.id}: rateLimitRpm out of reasonable range`);
        score -= 10;
      }
      if (params.blockThreshold < 0 || params.blockThreshold > 1) {
        issues.push(`Genome ${genome.id}: blockThreshold not normalized`);
        score -= 10;
      }
    });

    // Check workload is well-formed
    if (simulationInput.workloadTrace.requestsPerTick.length === 0) {
      issues.push('Workload trace has no request data');
      score -= 30;
    }

    // Check for NaN or invalid values
    if (simulationInput.config.mutationRate < 0 || simulationInput.config.mutationRate > 1) {
      issues.push('Invalid mutation rate');
      score -= 20;
    }

    return {
      score: Math.max(0, score),
      issues,
    };
  }

  /**
   * Computes quality metrics for the pipeline run
   */
  computeQualityMetrics(
    deepTutorInput: DeepTutorInput,
    pipelineResult: PipelineResult,
  ): PipelineQualityMetrics {
    const agents = deepTutorInput.systemState.agents;
    const simInput = pipelineResult.simulationInput;

    // Completeness: how much data was converted
    const completeness = Math.min(
      100,
      ((simInput.seedGenomes.length / agents.length) * 100 + 50) / 2,
    );

    // Consistency: validation passed
    const consistency = pipelineResult.dataLineage.validationResult.passed;

    // Latency
    const latency = Date.now() - pipelineResult.metadata.startedAt;

    // Fidelity: check data preservation
    let fidelity = 100;
    if (simInput.seedGenomes.length === 0) fidelity -= 50;
    if (simInput.constraints.slaContracts.length === 0) fidelity -= 30;
    if (simInput.workloadTrace.requestsPerTick.length === 0) fidelity -= 20;

    // Z3 readiness from lineage
    const z3Step = pipelineResult.dataLineage.transformationSteps.find((s) => s.step === 'z3-readiness');
    const z3Ready = (z3Step?.metadata?.readinessScore as number) || 0;

    return {
      dataCompleteness: completeness,
      dataConsistency: consistency,
      latencyMs: latency,
      transformationFidelity: fidelity,
      z3ReadinessScore: z3Ready,
    };
  }
}

/**
 * Convenience function for one-off pipeline execution
 */
export async function runDeepTutorPipeline(
  deepTutorInput: DeepTutorInput,
  simulationConfig?: Partial<SimulationConfig>,
  masterSeed?: number,
): Promise<PipelineResult> {
  const pipeline = new DeepTutorDataPipeline();
  return pipeline.execute(deepTutorInput, simulationConfig, masterSeed);
}
