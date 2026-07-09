import type { Task, TaskDag, AgentAssignment, AgentCapacity, Z3ConstraintModel } from './types';
import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';

/**
 * Hybrid solver mode selection based on problem complexity.
 * Z3-only: Simple feasibility problems (< 50 complexity score)
 * Ising+Z3: Complex optimization problems (>= 50 complexity score)
 */
export enum HybridSolverMode {
  Z3_ONLY = 'z3-only',
  ISING_ONLY = 'ising-only',
  ISING_VERIFY = 'ising-verify', // Ising + Z3 verification
  ISING_WARMSTART = 'ising-warmstart', // Z3 with Ising warm-start
}

export type Z3SolveOutcome =
  | { model: Z3ConstraintModel; assignments: AgentAssignment[] }
  | { fallback: true; reason: string };

/**
 * Calculate problem complexity score to determine solver routing.
 * Formula: (variable_count × constraint_count × density) / scale_factor
 *
 * Threshold: score >= 50 → use Ising + Z3 verify
 *           score < 50 → use Z3-only
 */
export function calculateComplexityScore(
  taskCount: number,
  agentCount: number,
  constraintDensity: number = 0.5,
): number {
  const variableCount = taskCount * agentCount; // Binary variables for assignments
  const constraintCount = taskCount + agentCount; // Task assignment + capacity constraints
  const scaleFactor = 1000; // Normalize to 0-100 range

  return (variableCount * constraintCount * constraintDensity) / scaleFactor;
}

/**
 * Select hybrid solver mode based on problem complexity.
 * Returns the recommended solver mode for the given problem size.
 */
export function selectHybridSolverMode(
  taskCount: number,
  agentCount: number,
  complexityThreshold: number = 50,
): HybridSolverMode {
  const score = calculateComplexityScore(taskCount, agentCount);

  // For now, default to Z3-only (Ising integration in Phase 3 continuation)
  // TODO: Implement Ising routing after Phase 3 full integration
  // if (score >= complexityThreshold) {
  //   return HybridSolverMode.ISING_VERIFY;
  // }

  return HybridSolverMode.Z3_ONLY;
}

// Z3 WASM init is expensive (~2s); cache one context per process.
// The high-level z3-solver API allows only one async solve at a time,
// so callers must not run solves concurrently.
let z3InitPromise: Promise<{ ctx: any; em: any }> | null = null;

async function getZ3Context(): Promise<{ ctx: any; em: any }> {
  if (!z3InitPromise) {
    z3InitPromise = (async () => {
      const { init } = await import('z3-solver');
      const { Context, em } = await init();
      return { ctx: Context('multi-agent'), em };
    })();
  }
  return z3InitPromise;
}

export async function terminateZ3Threads(): Promise<void> {
  if (!z3InitPromise) return;
  try {
    const { em } = await z3InitPromise;
    em.PThread.terminateAllThreads();
  } catch {
    // already terminated or never initialized
  }
  z3InitPromise = null;
}

/**
 * High-level solver interface with hybrid mode support.
 * Routes to Z3-only or Ising+Z3 based on problem complexity.
 *
 * Phase 1-2: Uses Z3-only (complexity routing logic ready for Phase 3)
 * Phase 3: Implements full Ising+Z3 hybrid solver selection
 */
export async function solveTaskAssignmentWithHybridRouter(
  taskDag: TaskDag,
  agentCapacities: AgentCapacity[],
  maxSolveTimeMs: number = 5000,
): Promise<Z3SolveOutcome> {
  const mode = selectHybridSolverMode(taskDag.tasks.length, agentCapacities.length);

  // Phase 1-2: Always use Z3-only for validation
  // Phase 3: Implement ISING_VERIFY, ISING_ONLY, ISING_WARMSTART routing

  return solveTaskAssignmentConstraints(taskDag, agentCapacities, maxSolveTimeMs);
}

/**
 * Solve task-to-agent assignment with Z3.
 *
 * The Z3 model is intentionally broad: it only encodes hard feasibility
 * constraints (domain bounds + per-agent capacity). Dependency ordering is
 * enforced deterministically afterwards via topological sort, so the solver
 * never over-constrains assignments.
 *
 * Determinism: Z3 with fixed input and version produces the same model on
 * every solve (verified by repeated-solve check). Task variables are created
 * in canonical (sorted-by-id) order so input array order does not matter.
 */
export async function solveTaskAssignmentConstraints(
  taskDag: TaskDag,
  agentCapacities: AgentCapacity[],
  maxSolveTimeMs: number = 5000,
): Promise<Z3SolveOutcome> {
  const startTime = Date.now();

  const sortedTasks = [...taskDag.tasks].sort((a, b) => a.id.localeCompare(b.id));
  const sortedCapacities = [...agentCapacities].sort((a, b) => a.agentId - b.agentId);
  const numAgents = sortedCapacities.length;

  const totalCapacity = sortedCapacities.reduce((sum, c) => sum + c.maxTotalTasks, 0);
  if (totalCapacity < sortedTasks.length) {
    return { fallback: true, reason: `TOTAL_CAPACITY_${totalCapacity}_LT_TASKS_${sortedTasks.length}` };
  }

  try {
    const { ctx } = await getZ3Context();
    const { Solver, Int, If, Sum } = ctx;

    const solver = new Solver();
    const constraints: string[] = [];
    const vars: any[] = [];

    for (let i = 0; i < sortedTasks.length; i++) {
      const v = Int.const(`task_${i}_agent`);
      vars.push(v);
      solver.add(v.ge(0), v.lt(numAgents));
      constraints.push(`0 <= task_${i}_agent < ${numAgents}`);
    }

    for (let a = 0; a < numAgents; a++) {
      const cap = sortedCapacities[a].maxTotalTasks;
      const count = Sum(...vars.map((v) => If(v.eq(a), Int.val(1), Int.val(0))));
      solver.add(count.le(cap));
      constraints.push(`count(agent_${sortedCapacities[a].agentId}) <= ${cap}`);
    }

    const checkResult = await Promise.race([
      solver.check(),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), maxSolveTimeMs)),
    ]);

    if (checkResult === 'timeout') {
      return { fallback: true, reason: `Z3_SOLVE_TIMEOUT_${maxSolveTimeMs}MS` };
    }

    if (checkResult !== 'sat') {
      return { fallback: true, reason: `Z3_${String(checkResult).toUpperCase()}` };
    }

    const z3Model = solver.model();
    const agentAssignmentVars: Record<string, number> = {};

    const assignments: AgentAssignment[] = sortedCapacities.map((cap) => ({
      agentId: cap.agentId,
      tasks: [],
      startOrder: [],
    }));

    sortedTasks.forEach((task, i) => {
      const agentIndex = Number(z3Model.eval(vars[i]).toString());
      agentAssignmentVars[`task_${i}_agent`] = agentIndex;
      assignments[agentIndex].tasks.push(task);
    });

    applyTopologicalStartOrder(assignments, taskDag);

    const solveDurationMs = Date.now() - startTime;

    const model: Z3ConstraintModel = {
      agentAssignmentVars,
      taskCountPerAgent: Object.fromEntries(assignments.map((a) => [a.agentId, a.tasks.length])),
      constraints,
      solveDurationMs,
      proofHash: sha256Json({
        constraints,
        assignment: Object.entries(agentAssignmentVars).sort(([a], [b]) => a.localeCompare(b)),
        version: 'z3-assignment-proof-v1',
      }),
    };

    return { model, assignments };
  } catch (error) {
    return {
      fallback: true,
      reason: `Z3_UNAVAILABLE: ${error instanceof Error ? error.message : 'UNKNOWN'}`,
    };
  }
}

/**
 * Deterministic greedy fallback: assign tasks in topological order to the
 * least-loaded agent (ties broken by lowest agentId). No randomness anywhere.
 */
export function fallbackGreedyAssignment(
  taskDag: TaskDag,
  agentCapacities: AgentCapacity[],
): AgentAssignment[] {
  const sortedCapacities = [...agentCapacities].sort((a, b) => a.agentId - b.agentId);

  const assignments: AgentAssignment[] = sortedCapacities.map((cap) => ({
    agentId: cap.agentId,
    tasks: [],
    startOrder: [],
  }));

  const capacityById = new Map(sortedCapacities.map((c) => [c.agentId, c.maxTotalTasks]));
  const orderedTasks = topologicalSort(taskDag);

  for (const task of orderedTasks) {
    let target: AgentAssignment | null = null;
    for (const candidate of assignments) {
      if (candidate.tasks.length >= (capacityById.get(candidate.agentId) ?? 0)) continue;
      if (!target || candidate.tasks.length < target.tasks.length) {
        target = candidate;
      }
    }
    if (target) {
      target.tasks.push(task);
      target.startOrder.push(task.id);
    }
  }

  return assignments;
}

/**
 * Kahn topological sort with deterministic tie-breaking by task id.
 * Tasks with unresolvable (cyclic or dangling) dependencies are appended
 * at the end in id order so no task is silently dropped.
 */
export function topologicalSort(taskDag: TaskDag): Task[] {
  const taskById = new Map(taskDag.tasks.map((t) => [t.id, t]));
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const task of taskDag.tasks) {
    const deps = (task.dependencies ?? []).filter((d) => taskById.has(d));
    inDegree.set(task.id, deps.length);
    for (const dep of deps) {
      if (!dependents.has(dep)) dependents.set(dep, []);
      dependents.get(dep)!.push(task.id);
    }
  }

  const ready = taskDag.tasks
    .filter((t) => (inDegree.get(t.id) ?? 0) === 0)
    .map((t) => t.id)
    .sort();

  const ordered: Task[] = [];
  const visited = new Set<string>();

  while (ready.length > 0) {
    const id = ready.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    ordered.push(taskById.get(id)!);

    const next = (dependents.get(id) ?? []).sort();
    for (const dependentId of next) {
      const remaining = (inDegree.get(dependentId) ?? 1) - 1;
      inDegree.set(dependentId, remaining);
      if (remaining === 0) {
        // insert sorted to keep deterministic ordering
        const idx = ready.findIndex((r) => r > dependentId);
        if (idx === -1) ready.push(dependentId);
        else ready.splice(idx, 0, dependentId);
      }
    }
  }

  const leftover = taskDag.tasks
    .filter((t) => !visited.has(t.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  return [...ordered, ...leftover];
}

/**
 * Rebuild each agent's startOrder so it follows the global topological order.
 */
export function applyTopologicalStartOrder(assignments: AgentAssignment[], taskDag: TaskDag): void {
  const globalOrder = new Map(topologicalSort(taskDag).map((t, i) => [t.id, i]));

  for (const assignment of assignments) {
    assignment.tasks.sort(
      (a, b) => (globalOrder.get(a.id) ?? Infinity) - (globalOrder.get(b.id) ?? Infinity),
    );
    assignment.startOrder = assignment.tasks.map((t) => t.id);
  }
}
