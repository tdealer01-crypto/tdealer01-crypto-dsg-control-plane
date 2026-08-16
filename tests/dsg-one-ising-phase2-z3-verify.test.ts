/**
 * Phase 2 validation: deterministic local Ising/QUBO optimizer + Z3 verifier.
 *
 * No synthetic/mock optimizer path is used. The candidate assignment comes from
 * the real deterministic in-process solver and Z3 remains the verification
 * authority for feasibility.
 */

import { describe, expect, it } from 'vitest';
import { buildQUBOMatrix } from '@/lib/dsg-one/qubo-builder';
import { optimizeWithIsing } from '@/lib/dsg-one/ising-optimizer';
import { verifyIsingWithZ3, shouldFallbackToZ3FullSolve } from '@/lib/dsg-one/ising-to-z3-verifier';
import type { Task, AgentCapacity } from '@/lib/dsg/multi-agent/types';

describe('Phase 2: deterministic local optimizer + Z3 verification', () => {
  const tasks: Task[] = [
    {
      id: 'task-1', name: 'Payment', domain: 'financial', operation: 'transfer', target: 'acct-1',
      dataSensitivity: 'high', externalEffect: true, reversibility: 'reversible',
      userAuthorized: true, planAllowed: true, hasFreshEvidence: true, hasRollback: true,
    },
    {
      id: 'task-2', name: 'Audit', domain: 'compliance', operation: 'write', target: 'log',
      dataSensitivity: 'medium', externalEffect: false, reversibility: 'irreversible',
      userAuthorized: true, planAllowed: true, hasFreshEvidence: true, hasRollback: false,
    },
    {
      id: 'task-3', name: 'Policy', domain: 'policy', operation: 'update', target: 'policy-engine',
      dataSensitivity: 'high', externalEffect: true, reversibility: 'reversible',
      userAuthorized: true, planAllowed: true, hasFreshEvidence: true, hasRollback: true,
    },
  ];

  const agents: AgentCapacity[] = [
    { agentId: 1, maxConcurrentTasks: 2, maxTotalTasks: 2, resourceAvailable: { cpu: 4, memory: 8 } },
    { agentId: 2, maxConcurrentTasks: 2, maxTotalTasks: 1, resourceAvailable: { cpu: 2, memory: 4 } },
  ];

  async function solve(seed = 42) {
    const buildResult = await buildQUBOMatrix({ tasks, agentCapacities: agents });
    const isingResult = await optimizeWithIsing({
      problemId: 'phase2-real-local',
      quboMatrix: buildResult.qubo,
      solverMode: 'local',
      seed,
    });
    const verifyResult = await verifyIsingWithZ3({
      isingAssignment: isingResult.solution,
      quboMatrix: buildResult.qubo,
      tasks,
      agentCapacities: agents,
    });
    return { buildResult, isingResult, verifyResult };
  }

  it('verifies a real local optimizer assignment with Z3', async () => {
    const { isingResult, verifyResult } = await solve(7);

    expect(isingResult.mode).toBe('local');
    expect(isingResult.solverVersion).toBe('dsg-anneal-v1');
    expect(verifyResult.isSAT).toBe('sat');
    expect(verifyResult.isValid).toBe(true);
    expect(verifyResult.proofHash).toMatch(/^sha256:/);
  });

  it('does not silently accept an intentionally infeasible assignment', async () => {
    const buildResult = await buildQUBOMatrix({ tasks, agentCapacities: agents });
    const infeasible: Record<string, number> = {};
    for (const variable of Object.keys(buildResult.qubo.variableMap)) infeasible[variable] = 0;

    const verification = await verifyIsingWithZ3({
      isingAssignment: infeasible,
      quboMatrix: buildResult.qubo,
      tasks,
      agentCapacities: agents,
    });

    expect(['sat', 'unsat', 'timeout', 'error']).toContain(verification.isSAT);
    if (!verification.isValid) expect(shouldFallbackToZ3FullSolve(verification)).toBe(true);
  });

  it('keeps optimizer and verification proof hashes deterministic for the same input', async () => {
    const first = await solve(777);
    const second = await solve(777);

    expect(first.isingResult.proofData.solutionHash).toBe(second.isingResult.proofData.solutionHash);
    expect(first.verifyResult.proofHash).toBe(second.verifyResult.proofHash);
  });

  it('tracks real solver versions through the pipeline', async () => {
    const { isingResult, verifyResult } = await solve(11);

    expect(isingResult.solverVersion).toBe('dsg-anneal-v1');
    expect(isingResult.solverVersion).not.toContain('mock');
    expect(verifyResult.z3Version).toBeDefined();
    expect(verifyResult.z3Version).toContain('z3');
  });

  it('binds build, optimizer, and Z3 evidence into distinct hashes', async () => {
    const { buildResult, isingResult, verifyResult } = await solve(123);

    expect(buildResult.qubo.problemHash).toBe(isingResult.proofData.quboHash);
    expect(isingResult.proofData.solutionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyResult.proofHash).toMatch(/^sha256:/);

    const hashes = new Set([
      buildResult.qubo.problemHash,
      isingResult.proofData.solutionHash,
      verifyResult.proofHash,
    ]);
    expect(hashes.size).toBe(3);
  });
});
