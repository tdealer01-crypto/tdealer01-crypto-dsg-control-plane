import { ContinuousSimulator, type SimulationRun } from './continuous-simulator';

export interface ProductionSimulatorOptions {
  maxScenarios: number;
  intervalMs: number;
  explorationDepth: number;
  timeAcceleration: number;
  probabilityThreshold: number;
}

const DEFAULTS: ProductionSimulatorOptions = {
  maxScenarios: 10,
  intervalMs: 60000,
  explorationDepth: 3,
  timeAcceleration: 10,
  probabilityThreshold: 0.01,
};

export interface RunRecord {
  runId: string;
  summary: Record<string, unknown>;
  strategy: Record<string, unknown> | null;
  timestamp: string;
}

class SimulationStore {
  private runs: RunRecord[] = [];
  private latestStrategy: RunRecord['strategy'] = null;

  append(record: RunRecord) {
    this.runs.push(record);
    if (record.strategy) this.latestStrategy = record.strategy;
  }

  snapshot() {
    return this.runs.slice(-20);
  }

  getLatestStrategy() {
    return this.latestStrategy;
  }
}

const store = new SimulationStore();

export function createProductionSimulator(
  options: Partial<ProductionSimulatorOptions> = {}
): ContinuousSimulator {
  const merged = { ...DEFAULTS, ...options };
  return new ContinuousSimulator({
    maxScenarios: merged.maxScenarios,
    interval: merged.intervalMs,
    explorationDepth: merged.explorationDepth,
    probabilityThreshold: merged.probabilityThreshold,
    timeAcceleration: merged.timeAcceleration,
  });
}

export function getSimulationStore() {
  return store;
}

export function recordRun(run: SimulationRun) {
  const strategy = (run as any)?.strategy ?? null;
  const exportedStrategy =
    strategy && typeof strategy.exportStrategy === 'function'
      ? strategy.exportStrategy(strategy.strategyId)
      : strategy;

  store.append({
    runId: run.runId,
    summary: {
      totalRuns: (run as any)?.duration ?? null,
      scenarioCount: run.scenarios.length,
      planCount: (exportedStrategy as any)?.statistics?.totalPlans ?? null,
    },
    strategy: (exportedStrategy as RunRecord['strategy']) ?? null,
    timestamp: run.timestamp,
  });
}
