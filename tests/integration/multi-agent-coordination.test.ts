import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import type { TaskDag, AgentCapacity, Task } from '@/lib/dsg/multi-agent/types';
import type { RawDomElement } from '@/lib/dsg/safe-dom/types';
import {
  executeMultiAgentBatch,
  validateCoordinationInput,
} from '@/lib/dsg/multi-agent/coordinator-service';
import {
  assignTasksToAgents,
  computeTaskDagHash,
  computeConstraintSetHash,
  validateAssignment,
} from '@/lib/dsg/multi-agent/task-assignment-engine';
import {
  solveTaskAssignmentConstraints,
  fallbackGreedyAssignment,
  topologicalSort,
  applyTopologicalStartOrder,
  terminateZ3Threads,
} from '@/lib/dsg/multi-agent/z3-constraint-solver';

const NUM_AGENTS = 10;
const NUM_TASKS = 50;
const SHA256_HEX = /^[a-f0-9]{64}$/;

function buildAgentCapacities(): AgentCapacity[] {
  return Array.from({ length: NUM_AGENTS }, (_, i) => ({
    agentId: i,
    maxConcurrentTasks: 5,
    maxTotalTasks: 10,
    resourceAvailable: { cpu: 100, memory: 1024 },
  }));
}

function buildTaskDag(): TaskDag {
  const tasks: Task[] = Array.from({ length: NUM_TASKS }, (_, i) => {
    const taskId = `task-${String(i).padStart(3, '0')}`;
    const dependencies =
      i > 0 && i % 5 === 0 ? [`task-${String(i - 5).padStart(3, '0')}`] : undefined;

    return {
      id: taskId,
      name: `Task ${i}`,
      domain: i % 2 === 0 ? 'form' : 'browser',
      operation: i % 2 === 0 ? 'submit' : 'fill',
      target: `target-${i % 10}`,
      // every 5th task is credential-sensitive and must be policy-blocked
      dataSensitivity: i % 5 === 0 ? 'credential' : 'internal',
      externalEffect: i % 2 === 0,
      reversibility: i % 2 === 0 ? 'partially_reversible' : 'reversible',
      userAuthorized: true,
      planAllowed: true,
      hasFreshEvidence: true,
      hasRollback: true,
      dependencies,
      estimatedDurationMs: 100 + ((i * 37) % 900),
      priority: i % 3,
    };
  });

  const edges = tasks
    .filter((t) => t.dependencies?.length)
    .flatMap((t) => t.dependencies!.map((dep) => ({ from: dep, to: t.id })));

  return { tasks, edges };
}

const safeRawElements: RawDomElement[] = [
  { selector: '#name', role: 'input', label: 'Name', allowedOps: ['type'] },
  { selector: '#message', role: 'textarea', label: 'Message', allowedOps: ['type'] },
  { selector: '#next-step', role: 'button', text: 'Next', allowedOps: ['click'] },
];

describe('Multi-Agent Deterministic Coordination (10 agents, 50-task DAG)', () => {
  let taskDag: TaskDag;
  let agentCapacities: AgentCapacity[];

  beforeAll(() => {
    taskDag = buildTaskDag();
    agentCapacities = buildAgentCapacities();
  });

  afterAll(async () => {
    await terminateZ3Threads();
  });

  it('computes deterministic task DAG hash', () => {
    expect(computeTaskDagHash(taskDag)).toBe(computeTaskDagHash(buildTaskDag()));
    expect(computeTaskDagHash(taskDag)).toMatch(SHA256_HEX);
  });

  it('computes deterministic constraint set hash', () => {
    expect(computeConstraintSetHash(agentCapacities)).toBe(
      computeConstraintSetHash(buildAgentCapacities()),
    );
    expect(computeConstraintSetHash(agentCapacities)).toMatch(SHA256_HEX);
  });

  it('task DAG hash changes when DAG changes', () => {
    const modified = { ...taskDag, tasks: taskDag.tasks.slice(0, 25) };
    expect(computeTaskDagHash(modified)).not.toBe(computeTaskDagHash(taskDag));
  });

  it('topological sort respects dependencies deterministically', () => {
    const order1 = topologicalSort(taskDag).map((t) => t.id);
    const order2 = topologicalSort(taskDag).map((t) => t.id);
    expect(order1).toEqual(order2);
    expect(order1).toHaveLength(NUM_TASKS);

    const position = new Map(order1.map((id, i) => [id, i]));
    for (const task of taskDag.tasks) {
      for (const dep of task.dependencies ?? []) {
        expect(position.get(dep)!).toBeLessThan(position.get(task.id)!);
      }
    }
  });

  it('greedy fallback assigns all tasks with balanced load', () => {
    const assignments = fallbackGreedyAssignment(taskDag, agentCapacities);
    applyTopologicalStartOrder(assignments, taskDag);

    expect(assignments).toHaveLength(NUM_AGENTS);

    const allTaskIds = assignments.flatMap((a) => a.tasks.map((t) => t.id));
    expect(new Set(allTaskIds).size).toBe(NUM_TASKS);

    // 50 tasks across 10 agents via least-loaded → exactly 5 each
    for (const assignment of assignments) {
      expect(assignment.tasks.length).toBe(5);
    }

    const validation = validateAssignment(assignments, taskDag, agentCapacities);
    expect(validation.errors).toEqual([]);
  });

  it('Z3 solver produces a valid capacity-respecting assignment', async () => {
    const outcome = await solveTaskAssignmentConstraints(taskDag, agentCapacities, 10_000);

    expect('model' in outcome).toBe(true);
    if (!('model' in outcome)) return;

    expect(outcome.model.proofHash).toMatch(SHA256_HEX);
    expect(outcome.model.solveDurationMs).toBeGreaterThan(0);
    expect(outcome.model.constraints.length).toBeGreaterThan(NUM_TASKS);

    const validation = validateAssignment(outcome.assignments, taskDag, agentCapacities);
    expect(validation.errors).toEqual([]);
  });

  it('produces identical assignment hash and Z3 proof on repeated solves', async () => {
    const result1 = await assignTasksToAgents(taskDag, agentCapacities, 10_000);
    const result2 = await assignTasksToAgents(taskDag, agentCapacities, 10_000);

    expect(result1.usedZ3Solver).toBe(true);
    expect(result2.usedZ3Solver).toBe(true);
    expect(result1.taskDagHash).toBe(result2.taskDagHash);
    expect(result1.constraintSetHash).toBe(result2.constraintSetHash);
    expect(result1.z3ProofHash).toBe(result2.z3ProofHash);
    expect(result1.assignmentHash).toBe(result2.assignmentHash);
  });

  it('same-agent dependent tasks are ordered after their dependencies', async () => {
    const result = await assignTasksToAgents(taskDag, agentCapacities, 10_000);

    for (const assignment of result.assignments) {
      const position = new Map(assignment.startOrder.map((id, i) => [id, i]));
      for (const task of assignment.tasks) {
        for (const dep of task.dependencies ?? []) {
          const depPos = position.get(dep);
          if (depPos !== undefined) {
            expect(position.get(task.id)!).toBeGreaterThan(depPos);
          }
        }
      }
    }
  });

  it('validates coordination input', () => {
    const valid = validateCoordinationInput({
      batchId: 'batch-001',
      taskDag,
      agentCapacities,
      workspaceId: 'ws-001',
      orgId: 'org-001',
    });
    expect(valid.valid).toBe(true);
    expect(valid.errors).toEqual([]);

    const invalid = validateCoordinationInput({
      taskDag,
      agentCapacities,
      workspaceId: 'ws-001',
      orgId: 'org-001',
    } as never);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.some((e) => e.includes('batchId'))).toBe(true);
  });

  it('executes 10-agent batch in dry_run: allows safe tasks, blocks credential tasks', async () => {
    const result = await executeMultiAgentBatch({
      batchId: 'test-batch-dry-run',
      taskDag,
      agentCapacities,
      workspaceId: 'ws-test',
      orgId: 'org-test',
      rawElements: safeRawElements,
      executionMode: 'dry_run',
    });

    expect(result.batchId).toBe('test-batch-dry-run');
    expect(result.results).toHaveLength(NUM_TASKS);

    const successCount = result.results.filter((r) => r.status === 'SUCCESS').length;
    const blockCount = result.results.filter((r) => r.status === 'BLOCKED').length;
    const failCount = result.results.filter((r) => r.status === 'FAILED').length;

    // 10 credential tasks (i % 5 === 0) must be blocked; the other 40 succeed
    expect(blockCount).toBe(10);
    expect(successCount).toBe(40);
    expect(failCount).toBe(0);
    expect(result.status).toBe('PARTIAL_FAILURE');

    const blockedResults = result.results.filter((r) => r.status === 'BLOCKED');
    for (const blocked of blockedResults) {
      expect(blocked.error).toBe('CREDENTIAL_OR_SECRET_BLOCKED');
    }

    // dry_run never touches a real website
    for (const r of result.results) {
      if (r.result) {
        expect(r.result.trace.browserbaseTouchedRealWebsite).toBe(false);
      }
    }

    expect(result.taskDagHash).toMatch(SHA256_HEX);
    expect(result.constraintSetHash).toMatch(SHA256_HEX);
    expect(result.assignmentHash).toMatch(SHA256_HEX);
    expect(result.masterEvidenceHash).toMatch(SHA256_HEX);
    expect(result.coordinationProof).toMatch(SHA256_HEX);
    expect(result.determinismVerified).toBe(true);
  });

  it('collects per-agent evidence hashes for every agent that executed tasks', async () => {
    const result = await executeMultiAgentBatch({
      batchId: 'test-batch-evidence',
      taskDag,
      agentCapacities,
      workspaceId: 'ws-test',
      orgId: 'org-test',
      rawElements: safeRawElements,
      executionMode: 'dry_run',
    });

    const agentIdsWithResults = new Set(result.results.map((r) => r.agentId));
    expect(agentIdsWithResults.size).toBeGreaterThan(0);

    for (const agentId of agentIdsWithResults) {
      expect(result.agentEvidenceHashes[agentId]).toMatch(SHA256_HEX);
    }

    for (const r of result.results) {
      if (r.result) {
        expect(r.evidenceHash).toMatch(SHA256_HEX);
      }
    }
  });

  it('two batch runs over the same DAG produce the same assignment hash', async () => {
    const run1 = await executeMultiAgentBatch({
      batchId: 'batch-determinism-1',
      taskDag,
      agentCapacities,
      workspaceId: 'ws-test',
      orgId: 'org-test',
      rawElements: safeRawElements,
      executionMode: 'dry_run',
    });

    const run2 = await executeMultiAgentBatch({
      batchId: 'batch-determinism-2',
      taskDag: buildTaskDag(),
      agentCapacities: buildAgentCapacities(),
      workspaceId: 'ws-test',
      orgId: 'org-test',
      rawElements: safeRawElements,
      executionMode: 'dry_run',
    });

    expect(run1.taskDagHash).toBe(run2.taskDagHash);
    expect(run1.constraintSetHash).toBe(run2.constraintSetHash);
    expect(run1.assignmentHash).toBe(run2.assignmentHash);
    expect(run1.determinismVerified).toBe(true);
    expect(run2.determinismVerified).toBe(true);
  });
});
