/**
 * QUBO (Quadratic Unconstrained Binary Optimization) Builder
 *
 * Converts task assignment constraints into QUBO formulation.
 * Pure mathematical abstraction - works with any QUBO solver (Ising, D-Wave, annealing, etc.)
 *
 * Determinism: Same input tasks + agents → same QUBO matrix (bit-for-bit identical)
 */

import type { Task, AgentCapacity } from '@/lib/dsg/multi-agent/types';
import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';

export interface QUBOVariable {
  id: string;
  type: 'assignment' | 'slack';
  taskId?: string;
  agentId?: number;
}

export interface QUBOMatrix {
  /** Symmetric Q matrix: Q[i][j] coefficient for x_i * x_j */
  Q: number[][];

  /** Linear coefficients: c[i] for x_i */
  linear: number[];

  /** Constant offset */
  constant: number;

  /** Variable ordering (for interpretation) */
  variables: QUBOVariable[];

  /** Mapping from variable name to index */
  variableMap: Map<string, number>;

  /** Problem fingerprint (for caching / determinism verification) */
  problemHash: string;

  /** Number of binary variables */
  numVariables: number;

  /** Number of constraints encoded as penalties */
  numConstraints: number;
}

export interface QUBOBuildRequest {
  tasks: Task[];
  agentCapacities: AgentCapacity[];

  /** Penalty weight for capacity constraint violations */
  capacityPenalty?: number;

  /** Penalty weight for ensuring each task is assigned to exactly one agent */
  assignmentPenalty?: number;
}

export interface QUBOBuildResult {
  qubo: QUBOMatrix;
  varCount: number;
  constraintCount: number;
  buildTimeMs: number;
}

/**
 * Build QUBO matrix from task assignment problem.
 *
 * Variables:
 *   x[i,a] = 1 if task i assigned to agent a, 0 otherwise
 *   (flattened to x[i*numAgents + a])
 *
 * Objective: minimize 0 (we only care about feasibility)
 *
 * Constraints (encoded as penalty terms):
 *   1. Each task assigned to exactly 1 agent: sum_a x[i,a] = 1
 *   2. Agent capacity: sum_i x[i,a] <= capacity[a]
 *
 * Penalty encoding:
 *   - Assignment penalty: λ * (sum_a x[i,a] - 1)^2
 *   - Capacity penalty: μ * max(0, sum_i x[i,a] - capacity[a])^2
 */
export async function buildQUBOMatrix(req: QUBOBuildRequest): Promise<QUBOBuildResult> {
  const startTime = Date.now();

  const tasks = [...req.tasks].sort((a, b) => a.id.localeCompare(b.id));
  const agents = [...req.agentCapacities].sort((a, b) => a.agentId - b.agentId);

  const numTasks = tasks.length;
  const numAgents = agents.length;
  const numVars = numTasks * numAgents;

  // Penalty weights
  const CAPACITY_PENALTY = req.capacityPenalty ?? 1000;
  const ASSIGNMENT_PENALTY = req.assignmentPenalty ?? 1000;

  // Initialize QUBO matrix
  const Q: number[][] = Array(numVars)
    .fill(null)
    .map(() => Array(numVars).fill(0));

  const linear: number[] = Array(numVars).fill(0);
  let constant = 0;

  // Variable naming and mapping
  const variables: QUBOVariable[] = [];
  const variableMap = new Map<string, number>();

  for (let i = 0; i < numTasks; i++) {
    for (let a = 0; a < numAgents; a++) {
      const varIdx = i * numAgents + a;
      const varId = `task_${tasks[i].id}_agent_${agents[a].agentId}`;

      variables.push({
        id: varId,
        type: 'assignment',
        taskId: tasks[i].id,
        agentId: agents[a].agentId,
      });

      variableMap.set(varId, varIdx);
    }
  }

  // Constraint 1: Each task assigned to exactly one agent
  // Penalty: λ * (sum_a x[i,a] - 1)^2
  // = λ * (sum_a x[i,a])^2 - 2λ * sum_a x[i,a] + λ
  //
  // Expanding (sum_a x[i,a])^2 = sum_a x[i,a]^2 + sum_{a!=a'} x[i,a]*x[i,a']
  //
  // Since x[i,a] is binary: x[i,a]^2 = x[i,a]
  // So: (sum_a x[i,a])^2 = sum_a x[i,a] + sum_{a<a'} 2*x[i,a]*x[i,a']

  for (let i = 0; i < numTasks; i++) {
    // Quadratic terms: 2*x[i,a]*x[i,a'] for all pairs a < a'
    for (let a = 0; a < numAgents; a++) {
      for (let ap = a + 1; ap < numAgents; ap++) {
        const idx1 = i * numAgents + a;
        const idx2 = i * numAgents + ap;
        Q[idx1][idx2] += 2 * ASSIGNMENT_PENALTY;
      }
    }

    // Linear terms: (λ - 2λ) * x[i,a] = -λ * x[i,a]
    for (let a = 0; a < numAgents; a++) {
      const idx = i * numAgents + a;
      linear[idx] -= ASSIGNMENT_PENALTY;
    }

    // Constant: +λ
    constant += ASSIGNMENT_PENALTY;
  }

  // Constraint 2: Agent capacity
  // sum_i x[i,a] <= cap[a]
  //
  // Penalty: μ * max(0, sum_i x[i,a] - cap[a])^2
  //
  // For small violations, approximate: μ * (sum_i x[i,a])^2 - 2μ*cap[a] * sum_i x[i,a] + μ*cap[a]^2
  // (This is loose for large violations, but works well for feasible regions)

  for (let a = 0; a < numAgents; a++) {
    const capacity = agents[a].maxTotalTasks;

    // Quadratic terms: x[i,a]*x[j,a] for i < j
    for (let i = 0; i < numTasks; i++) {
      for (let j = i + 1; j < numTasks; j++) {
        const idx1 = i * numAgents + a;
        const idx2 = j * numAgents + a;
        Q[idx1][idx2] += 2 * CAPACITY_PENALTY;
      }
    }

    // Linear terms: (2*capacity - 2*capacity)*x[i,a] cancels... wait, let me recalculate
    // μ * (sum_i x[i,a])^2 expands to:
    // = μ * [sum_i x[i,a]^2 + sum_{i!=j} x[i,a]*x[j,a]]
    // = μ * [sum_i x[i,a] + 2*sum_{i<j} x[i,a]*x[j,a]]
    // Linear: μ * x[i,a]
    // Quadratic: 2μ * x[i,a]*x[j,a] for i<j

    // Linear terms: μ*x[i,a] - 2*μ*cap[a]*x[i,a] = (μ - 2μ*cap[a])*x[i,a]
    for (let i = 0; i < numTasks; i++) {
      const idx = i * numAgents + a;
      linear[idx] += CAPACITY_PENALTY - 2 * CAPACITY_PENALTY * capacity;
    }

    // Constant: μ*cap[a]^2
    constant += CAPACITY_PENALTY * capacity * capacity;
  }

  // Ensure matrix is symmetric
  for (let i = 0; i < numVars; i++) {
    for (let j = i + 1; j < numVars; j++) {
      Q[j][i] = Q[i][j];
    }
  }

  // Compute problem hash for determinism + caching
  const problemData = {
    numTasks,
    numAgents,
    taskIds: tasks.map(t => t.id),
    agentIds: agents.map(a => a.agentId),
    capacities: agents.map(a => a.maxTotalTasks),
  };

  const problemHash = await sha256Json(problemData);

  const result: QUBOMatrix = {
    Q,
    linear,
    constant,
    variables,
    variableMap,
    problemHash,
    numVariables: numVars,
    numConstraints: numTasks + numAgents, // assignment + capacity constraints
  };

  return {
    qubo: result,
    varCount: numVars,
    constraintCount: numTasks + numAgents,
    buildTimeMs: Date.now() - startTime,
  };
}

/**
 * Extract binary solution from QUBO result.
 * Maps binary assignment vector back to task→agent assignments.
 */
export function extractAssignmentFromQUBO(
  qubo: QUBOMatrix,
  solution: Record<string, number | boolean>,
): Record<string, number> {
  const assignment: Record<string, number> = {};

  for (const [varId, value] of Object.entries(solution)) {
    if (value === 1 || value === true) {
      const varIdx = qubo.variableMap.get(varId);
      if (varIdx !== undefined) {
        const variable = qubo.variables[varIdx];
        if (variable.type === 'assignment' && variable.taskId) {
          assignment[variable.taskId] = variable.agentId!;
        }
      }
    }
  }

  return assignment;
}

/**
 * Calculate QUBO objective energy for a given solution.
 * Energy = x^T * Q * x + c^T * x + constant
 */
export function calculateQUBOEnergy(qubo: QUBOMatrix, solution: Record<string, number | boolean>): number {
  // Convert solution to binary vector
  const x: number[] = Array(qubo.numVariables).fill(0);
  for (const [varId, value] of Object.entries(solution)) {
    const idx = qubo.variableMap.get(varId);
    if (idx !== undefined && (value === 1 || value === true)) {
      x[idx] = 1;
    }
  }

  // x^T * Q * x
  let quadraticTerm = 0;
  for (let i = 0; i < qubo.numVariables; i++) {
    for (let j = 0; j < qubo.numVariables; j++) {
      quadraticTerm += x[i] * qubo.Q[i][j] * x[j];
    }
  }

  // c^T * x
  let linearTerm = 0;
  for (let i = 0; i < qubo.numVariables; i++) {
    linearTerm += qubo.linear[i] * x[i];
  }

  return quadraticTerm + linearTerm + qubo.constant;
}
