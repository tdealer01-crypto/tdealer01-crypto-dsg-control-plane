import { solveQubo } from './annealer';
import type { AnnealConfig, QuboProblem, QuboSolution } from './types';

export interface WhatIfScenario {
  id: string;
  /** Shift applied to every `budget_cap` constraint, e.g. -300 or +500. */
  budgetDelta: number;
  description?: string;
}

export interface WhatIfOutcome {
  scenarioId: string;
  budgetDelta: number;
  description?: string;
  solution: QuboSolution;
  /** Controls selected here but not in the baseline. */
  added: string[];
  /** Controls selected in the baseline but not here. */
  removed: string[];
  /** Count of controls whose selection differs from the baseline. */
  ruleDivergence: number;
  deltaCost: number;
  deltaRiskReduction: number;
  deltaValue: number;
  feasibilityChanged: boolean;
}

export interface WhatIfReport {
  baseline: QuboSolution;
  outcomes: WhatIfOutcome[];
}

function shiftBudgets(problem: QuboProblem, delta: number): QuboProblem {
  return {
    ...problem,
    constraints: problem.constraints.map((constraint) =>
      constraint.kind === 'budget_cap'
        ? { ...constraint, budget: Math.max(0, constraint.budget + delta) }
        : constraint,
    ),
  };
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * Counterfactual variance analysis over budget shifts.
 *
 * Every scenario is solved with the same seed as the baseline, so a difference
 * in the selected set is attributable to the budget shift rather than to a
 * different random trajectory.
 */
export function runWhatIf(
  problem: QuboProblem,
  scenarios: WhatIfScenario[],
  config: AnnealConfig = {},
): WhatIfReport {
  const baseline = solveQubo(problem, config);
  const baselineSet = new Set(baseline.selected);

  const outcomes = scenarios.map((scenario) => {
    const solution = solveQubo(shiftBudgets(problem, scenario.budgetDelta), config);
    const scenarioSet = new Set(solution.selected);
    const added = solution.selected.filter((id) => !baselineSet.has(id));
    const removed = baseline.selected.filter((id) => !scenarioSet.has(id));
    return {
      scenarioId: scenario.id,
      budgetDelta: scenario.budgetDelta,
      description: scenario.description,
      solution,
      added,
      removed,
      ruleDivergence: added.length + removed.length,
      deltaCost: round(solution.totalCost - baseline.totalCost),
      deltaRiskReduction: round(solution.totalRiskReduction - baseline.totalRiskReduction),
      deltaValue: round(solution.totalValue - baseline.totalValue),
      feasibilityChanged: solution.feasible !== baseline.feasible,
    };
  });

  return { baseline, outcomes };
}
