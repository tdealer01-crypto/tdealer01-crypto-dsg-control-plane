import { describe, expect, it } from 'vitest';
import type { Task, AgentCapacity } from '@/lib/dsg/multi-agent/types';
import { runVerifiedOptimizationPipeline } from '@/lib/dsg-one/verified-optimization-pipeline';

function task(id: string): Task {
  return {
    id,
    name: id,
    domain: 'test',
    operation: 'test',
    target: 'test-target',
    dataSensitivity: 'low',
    externalEffect: false,
    reversibility: 'reversible',
    userAuthorized: true,
    planAllowed: true,
    hasFreshEvidence: true,
    hasRollback: true,
  } as Task;
}

function agent(agentId: number, maxTotalTasks: number): AgentCapacity {
  return {
    agentId,
    maxConcurrentTasks: maxTotalTasks,
    maxTotalTasks,
    resourceAvailable: { cpu: 1, memory: 1 },
  };
}

describe('verified optimization pipeline', () => {
  it('emits VERIFIED_GLOBAL_OPTIMUM only after Z3 SAT and complete exact proof', async () => {
    const result = await runVerifiedOptimizationPipeline({
      problemId: 'one-task-one-agent',
      tasks: [task('t1')],
      agentCapacities: [agent(1, 1)],
      seed: 7,
      useMock: true,
      exactProofMaxVariables: 8,
      // VERIFIED_GLOBAL_OPTIMUM is only emitted for an explicitly bound business
      // objective. Without this the pipeline correctly degrades to
      // VERIFIED_FEASIBLE rather than claiming optimality it cannot support.
      objective: {
        version: 'test-cost-v1',
        assignmentCosts: { 'task_t1_agent_1': -1 },
      },
    });

    expect(result.canonicalProblem.businessObjectiveBound).toBe(true);
    expect(result.verdict).toBe('VERIFIED_GLOBAL_OPTIMUM');
    expect(result.z3.feasible).toBe(true);
    expect(result.z3.status).toBe('sat');
    expect(result.exact.complete).toBe(true);
    expect(result.exact.candidateIsGlobal).toBe(true);
    expect(result.exact.statesChecked).toBe(2);
    expect(result.executionAllowed).toBe(false);
    expect(result.proof.proofHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.proof.receiptHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('does not claim global optimum when exact proof bound is insufficient', async () => {
    const result = await runVerifiedOptimizationPipeline({
      problemId: 'one-task-two-agents',
      tasks: [task('t1')],
      agentCapacities: [agent(1, 1), agent(2, 1)],
      seed: 7,
      useMock: true,
      exactProofMaxVariables: 1,
      // Objective is bound here too, so the VERIFIED_FEASIBLE verdict below is
      // caused by the incomplete exact proof and nothing else. Costs stay at 0
      // so binding the objective does not perturb the capacity penalties that
      // decide feasibility across the two candidate agents.
      objective: {
        version: 'test-cost-v1',
        assignmentCosts: { 'task_t1_agent_1': 0, 'task_t1_agent_2': 0 },
      },
    });

    expect(result.canonicalProblem.businessObjectiveBound).toBe(true);
    expect(result.z3.feasible).toBe(true);
    expect(result.exact.complete).toBe(false);
    expect(result.exact.candidateIsGlobal).toBeNull();
    expect(result.verdict).toBe('VERIFIED_FEASIBLE');
    expect(result.executionAllowed).toBe(false);
  });

  it('produces the same deterministic receipt for identical inputs', async () => {
    const input = {
      problemId: 'deterministic-receipt',
      tasks: [task('t1')],
      agentCapacities: [agent(1, 1)],
      seed: 42,
      useMock: true,
      exactProofMaxVariables: 8,
    } as const;

    const first = await runVerifiedOptimizationPipeline(input);
    const second = await runVerifiedOptimizationPipeline(input);

    expect(second.quboHash).toBe(first.quboHash);
    expect(second.candidate.solutionHash).toBe(first.candidate.solutionHash);
    expect(second.z3.proofHash).toBe(first.z3.proofHash);
    expect(second.exact.proofHash).toBe(first.exact.proofHash);
    expect(second.proof.proofHash).toBe(first.proof.proofHash);
    expect(second.proof.receiptHash).toBe(first.proof.receiptHash);
  });
});
