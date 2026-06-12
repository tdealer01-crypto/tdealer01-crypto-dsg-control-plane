import type { TaskDag, AgentAssignment, AgentCapacity } from './types';
import {
  solveTaskAssignmentConstraints,
  fallbackGreedyAssignment,
  applyTopologicalStartOrder,
} from './z3-constraint-solver';
import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';

export interface AssignmentResult {
  taskDagHash: string;
  constraintSetHash: string;
  assignmentHash: string;
  assignments: AgentAssignment[];
  usedZ3Solver: boolean;
  fallbackReason?: string;
  z3ProofHash?: string;
  solveDurationMs: number;
}

export async function assignTasksToAgents(
  taskDag: TaskDag,
  agentCapacities: AgentCapacity[],
  maxSolveTimeMs: number = 5000,
): Promise<AssignmentResult> {
  const taskDagHash = computeTaskDagHash(taskDag);
  const constraintSetHash = computeConstraintSetHash(agentCapacities);

  const startTime = Date.now();

  let assignments: AgentAssignment[];
  let usedZ3Solver = false;
  let fallbackReason: string | undefined;
  let z3ProofHash: string | undefined;

  const z3Result = await solveTaskAssignmentConstraints(taskDag, agentCapacities, maxSolveTimeMs);

  if ('model' in z3Result) {
    assignments = z3Result.assignments;
    usedZ3Solver = true;
    z3ProofHash = z3Result.model.proofHash;
  } else {
    assignments = fallbackGreedyAssignment(taskDag, agentCapacities);
    applyTopologicalStartOrder(assignments, taskDag);
    fallbackReason = z3Result.reason;
  }

  const solveDurationMs = Date.now() - startTime;
  const assignmentHash = computeAssignmentHash(taskDagHash, constraintSetHash, assignments);

  return {
    taskDagHash,
    constraintSetHash,
    assignmentHash,
    assignments,
    usedZ3Solver,
    fallbackReason,
    z3ProofHash,
    solveDurationMs,
  };
}

export function computeTaskDagHash(taskDag: TaskDag): string {
  const sortedTasks = [...taskDag.tasks].sort((a, b) => a.id.localeCompare(b.id));
  const sortedEdges = [...taskDag.edges].sort(
    (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to),
  );

  return sha256Json({
    tasks: sortedTasks.map((t) => ({
      id: t.id,
      name: t.name,
      domain: t.domain,
      operation: t.operation,
      dataSensitivity: t.dataSensitivity,
      dependencies: [...(t.dependencies ?? [])].sort(),
      priority: t.priority ?? 0,
    })),
    edges: sortedEdges,
    version: 'task-dag-v1',
  });
}

export function computeConstraintSetHash(agentCapacities: AgentCapacity[]): string {
  const sortedCapacities = [...agentCapacities].sort((a, b) => a.agentId - b.agentId);

  return sha256Json({
    agentCapacities: sortedCapacities.map((c) => ({
      agentId: c.agentId,
      maxConcurrentTasks: c.maxConcurrentTasks,
      maxTotalTasks: c.maxTotalTasks,
      resources: Object.entries(c.resourceAvailable ?? {}).sort(([a], [b]) => a.localeCompare(b)),
    })),
    version: 'constraint-set-v1',
  });
}

export function computeAssignmentHash(
  taskDagHash: string,
  constraintSetHash: string,
  assignments: AgentAssignment[],
): string {
  const sortedAssignments = [...assignments].sort((a, b) => a.agentId - b.agentId);

  return sha256Json({
    taskDagHash,
    constraintSetHash,
    assignments: sortedAssignments.map((a) => ({
      agentId: a.agentId,
      taskCount: a.tasks.length,
      startOrder: a.startOrder,
    })),
    version: 'assignment-v1',
  });
}

export function validateAssignment(
  assignments: AgentAssignment[],
  taskDag: TaskDag,
  agentCapacities: AgentCapacity[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const assignedTaskIds = new Set<string>();
  for (const assignment of assignments) {
    for (const task of assignment.tasks) {
      if (assignedTaskIds.has(task.id)) {
        errors.push(`Task ${task.id} assigned to multiple agents`);
      }
      assignedTaskIds.add(task.id);
    }
  }

  for (const task of taskDag.tasks) {
    if (!assignedTaskIds.has(task.id)) {
      errors.push(`Task ${task.id} not assigned to any agent`);
    }
  }

  for (const assignment of assignments) {
    const capacity = agentCapacities.find((c) => c.agentId === assignment.agentId);
    if (!capacity) {
      errors.push(`Agent ${assignment.agentId} has no capacity defined`);
      continue;
    }
    if (assignment.tasks.length > capacity.maxTotalTasks) {
      errors.push(
        `Agent ${assignment.agentId} exceeds max tasks (${assignment.tasks.length} > ${capacity.maxTotalTasks})`,
      );
    }
  }

  // Same-agent dependency pairs must appear in dependency order in startOrder.
  for (const assignment of assignments) {
    const positionById = new Map(assignment.startOrder.map((id, i) => [id, i]));
    for (const task of assignment.tasks) {
      for (const depId of task.dependencies ?? []) {
        const depPos = positionById.get(depId);
        const taskPos = positionById.get(task.id);
        if (depPos !== undefined && taskPos !== undefined && taskPos <= depPos) {
          errors.push(`Task ${task.id} depends on ${depId} but is ordered before or at it`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
