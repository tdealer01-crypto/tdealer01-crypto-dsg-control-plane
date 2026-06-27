import type { TaskDag, AgentCapacity, AgentExecutionResult, BatchExecutionResult } from './types';
import { assignTasksToAgents } from './task-assignment-engine';
import { executeTasksSequentially } from './agent-executor';
import type { AgentExecutorContext } from './agent-executor';
import { aggregateResults, computeEvidenceChain, verifyEvidenceChain } from './result-aggregator';
import type { BrowserbaseSafeExecutionMode } from '@/lib/dsg/hermes-e2e/types';
import type { RawDomElement } from '@/lib/dsg/safe-dom/types';
import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';

export interface CoordinationInput {
  batchId: string;
  taskDag: TaskDag;
  agentCapacities: AgentCapacity[];
  workspaceId: string;
  orgId: string;
  rawElements?: RawDomElement[];
  maxSolveTimeMs?: number;
  executionMode?: Extract<BrowserbaseSafeExecutionMode, 'dry_run' | 'create_session_only'>;
  androidExecutorConfig?: { appPackage: string; allowedApps?: string[] };
}

export interface CoordinationOutput extends BatchExecutionResult {
  coordinationProof: string;
  determinismVerified: boolean;
  usedZ3Solver: boolean;
  fallbackReason?: string;
  z3ProofHash?: string;
  solveDurationMs: number;
}

export async function executeMultiAgentBatch(input: CoordinationInput): Promise<CoordinationOutput> {
  const assignmentResult = await assignTasksToAgents(
    input.taskDag,
    input.agentCapacities,
    input.maxSolveTimeMs ?? 5000,
  );

  // Agents run in parallel; each agent runs its own tasks sequentially in
  // deterministic startOrder. Results are flattened in agentId order so the
  // evidence chain order is itself deterministic.
  const perAgentResults = await Promise.all(
    assignmentResult.assignments.map((assignment) => {
      const agentContext: AgentExecutorContext = {
        agentId: assignment.agentId,
        workspaceId: input.workspaceId,
        orgId: input.orgId,
        batchId: input.batchId,
        romContextHash: assignmentResult.assignmentHash,
      };
      return executeTasksSequentially(
        assignment.tasks,
        agentContext,
        input.rawElements,
        input.executionMode ?? 'dry_run',
        input.androidExecutorConfig,
      );
    }),
  );

  const allResults: AgentExecutionResult[] = perAgentResults.flat();

  const batchResult = aggregateResults(
    input.batchId,
    assignmentResult.taskDagHash,
    assignmentResult.constraintSetHash,
    assignmentResult.assignmentHash,
    allResults,
  );
  batchResult.assignments = assignmentResult.assignments;

  const determinismVerified = verifyEvidenceChain(computeEvidenceChain(allResults)).valid;

  const coordinationProof = sha256Json({
    batchId: batchResult.batchId,
    taskDagHash: batchResult.taskDagHash,
    constraintSetHash: batchResult.constraintSetHash,
    assignmentHash: batchResult.assignmentHash,
    masterEvidenceHash: batchResult.masterEvidenceHash,
    usedZ3Solver: assignmentResult.usedZ3Solver,
    z3ProofHash: assignmentResult.z3ProofHash ?? null,
    totalTasksExecuted: allResults.length,
    version: 'coordination-proof-v1',
  });

  return {
    ...batchResult,
    coordinationProof,
    determinismVerified,
    usedZ3Solver: assignmentResult.usedZ3Solver,
    fallbackReason: assignmentResult.fallbackReason,
    z3ProofHash: assignmentResult.z3ProofHash,
    solveDurationMs: assignmentResult.solveDurationMs,
  };
}

export function validateCoordinationInput(input: CoordinationInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.batchId) {
    errors.push('batchId is required');
  }

  if (!input.taskDag || !Array.isArray(input.taskDag.tasks) || input.taskDag.tasks.length === 0) {
    errors.push('taskDag must contain at least one task');
  }

  if (!Array.isArray(input.agentCapacities) || input.agentCapacities.length === 0) {
    errors.push('agentCapacities must define at least one agent');
  }

  if (!input.workspaceId) {
    errors.push('workspaceId is required');
  }

  if (!input.orgId) {
    errors.push('orgId is required');
  }

  const seenIds = new Set<string>();
  for (const task of input.taskDag?.tasks ?? []) {
    if (!task.id) {
      errors.push(`Task missing id: ${JSON.stringify(task)}`);
      continue;
    }
    if (seenIds.has(task.id)) {
      errors.push(`Duplicate task id: ${task.id}`);
    }
    seenIds.add(task.id);

    if (!task.domain || !task.operation) {
      errors.push(`Task ${task.id} missing domain or operation`);
    }
  }

  for (const capacity of input.agentCapacities ?? []) {
    if (capacity.agentId < 0) {
      errors.push(`Agent capacity has invalid agentId: ${capacity.agentId}`);
    }
    if (capacity.maxTotalTasks < 1) {
      errors.push(`Agent ${capacity.agentId} maxTotalTasks must be >= 1`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
