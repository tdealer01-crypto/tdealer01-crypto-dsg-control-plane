import { ScenarioExplorer, Scenario, ContinuousSimulationConfig } from './scenario-explorer';
import { ContingencyPlanner, ContingencyStrategy } from './contingency-planner';
import { Z3ConstraintSet } from '../spine/types';

export interface SimulationRun {
  runId: string;
  scenarios: Scenario[];
  strategy: ContingencyStrategy;
  duration: number;
  timestamp: string;
}

export interface ContinuousSimulationState {
  isRunning: boolean;
  currentRun: SimulationRun | null;
  completedRuns: SimulationRun[];
  failedRuns: Array<{ runId: string; error: string; timestamp: string }>;
  totalRuns: number;
  averageDuration: number;
}

export class ContinuousSimulator {
  private explorer = new ScenarioExplorer();
  private planner = new ContingencyPlanner();
  private config: ContinuousSimulationConfig;
  private state: ContinuousSimulationState;
  private simulationInterval: NodeJS.Timer | null = null;

  constructor(config: Partial<ContinuousSimulationConfig> = {}) {
    this.config = {
      interval: config.interval || 60000, // 1 minute
      maxScenarios: config.maxScenarios || 10,
      explorationDepth: config.explorationDepth || 3,
      probabilityThreshold: config.probabilityThreshold || 0.01,
      timeAcceleration: config.timeAcceleration || 10,
    };

    this.state = {
      isRunning: false,
      currentRun: null,
      completedRuns: [],
      failedRuns: [],
      totalRuns: 0,
      averageDuration: 0,
    };
  }

  async startContinuousSimulation(
    constraints: Z3ConstraintSet,
  ): Promise<void> {
    if (this.state.isRunning) {
      throw new Error('Simulation already running');
    }

    this.state.isRunning = true;
    console.log('🚀 Starting continuous simulation...');

    this.simulationInterval = setInterval(async () => {
      try {
        await this.executeSingleRun(constraints);
      } catch (error) {
        this.recordFailedRun((error as Error).message);
      }
    }, this.config.interval);

    // Execute first run immediately
    await this.executeSingleRun(constraints);
  }

  async stopContinuousSimulation(): Promise<void> {
    if (!this.state.isRunning) {
      throw new Error('Simulation not running');
    }

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval as unknown as number);
      this.simulationInterval = null;
    }

    this.state.isRunning = false;
    console.log('⏹️ Continuous simulation stopped');
  }

  private async executeSingleRun(constraints: Z3ConstraintSet): Promise<void> {
    const runId = `run-${Date.now()}`;
    const startTime = Date.now();

    try {
      console.log(`\n📊 [${runId}] Exploring alternative scenarios...`);

      // Phase 1: Find alternative scenarios
      const scenarios = await this.explorer.findAlternativeScenarios(
        constraints,
        this.config.maxScenarios,
      );

      console.log(`✅ Found ${scenarios.length} scenarios`);

      if (scenarios.length === 0) {
        this.recordFailedRun('No satisfying scenarios found');
        return;
      }

      // Phase 2: Build scenario tree
      console.log('🌳 Building scenario tree...');
      const tree = this.explorer.buildScenarioTree(scenarios);
      console.log(`✅ Tree built with ${tree.totalBranches} branches`);

      // Phase 3: Create contingency plans
      console.log('📋 Creating contingency plans...');
      const strategy = this.planner.buildContingencyPlans(scenarios);
      console.log(`✅ Generated ${strategy.plans.length} contingency plans`);
      console.log(`📈 Coverage: ${(strategy.estimatedCoverage * 100).toFixed(1)}%`);

      // Phase 4: Display scenario statistics
      const stats = this.explorer.getScenarioStatistics();
      console.log('\n📈 Scenario Statistics:');
      console.log(`   Total scenarios: ${stats.totalScenarios}`);
      console.log(`   Avg probability: ${((stats.averageProbability as number) * 100).toFixed(2)}%`);
      console.log(`   Avg confidence: ${((stats.averageConfidence as number) * 100).toFixed(2)}%`);
      const riskDist = stats.riskDistribution as Record<string, number>;
      console.log(`   Risk distribution - Low: ${riskDist.low}, Medium: ${riskDist.medium}, High: ${riskDist.high}`);

      // Record successful run
      const duration = Date.now() - startTime;
      const run: SimulationRun = {
        runId,
        scenarios,
        strategy,
        duration,
        timestamp: new Date().toISOString(),
      };

      this.state.currentRun = run;
      this.state.completedRuns.push(run);
      this.state.totalRuns++;
      this.updateAverageDuration(duration);

      console.log(`\n✨ [${runId}] Simulation completed in ${duration}ms`);

      // Show contingency strategy stats
      const stratStats = this.planner.getStrategyStatistics(strategy.strategyId);
      console.log('\n🛡️ Contingency Strategy:');
      console.log(`   Total plans: ${stratStats.totalPlans}`);
      console.log(`   Coverage: ${stratStats.estimatedCoverage}`);
      console.log(`   Decision branches: ${stratStats.totalDecisionBranches}`);
    } catch (error) {
      this.recordFailedRun((error as Error).message);
    }
  }

  private recordFailedRun(errorMessage: string): void {
    this.state.failedRuns.push({
      runId: `failed-${Date.now()}`,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }

  private updateAverageDuration(newDuration: number): void {
    const totalCompleted = this.state.completedRuns.length;
    this.state.averageDuration =
      (this.state.averageDuration * (totalCompleted - 1) + newDuration) /
      totalCompleted;
  }

  getState(): ContinuousSimulationState {
    return { ...this.state };
  }

  getCurrentRun(): SimulationRun | null {
    return this.state.currentRun;
  }

  getScenarioStatistics(): Record<string, unknown> {
    return this.explorer.getScenarioStatistics();
  }

  getAllScenarios(): Record<string, unknown> {
    return this.explorer.exportScenarios();
  }

  getLatestStrategy(): Record<string, unknown> | null {
    if (this.state.currentRun) {
      return this.planner.exportStrategy(this.state.currentRun.strategy.strategyId);
    }
    return null;
  }

  getSummaryReport(): Record<string, unknown> {
    return {
      simulationState: this.state,
      currentScenarios: this.explorer.getScenarioStatistics(),
      latestStrategy:
        this.state.currentRun?.strategy.strategyId || 'none',
      totalCompleted: this.state.completedRuns.length,
      totalFailed: this.state.failedRuns.length,
      averageDuration: `${this.state.averageDuration.toFixed(2)}ms`,
      successRate:
        this.state.totalRuns > 0
          ? (
              (this.state.completedRuns.length / this.state.totalRuns) *
              100
            ).toFixed(2) + '%'
          : 'N/A',
      timestamp: new Date().toISOString(),
    };
  }

  async runSingleSimulation(constraints: Z3ConstraintSet): Promise<SimulationRun | null> {
    const runId = `single-run-${Date.now()}`;
    const startTime = Date.now();

    try {
      const scenarios = await this.explorer.findAlternativeScenarios(
        constraints,
        this.config.maxScenarios,
      );

      if (scenarios.length === 0) return null;

      const tree = this.explorer.buildScenarioTree(scenarios);
      const strategy = this.planner.buildContingencyPlans(scenarios);

      const duration = Date.now() - startTime;
      const run: SimulationRun = {
        runId,
        scenarios,
        strategy,
        duration,
        timestamp: new Date().toISOString(),
      };

      return run;
    } catch {
      return null;
    }
  }
}
