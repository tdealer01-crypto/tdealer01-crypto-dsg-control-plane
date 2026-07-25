/**
 * Acceleration Configuration for DeepTutor Z3 Simulation
 *
 * Enables:
 * - Time dilation (100x simulation speedup)
 * - Parallel agent execution
 * - Batch constraint solving
 * - Optimized Z3 solver batching
 * - GPU acceleration readiness
 *
 * Allows testing of AGI system behavior at dramatically accelerated timescales
 */

import type { SimulationConfig } from '../../spine/types';

/**
 * Time acceleration configuration
 */
export interface TimeAccelerationConfig {
  enabled: boolean;
  dilationFactor: number; // 1-1000x speedup
  realTimeMs: number; // real time per simulation tick
  tickDurationMs: number; // simulated time per tick (realTimeMs / dilationFactor)
  accelerationMethod: 'adaptive' | 'fixed' | 'hybrid';
}

/**
 * Parallel execution configuration
 */
export interface ParallelExecutionConfig {
  enabled: boolean;
  maxParallelAgents: number;
  maxWorkerThreads: number;
  batchSize: number;
  queueStrategy: 'fifo' | 'priority' | 'adaptive-priority';
  loadBalanceStrategy: 'round-robin' | 'least-loaded' | 'affinity';
  enableGPUBatching: boolean;
}

/**
 * Z3 solver acceleration configuration
 */
export interface Z3AccelerationConfig {
  enabled: boolean;
  solverMode: 'sequential' | 'batch' | 'parallel-batch' | 'gpu-batch';
  batchSize: number; // constraints per batch
  timeoutPerConstraintMs: number;
  cacheProofs: boolean;
  enableIncremental: boolean; // incremental solving
  parallelStrategies: number; // try N different solving strategies in parallel
}

/**
 * Complete acceleration configuration
 */
export interface AccelerationConfiguration {
  timeAcceleration: TimeAccelerationConfig;
  parallelExecution: ParallelExecutionConfig;
  z3Acceleration: Z3AccelerationConfig;
  resourceLimits: {
    maxMemoryMB: number;
    maxCpuCores: number;
    maxGpuMemoryMB: number;
  };
  monitoringInterval: number; // ms between performance checks
  adaptiveThresholds: {
    cpuUtilization: number; // % before reducing parallelism
    memoryUtilization: number; // % before reducing batch size
  };
}

/**
 * Acceleration performance metrics
 */
export interface AccelerationMetrics {
  wallClockTimeMs: number;
  simulatedTimeMs: number;
  effectiveDilationFactor: number;
  parallelEfficiency: number; // 0-1: actual speedup / theoretical max
  z3ThroughputConstraintsPerSec: number;
  gpuUtilization: number; // percentage
  workerPoolUtilization: number; // percentage
  cacheHitRate: number; // proof cache hits
}

/**
 * Default acceleration presets
 */
export const ACCELERATION_PRESETS = {
  none: (): AccelerationConfiguration => ({
    timeAcceleration: {
      enabled: false,
      dilationFactor: 1,
      realTimeMs: 1000,
      tickDurationMs: 1000,
      accelerationMethod: 'fixed',
    },
    parallelExecution: {
      enabled: false,
      maxParallelAgents: 1,
      maxWorkerThreads: 1,
      batchSize: 1,
      queueStrategy: 'fifo',
      loadBalanceStrategy: 'round-robin',
      enableGPUBatching: false,
    },
    z3Acceleration: {
      enabled: false,
      solverMode: 'sequential',
      batchSize: 1,
      timeoutPerConstraintMs: 30000,
      cacheProofs: false,
      enableIncremental: false,
      parallelStrategies: 1,
    },
    resourceLimits: {
      maxMemoryMB: 4096,
      maxCpuCores: 4,
      maxGpuMemoryMB: 0,
    },
    monitoringInterval: 5000,
    adaptiveThresholds: {
      cpuUtilization: 85,
      memoryUtilization: 80,
    },
  }),

  moderate: (): AccelerationConfiguration => ({
    timeAcceleration: {
      enabled: true,
      dilationFactor: 10,
      realTimeMs: 1000,
      tickDurationMs: 100,
      accelerationMethod: 'fixed',
    },
    parallelExecution: {
      enabled: true,
      maxParallelAgents: 4,
      maxWorkerThreads: 4,
      batchSize: 5,
      queueStrategy: 'priority',
      loadBalanceStrategy: 'least-loaded',
      enableGPUBatching: false,
    },
    z3Acceleration: {
      enabled: true,
      solverMode: 'batch',
      batchSize: 10,
      timeoutPerConstraintMs: 10000,
      cacheProofs: true,
      enableIncremental: true,
      parallelStrategies: 2,
    },
    resourceLimits: {
      maxMemoryMB: 8192,
      maxCpuCores: 8,
      maxGpuMemoryMB: 0,
    },
    monitoringInterval: 2000,
    adaptiveThresholds: {
      cpuUtilization: 80,
      memoryUtilization: 75,
    },
  }),

  aggressive: (): AccelerationConfiguration => ({
    timeAcceleration: {
      enabled: true,
      dilationFactor: 100,
      realTimeMs: 1000,
      tickDurationMs: 10,
      accelerationMethod: 'adaptive',
    },
    parallelExecution: {
      enabled: true,
      maxParallelAgents: 32,
      maxWorkerThreads: 16,
      batchSize: 50,
      queueStrategy: 'adaptive-priority',
      loadBalanceStrategy: 'affinity',
      enableGPUBatching: true,
    },
    z3Acceleration: {
      enabled: true,
      solverMode: 'parallel-batch',
      batchSize: 100,
      timeoutPerConstraintMs: 2000,
      cacheProofs: true,
      enableIncremental: true,
      parallelStrategies: 8,
    },
    resourceLimits: {
      maxMemoryMB: 32768,
      maxCpuCores: 32,
      maxGpuMemoryMB: 8192,
    },
    monitoringInterval: 500,
    adaptiveThresholds: {
      cpuUtilization: 90,
      memoryUtilization: 85,
    },
  }),

  hpc: (): AccelerationConfiguration => ({
    timeAcceleration: {
      enabled: true,
      dilationFactor: 1000,
      realTimeMs: 1000,
      tickDurationMs: 1,
      accelerationMethod: 'adaptive',
    },
    parallelExecution: {
      enabled: true,
      maxParallelAgents: 256,
      maxWorkerThreads: 64,
      batchSize: 500,
      queueStrategy: 'adaptive-priority',
      loadBalanceStrategy: 'affinity',
      enableGPUBatching: true,
    },
    z3Acceleration: {
      enabled: true,
      solverMode: 'gpu-batch',
      batchSize: 1000,
      timeoutPerConstraintMs: 500,
      cacheProofs: true,
      enableIncremental: true,
      parallelStrategies: 16,
    },
    resourceLimits: {
      maxMemoryMB: 131072,
      maxCpuCores: 128,
      maxGpuMemoryMB: 65536,
    },
    monitoringInterval: 100,
    adaptiveThresholds: {
      cpuUtilization: 95,
      memoryUtilization: 90,
    },
  }),
};

/**
 * Computes effective simulation config from acceleration config
 */
export function applyAccelerationToSimConfig(
  baseConfig: SimulationConfig,
  acceleration: AccelerationConfiguration,
): SimulationConfig {
  return {
    ...baseConfig,
    // Scale population and evolution for parallel execution
    populationSize: Math.min(
      baseConfig.populationSize * Math.ceil(acceleration.parallelExecution.maxParallelAgents / 4),
      1000,
    ),
    evolutionInterval: Math.max(
      1,
      Math.floor(baseConfig.evolutionInterval / Math.sqrt(acceleration.timeAcceleration.dilationFactor)),
    ),
    // More frequent snapshots in accelerated mode
    snapshotInterval: Math.max(
      1,
      Math.floor(baseConfig.snapshotInterval / acceleration.timeAcceleration.dilationFactor),
    ),
  };
}

/**
 * Computes time scaling for accelerated simulation
 */
export function computeTimeScaling(
  realWallClockMs: number,
  acceleration: AccelerationConfiguration,
): {
  simulatedMs: number;
  effectiveDilation: number;
  ticksElapsed: number;
} {
  const ticksElapsed = Math.floor(realWallClockMs / acceleration.timeAcceleration.realTimeMs);
  const simulatedMs = ticksElapsed * acceleration.timeAcceleration.tickDurationMs;
  const effectiveDilation = simulatedMs / realWallClockMs;

  return {
    simulatedMs,
    effectiveDilation,
    ticksElapsed,
  };
}

/**
 * Estimates execution time for accelerated simulation
 */
export function estimateExecutionTime(
  baseEstimateMs: number,
  acceleration: AccelerationConfiguration,
): {
  wallClockEstimateMs: number;
  simulatedTimeMs: number;
  parallelSpeedup: number;
  z3Speedup: number;
  combinedSpeedup: number;
} {
  // Time acceleration speedup
  const timeSpeedup = acceleration.timeAcceleration.dilationFactor;

  // Parallel execution speedup (sublinear due to overhead)
  const parallelSpeedup = Math.sqrt(acceleration.parallelExecution.maxParallelAgents) * 0.8;

  // Z3 solver speedup
  let z3Speedup = 1;
  if (acceleration.z3Acceleration.solverMode === 'batch') {
    z3Speedup = acceleration.z3Acceleration.batchSize * 0.6;
  } else if (acceleration.z3Acceleration.solverMode === 'parallel-batch') {
    z3Speedup = acceleration.z3Acceleration.batchSize * acceleration.z3Acceleration.parallelStrategies * 0.5;
  } else if (acceleration.z3Acceleration.solverMode === 'gpu-batch') {
    z3Speedup = acceleration.z3Acceleration.batchSize * acceleration.z3Acceleration.parallelStrategies * 0.7;
  }

  // Combined speedup (multiplicative, with diminishing returns)
  const combinedSpeedup = timeSpeedup * Math.sqrt(parallelSpeedup * z3Speedup);

  return {
    wallClockEstimateMs: baseEstimateMs / combinedSpeedup,
    simulatedTimeMs: baseEstimateMs,
    parallelSpeedup,
    z3Speedup,
    combinedSpeedup,
  };
}

/**
 * Acceleration manager for controlling simulation speedup
 */
export class AccelerationManager {
  private config: AccelerationConfiguration;
  private metricsHistory: AccelerationMetrics[] = [];

  constructor(config: AccelerationConfiguration) {
    this.config = config;
  }

  /**
   * Adjusts acceleration based on resource utilization
   */
  adaptToResources(cpuUsage: number, memoryUsage: number): AccelerationConfiguration {
    const adapted = { ...this.config };

    // Scale back parallelism if resources constrained
    if (cpuUsage > this.config.adaptiveThresholds.cpuUtilization) {
      adapted.parallelExecution.maxParallelAgents = Math.max(
        1,
        Math.floor(adapted.parallelExecution.maxParallelAgents * 0.8),
      );
      adapted.parallelExecution.batchSize = Math.max(
        1,
        Math.floor(adapted.parallelExecution.batchSize * 0.8),
      );
    }

    if (memoryUsage > this.config.adaptiveThresholds.memoryUtilization) {
      adapted.z3Acceleration.batchSize = Math.max(1, Math.floor(adapted.z3Acceleration.batchSize * 0.7));
      adapted.parallelExecution.maxParallelAgents = Math.max(
        1,
        Math.floor(adapted.parallelExecution.maxParallelAgents * 0.7),
      );
    }

    return adapted;
  }

  /**
   * Records performance metrics
   */
  recordMetrics(metrics: AccelerationMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > 1000) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Computes average acceleration efficiency
   */
  getAverageEfficiency(): number {
    if (this.metricsHistory.length === 0) return 0;
    const sum = this.metricsHistory.reduce((s, m) => s + m.parallelEfficiency, 0);
    return sum / this.metricsHistory.length;
  }

  /**
   * Recommends acceleration preset based on observed performance
   */
  recommendPreset(targetEfficiency: number = 0.7): keyof typeof ACCELERATION_PRESETS {
    const efficiency = this.getAverageEfficiency();

    if (efficiency < 0.4) {
      return 'none'; // too much overhead
    } else if (efficiency < 0.55) {
      return 'moderate';
    } else if (efficiency < 0.8) {
      return 'aggressive';
    } else {
      return 'hpc';
    }
  }
}
