/**
 * Day 1 validation: QUBO builder + deterministic local Ising/QUBO solver.
 *
 * The runtime no longer has a synthetic/mock solver path. These tests exercise
 * the real in-process solver used when solverMode is local (the default).
 */

import { describe, it, expect } from 'vitest';
import { buildQUBOMatrix, extractAssignmentFromQUBO, calculateQUBOEnergy } from '@/lib/dsg-one/qubo-builder';
import { optimizeWithIsing } from '@/lib/dsg-one/ising-optimizer';
import type { Task, AgentCapacity } from '@/lib/dsg/multi-agent/types';

describe('Day 1: QUBO Builder + deterministic local solver', () => {
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

  describe('QUBO Builder', () => {
    it('builds the expected matrix dimensions', async () => {
      const result = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      expect(result.qubo.Q.length).toBe(6);
      expect(result.qubo.Q[0].length).toBe(6);
      expect(result.qubo.variables.length).toBe(6);
    });

    it('generates a deterministic problem hash', async () => {
      const first = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      const second = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      expect(second.qubo.problemHash).toBe(first.qubo.problemHash);
    });

    it('creates a symmetric QUBO matrix', async () => {
      const { qubo } = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      for (let i = 0; i < qubo.Q.length; i += 1) {
        for (let j = 0; j < qubo.Q.length; j += 1) expect(qubo.Q[i][j]).toBe(qubo.Q[j][i]);
      }
    });

    it('counts task and capacity constraints', async () => {
      const result = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      expect(result.constraintCount).toBe(tasks.length + agents.length);
    });
  });

  describe('Deterministic local solver', () => {
    it('returns a complete binary solution with recomputed energy', async () => {
      const { qubo } = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      const result = await optimizeWithIsing({
        problemId: 'test-1',
        quboMatrix: qubo,
        solverMode: 'local',
      });

      expect(result.mode).toBe('local');
      expect(result.solverVersion).toBe('dsg-anneal-v1');
      expect(Object.keys(result.solution)).toHaveLength(6);
      for (const value of Object.values(result.solution)) expect([0, 1]).toContain(value);
      expect(result.energy).toBe(calculateQUBOEnergy(qubo, result.solution));
      expect(result.confidence).toBeUndefined();
    });

    it('is deterministic for the same seed', async () => {
      const { qubo } = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      const first = await optimizeWithIsing({
        problemId: 'test-1', quboMatrix: qubo, solverMode: 'local', seed: 42,
      });
      const second = await optimizeWithIsing({
        problemId: 'test-1', quboMatrix: qubo, solverMode: 'local', seed: 42,
      });

      expect(second.solution).toEqual(first.solution);
      expect(second.proofData.solutionHash).toBe(first.proofData.solutionHash);
      expect(second.energy).toBe(first.energy);
    });

    it('extracts a valid assignment from the solver output', async () => {
      const { qubo } = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      const result = await optimizeWithIsing({
        problemId: 'assignment-test', quboMatrix: qubo, solverMode: 'local', seed: 7,
      });
      const assignment = extractAssignmentFromQUBO(qubo, result.solution);

      expect(Object.keys(assignment).sort()).toEqual(tasks.map((task) => task.id).sort());
      for (const agentId of Object.values(assignment)) expect([1, 2]).toContain(agentId);
    });
  });

  describe('Integration: QUBO → local solve → assignment', () => {
    it('completes the pipeline and records proof metadata', async () => {
      const buildResult = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      const result = await optimizeWithIsing({
        problemId: 'pipeline-test',
        quboMatrix: buildResult.qubo,
        solverMode: 'local',
        seed: 123,
      });
      const assignment = extractAssignmentFromQUBO(buildResult.qubo, result.solution);

      expect(assignment).toBeDefined();
      expect(result.solveTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.solverVersion).toBe('dsg-anneal-v1');
      expect(result.proofData.quboHash).toBe(buildResult.qubo.problemHash);
      expect(result.proofData.solutionHash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.proofData.seed).toBe(123);
    });

    it('maintains deterministic proof hashes over repeated runs', async () => {
      const { qubo } = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      const hashes: string[] = [];
      for (let i = 0; i < 10; i += 1) {
        const result = await optimizeWithIsing({
          problemId: 'determinism-test', quboMatrix: qubo, solverMode: 'local', seed: 999,
        });
        hashes.push(result.proofData.solutionHash);
      }
      expect(new Set(hashes).size).toBe(1);
    });
  });
});
