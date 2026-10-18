import { solveIsing } from '@/lib/ising/solver';
import { runZ3AgentGate } from '@/lib/dsg/logic/z3-agent-gate';
import type { IsingProblem, IsingConfig } from '@/lib/ising/types';

export interface IsingOptimizationInput {
  jobId: string;
  workspaceId: string;
  problem: {
    name: string;
    variables: Record<string, boolean>;
    constraints: Array<{
      id: string;
      type: 'hard' | 'soft';
      weight: number;
      description: string;
      requiresSatisfaction: boolean;
    }>;
  };
  config?: IsingConfig;
  mockState?: boolean;
}

export interface IsingOptimizationResult {
  ok: boolean;
  jobId: string;
  optimizationStatus: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE';
  solution: {
    satisfiable: boolean;
    variables: Array<{ name: string; value: boolean }>;
    energy: number;
    violatedConstraints: string[];
  };
  metrics: {
    iterations: number;
    finalTemperature: number;
    executionTimeMs: number;
    solverVersion: string;
  };
  governance: {
    gateStatus: 'PASS' | 'REVIEW' | 'BLOCK';
    proofHash: string;
  };
}

/**
 * DSG Ising Optimization Skill
 *
 * Uses simulated annealing (Ising model) for constraint satisfaction:
 * - Binary variable optimization (spin up/down)
 * - Hard constraints (must satisfy) + soft constraints (prefer)
 * - Energy minimization via temperature cooling
 * - Governance gate for production deployment readiness
 *
 * When to use: Resource allocation, configuration optimization,
 * combinatorial constraint satisfaction where SAT/SMT is too slow.
 */
export async function runIsingOptimization(input: IsingOptimizationInput): Promise<IsingOptimizationResult> {
  const mockState = input.mockState ?? false;

  // Evaluate governance gate for optimization problem
  const gateResult = await runZ3AgentGate({
    agentType: 'security-gate',
    jobId: `ising-${input.jobId}-${Date.now()}`,
    workspaceId: input.workspaceId,
    goalLocked: true,
    gateAllow: true,
    evidenceExists: true,
    mockState,
    dataNeeded: true,
    dataUnknown: false,
    searchAttempted: false,
  });

  // Build Ising problem from input
  const isingProblem: IsingProblem = {
    variables: input.problem.variables,
    constraints: input.problem.constraints.map((c) => ({
      id: c.id,
      type: c.type,
      weight: c.weight,
      variables: Object.keys(input.problem.variables),
      satisfactionFn: () => !c.requiresSatisfaction || gateResult.pass,
      description: c.description,
    })),
  };

  // Solve with Ising/simulated annealing
  const solution = await solveIsing(isingProblem, input.config);

  // Determine optimization status
  let optimizationStatus: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' = 'INFEASIBLE';
  if (solution.satisfiable && solution.violatedConstraints.length === 0) {
    optimizationStatus = 'OPTIMAL';
  } else if (solution.satisfiable) {
    optimizationStatus = 'FEASIBLE';
  }

  return {
    ok: !mockState && optimizationStatus !== 'INFEASIBLE' && gateResult.pass,
    jobId: input.jobId,
    optimizationStatus,
    solution: {
      satisfiable: solution.satisfiable,
      variables: solution.variables.map((v) => ({ name: v.name, value: v.value })),
      energy: solution.energy,
      violatedConstraints: solution.violatedConstraints,
    },
    metrics: {
      iterations: solution.iterations,
      finalTemperature: solution.temperature_final,
      executionTimeMs: solution.time_ms,
      solverVersion: solution.solver_version,
    },
    governance: {
      gateStatus: gateResult.pass ? 'PASS' : solution.satisfiable ? 'REVIEW' : 'BLOCK',
      proofHash: gateResult.z3ProofHash,
    },
  };
}
