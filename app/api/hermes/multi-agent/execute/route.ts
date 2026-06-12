import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  executeMultiAgentBatch,
  validateCoordinationInput,
  type CoordinationInput,
} from '@/lib/dsg/multi-agent/coordinator-service';
import type { TaskDag, AgentCapacity } from '@/lib/dsg/multi-agent/types';
import type { RawDomElement } from '@/lib/dsg/safe-dom/types';
import { readJsonBody } from '@/lib/security/request-json';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 256_000;
const MAX_TASKS_PER_BATCH = 200;

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req, { maxBytes: MAX_BODY_BYTES });
    if (!parsed.ok || !parsed.value) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_BODY', message: parsed.error ?? 'invalid_body' } },
        { status: parsed.status },
      );
    }
    const body = parsed.value;

    const taskDag = (body.taskDag as TaskDag | undefined) ?? buildDemoTaskDag();
    if (taskDag.tasks?.length > MAX_TASKS_PER_BATCH) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'TOO_MANY_TASKS',
            message: `Batch limited to ${MAX_TASKS_PER_BATCH} tasks, got ${taskDag.tasks.length}`,
          },
        },
        { status: 400 },
      );
    }

    const executionMode = body.executionMode === 'create_session_only' ? 'create_session_only' : 'dry_run';

    const coordinationInput: CoordinationInput = {
      batchId: typeof body.batchId === 'string' ? body.batchId : `batch-${randomUUID().slice(0, 8)}`,
      taskDag,
      agentCapacities: (body.agentCapacities as AgentCapacity[] | undefined) ?? buildDemoAgentCapacities(),
      workspaceId: typeof body.workspaceId === 'string' ? body.workspaceId : 'demo-workspace',
      orgId: typeof body.orgId === 'string' ? body.orgId : 'demo-org',
      rawElements: (body.rawElements as RawDomElement[] | undefined) ?? buildDemoRawElements(),
      maxSolveTimeMs: typeof body.maxSolveTimeMs === 'number' ? body.maxSolveTimeMs : 5000,
      executionMode,
    };

    const validation = validateCoordinationInput(coordinationInput);
    if (!validation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_COORDINATION_INPUT',
            message: 'Coordination input validation failed',
            details: validation.errors,
          },
        },
        { status: 400 },
      );
    }

    const result = await executeMultiAgentBatch(coordinationInput);

    const successCount = result.results.filter((r) => r.status === 'SUCCESS').length;
    const blockCount = result.results.filter((r) => r.status === 'BLOCKED').length;
    const failCount = result.results.filter((r) => r.status === 'FAILED').length;

    return NextResponse.json({
      ok: true,
      batchId: result.batchId,
      status: result.status,
      executionMode,
      agentCount: result.assignments.length,
      totalTasksExecuted: result.results.length,
      successCount,
      blockCount,
      failCount,
      usedZ3Solver: result.usedZ3Solver,
      fallbackReason: result.fallbackReason,
      solveDurationMs: result.solveDurationMs,
      totalExecutionTimeMs: result.totalExecutionTimeMs,
      determinismVerified: result.determinismVerified,
      proofs: {
        taskDagHash: result.taskDagHash,
        constraintSetHash: result.constraintSetHash,
        assignmentHash: result.assignmentHash,
        z3ProofHash: result.z3ProofHash,
        masterEvidenceHash: result.masterEvidenceHash,
        coordinationProof: result.coordinationProof,
      },
      agentEvidenceHashes: result.agentEvidenceHashes,
      assignments: result.assignments.map((a) => ({
        agentId: a.agentId,
        taskCount: a.tasks.length,
        startOrder: a.startOrder,
      })),
      results: result.results.map((r) => ({
        agentId: r.agentId,
        taskId: r.taskId,
        status: r.status,
        decision: r.decision,
        reason: r.error,
        evidenceHash: r.evidenceHash,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'HERMES_MULTI_AGENT_EXECUTION_FAILED',
          message: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        },
      },
      { status: 500 },
    );
  }
}

function buildDemoTaskDag(): TaskDag {
  const tasks = Array.from({ length: 20 }, (_, i) => ({
    id: `demo-task-${String(i).padStart(3, '0')}`,
    name: `Demo Task ${i}`,
    domain: (i % 2 === 0 ? 'form' : 'browser') as 'form' | 'browser',
    operation: (i % 2 === 0 ? 'submit' : 'fill') as 'submit' | 'fill',
    target: `demo-target-${i % 5}`,
    dataSensitivity: 'internal' as const,
    externalEffect: i % 2 === 0,
    reversibility: 'partially_reversible' as const,
    userAuthorized: true,
    planAllowed: true,
    hasFreshEvidence: true,
    hasRollback: true,
    dependencies:
      i > 0 && i % 5 === 0 ? [`demo-task-${String(i - 5).padStart(3, '0')}`] : undefined,
    priority: i % 3,
  }));

  return { tasks, edges: [] };
}

function buildDemoAgentCapacities(): AgentCapacity[] {
  return Array.from({ length: 10 }, (_, i) => ({
    agentId: i,
    maxConcurrentTasks: 5,
    maxTotalTasks: 10,
    resourceAvailable: { cpu: 100, memory: 1024 },
  }));
}

function buildDemoRawElements(): RawDomElement[] {
  return [
    { selector: '#demo-name', role: 'input', label: 'Name', allowedOps: ['type'] },
    { selector: '#demo-message', role: 'textarea', label: 'Message', allowedOps: ['type'] },
    { selector: '#demo-next', role: 'button', text: 'Next', allowedOps: ['click'] },
  ];
}
