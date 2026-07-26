import { Scenario, ScenarioTree } from './scenario-explorer';

export interface ContingencyPlan {
  scenarioId: string;
  primaryAction: string;
  fallbackActions: string[];
  triggerConditions: Record<string, unknown>;
  timeout: number;
  retryStrategy: 'exponential' | 'linear' | 'none';
  priority: number;
}

export interface ContingencyStrategy {
  strategyId: string;
  scenarioTree: ScenarioTree;
  plans: ContingencyPlan[];
  riskMitigation: Record<string, string>;
  estimatedCoverage: number;
  totalPlans: number;
  timestamp: string;
}

export interface DecisionTree {
  nodeId: string;
  decision: string;
  children: DecisionTree[];
  probability: number;
  depth: number;
  riskScore: number;
}

export class ContingencyPlanner {
  private strategies: Map<string, ContingencyStrategy> = new Map();
  private plans: Map<string, ContingencyPlan[]> = new Map();

  buildContingencyPlans(scenarios: Scenario[]): ContingencyStrategy {
    const strategyId = `strategy-${Date.now()}`;
    const plans: ContingencyPlan[] = [];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      const plan = this.createPlanForScenario(scenario, i);
      plans.push(plan);
    }

    const strategy: ContingencyStrategy = {
      strategyId,
      scenarioTree: this.buildDecisionTreeFromScenarios(scenarios),
      plans,
      riskMitigation: this.buildRiskMitigation(scenarios),
      estimatedCoverage: this.calculateCoverage(plans),
      totalPlans: plans.length,
      timestamp: new Date().toISOString(),
    };

    this.strategies.set(strategyId, strategy);
    this.plans.set(strategyId, plans);

    return strategy;
  }

  private createPlanForScenario(
    scenario: Scenario,
    priority: number,
  ): ContingencyPlan {
    return {
      scenarioId: scenario.id,
      primaryAction: this.selectPrimaryAction(scenario),
      fallbackActions: this.generateFallbackActions(scenario),
      triggerConditions: this.extractTriggerConditions(scenario),
      timeout: this.calculateTimeout(scenario),
      retryStrategy: this.selectRetryStrategy(scenario.riskLevel),
      priority,
    };
  }

  private selectPrimaryAction(scenario: Scenario): string {
    // Primary action based on scenario characteristics
    if (scenario.riskLevel === 'low') return 'APPROVE_FAST';
    if (scenario.riskLevel === 'medium') return 'APPROVE_WITH_REVIEW';
    return 'BLOCK_AND_ESCALATE';
  }

  private generateFallbackActions(scenario: Scenario): string[] {
    const fallbacks: string[] = [];

    if (scenario.riskLevel === 'low') {
      fallbacks.push('APPROVE_WITH_REVIEW');
      fallbacks.push('REQUIRE_AUDIT');
    } else if (scenario.riskLevel === 'medium') {
      fallbacks.push('REQUIRE_ADDITIONAL_VERIFICATION');
      fallbacks.push('ESCALATE_TO_ADMIN');
    } else {
      fallbacks.push('QUEUE_FOR_REVIEW');
      fallbacks.push('DENY_AND_LOG');
    }

    return fallbacks;
  }

  private extractTriggerConditions(
    scenario: Scenario,
  ): Record<string, unknown> {
    // Extract conditions that trigger this plan
    const assignment = scenario.assignments[0];
    if (!assignment) return {};

    return {
      riskLevel: scenario.riskLevel,
      confidence: scenario.confidence,
      model: assignment.model,
    };
  }

  private calculateTimeout(scenario: Scenario): number {
    // Timeout in ms, shorter for high-risk scenarios
    if (scenario.riskLevel === 'high') return 5000;
    if (scenario.riskLevel === 'medium') return 10000;
    return 30000;
  }

  private selectRetryStrategy(riskLevel: string): 'exponential' | 'linear' | 'none' {
    if (riskLevel === 'high') return 'none'; // No retry for high-risk
    if (riskLevel === 'medium') return 'linear';
    return 'exponential';
  }

  private buildDecisionTreeFromScenarios(scenarios: Scenario[]): ScenarioTree {
    // Build scenario tree structure
    return {
      rootId: 'decision-root',
      scenarios,
      branchingFactor: scenarios.length,
      depth: Math.ceil(Math.log2(scenarios.length)) + 1,
      totalBranches: scenarios.reduce(
        (sum, s) => sum + s.alternativeDecisions.length,
        0,
      ),
      explorationTime: 0,
      timestamp: new Date().toISOString(),
    };
  }

  private buildRiskMitigation(scenarios: Scenario[]): Record<string, string> {
    const mitigation: Record<string, string> = {};

    for (const scenario of scenarios) {
      const key = `${scenario.id}-mitigation`;
      mitigation[key] = this.generateMitigationStrategy(scenario.riskLevel);
    }

    return mitigation;
  }

  private generateMitigationStrategy(riskLevel: string): string {
    if (riskLevel === 'high') {
      return 'Implement immediate safeguards, increase monitoring, trigger alerts';
    }
    if (riskLevel === 'medium') {
      return 'Enable standard monitoring, prepare contingency actions';
    }
    return 'Standard operation with periodic reviews';
  }

  private calculateCoverage(plans: ContingencyPlan[]): number {
    // Estimate percentage of scenarios covered by plans
    const validPlans = plans.filter(p => p.primaryAction && p.fallbackActions.length > 0);
    return validPlans.length / Math.max(plans.length, 1);
  }

  buildDecisionTree(scenario: Scenario): DecisionTree {
    const depth = 0;
    return {
      nodeId: `decision-${scenario.id}`,
      decision: this.selectPrimaryAction(scenario),
      children: this.buildChildNodes(scenario, depth),
      probability: scenario.probability,
      depth,
      riskScore: this.calculateRiskScore(scenario),
    };
  }

  private buildChildNodes(scenario: Scenario, depth: number): DecisionTree[] {
    if (depth >= 3) return []; // Limit tree depth

    return scenario.alternativeDecisions.map((decision, index) => ({
      nodeId: `decision-${scenario.id}-${index}`,
      decision,
      children: [],
      probability: scenario.probability / scenario.alternativeDecisions.length,
      depth: depth + 1,
      riskScore: this.calculateRiskScore(scenario),
    }));
  }

  private calculateRiskScore(scenario: Scenario): number {
    const riskMap = { low: 0.2, medium: 0.5, high: 0.9 };
    const baseRisk = riskMap[scenario.riskLevel as keyof typeof riskMap] || 0.5;
    return baseRisk * (1 - scenario.confidence);
  }

  getPlanForScenario(
    strategyId: string,
    scenarioId: string,
  ): ContingencyPlan | null {
    const plans = this.plans.get(strategyId);
    if (!plans) return null;
    return plans.find(p => p.scenarioId === scenarioId) || null;
  }

  getStrategyStatistics(strategyId: string): Record<string, unknown> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return {};

    const plans = strategy.plans;
    const riskDistribution = {
      low: plans.filter(p => this.getPlanRiskLevel(p) === 'low').length,
      medium: plans.filter(p => this.getPlanRiskLevel(p) === 'medium').length,
      high: plans.filter(p => this.getPlanRiskLevel(p) === 'high').length,
    };

    return {
      strategyId,
      totalPlans: strategy.totalPlans,
      estimatedCoverage: (strategy.estimatedCoverage * 100).toFixed(2) + '%',
      totalDecisionBranches: strategy.scenarioTree.totalBranches,
      riskDistribution,
      averagePriority: plans.reduce((sum, p) => sum + p.priority, 0) / plans.length,
      retryStrategies: {
        exponential: plans.filter(p => p.retryStrategy === 'exponential').length,
        linear: plans.filter(p => p.retryStrategy === 'linear').length,
        none: plans.filter(p => p.retryStrategy === 'none').length,
      },
      timestamp: strategy.timestamp,
    };
  }

  private getPlanRiskLevel(plan: ContingencyPlan): string {
    if (plan.primaryAction.includes('BLOCK') || plan.primaryAction.includes('DENY')) {
      return 'high';
    }
    if (plan.primaryAction.includes('REVIEW') || plan.primaryAction.includes('VERIFY')) {
      return 'medium';
    }
    return 'low';
  }

  exportStrategy(strategyId: string): Record<string, unknown> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return {};

    return {
      strategy,
      statistics: this.getStrategyStatistics(strategyId),
      timestamp: new Date().toISOString(),
    };
  }

  exportAllStrategies(): Record<string, unknown> {
    return {
      strategies: Array.from(this.strategies.values()),
      totalStrategies: this.strategies.size,
      timestamp: new Date().toISOString(),
    };
  }
}
