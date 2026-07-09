/**
 * Day 1 Validation Tests: QUBO Builder + Mock Ising Optimizer
 *
 * Tests verify that:
 * 1. QUBO builder generates deterministic matrices
 * 2. Mock Ising optimizer returns valid solutions
 * 3. Solutions satisfy task assignment constraints
 * 4. Determinism: same input → same output
 */

import { describe, it, expect } from 'vitest';
import { buildQUBOMatrix } from '@/lib/dsg-one/qubo-builder';
import { optimizeWithIsing, extractAssignmentFromQUBO } from '@/lib/dsg-one/ising-optimizer';
import type { Task, AgentCapacity } from '@/lib/dsg/multi-agent/types';

describe('Day 1: QUBO Builder + Mock Ising', () => {
  // Small test problem
  const tasks: Task[] = [
    {
      id: 'task-1',
      name: 'Payment',
      domain: 'financial',
      operation: 'transfer',
      target: 'acct-1',
      dataSensitivity: 'high',
      externalEffect: true,
      reversibility: 'reversible',
      userAuthorized: true,
      planAllowed: true,
      hasFreshEvidence: true,
      hasRollback: true,
    },
    {
      id: 'task-2',
      name: 'Audit',
      domain: 'compliance',
      operation: 'write',
      target: 'log',
      dataSensitivity: 'medium',
      externalEffect: false,
      reversibility: 'irreversible',
      userAuthorized: true,
      planAllowed: true,
      hasFreshEvidence: true,
      hasRollback: false,
    },
    {
      id: 'task-3',
      name: 'Policy',
      domain: 'policy',
      operation: 'update',
      target: 'policy-engine',
      dataSensitivity: 'high',
      externalEffect: true,
      reversibility: 'reversible',
      userAuthorized: true,
      planAllowed: true,
      hasFreshEvidence: true,
      hasRollback: true,
    },
  ];

  const agents: AgentCapacity[] = [
    { agentId: 1, maxConcurrentTasks: 2, maxTotalTasks: 2, resourceAvailable: { cpu: 4, memory: 8 } },
    { agentId: 2, maxConcurrentTasks: 2, maxTotalTasks: 1, resourceAvailable: { cpu: 2, memory: 4 } },
  ];

  describe('QUBO Builder', () => {
    it('should build QUBO matrix with correct dimensions', async () => {
      const result = await buildQUBOMatrix({ tasks, agentCapacities: agents });

      expect(result.qubo.Q.length).toBe(6); // 3 tasks × 2 agents
      expect(result.qubo.Q[0].length).toBe(6);
      expect(result.qubo.variables.length).toBe(6);
    });

    it('should generate deterministic problem hash', async () => {
      const result1 = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      const result2 = await buildQUBOMatrix({ tasks, agentCapacities: agents });

      expect(result1.qubo.problemHash).toBe(result2.qubo.problemHash);
    });

    it('should create symmetric QUBO matrix', async () => {
      const result = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      const Q = result.qubo.Q;

      for (let i = 0; i < Q.length; i++) {
        for (let j = 0; j < Q.length; j++) {
          expect(Q[i][j]).toBe(Q[j][i]);
        }
      }
    });

    it('should count constraints correctly', async () => {
      const result = await buildQUBOMatrix({ tasks, agentCapacities: agents });

      // Should have: task assignment constraints + agent capacity constraints
      expect(result.constraintCount).toBe(tasks.length + agents.length); // 3 + 2 = 5
    });
  });

  describe('Mock Ising Optimizer', () => {
    it('should return valid solution for QUBO', async () => {
      const buildResult = await buildQUBOMatrix({ tasks, agentCapacities: agents });

      const isingResult = await optimizeWithIsing({
        problemId: 'test-1',
        quboMatrix: buildResult.qubo,
        useMock: true,
      });

      expect(isingResult.solution).toBeDefined();
      expect(Object.keys(isingResult.solution).length).toBe(6);
      expect(isingResult.energy).toBeDefined();
      expect(isingResult.confidence).toBeGreaterThan(0);
      expect(isingResult.confidence).toBeLessThanOrEqual(1);
    });

    it('should be deterministic (same seed → same solution)', async () => {
      const buildResult = await buildQUBOMatrix({ tasks, agentCapacities: agents });

      const result1 = await optimizeWithIsing({
        problemId: 'test-1',
        quboMatrix: buildResult.qubo,
        useMock: true,
        seed: 42,
      });

      const result2 = await optimizeWithIsing({
        problemId: 'test-1',
        quboMatrix: buildResult.qubo,
        useMock: true,
        seed: 42,
      });

      expect(result1.proofData.solutionHash).toBe(result2.proofData.solutionHash);
      expect(result1.energy).toBe(result2.energy);
    });

    it('should return binary solution (all 0 or 1)', async () => {
      const buildResult = await buildQUBOMatrix({ tasks, agentCapacities: agents });

      const isingResult = await optimizeWithIsing({
        problemId: 'test-1',
        quboMatrix: buildResult.qubo,
        useMock: true,
      });

      for (const [_, value] of Object.entries(isingResult.solution)) {
        expect([0, 1]).toContain(value);
      }
    });

    it('should extract assignment from QUBO solution', async () => {
      const buildResult = await buildQUBOMatrix({ tasks, agentCapacities: agents });

      const isingResult = await optimizeWithIsing({
        problemId: 'test-1',
        quboMatrix: buildResult.qubo,
        useMock: true,
      });

      const assignment = extractAssignmentFromQUBO(buildResult.qubo, isingResult.solution);

      // Should have at least some tasks assigned
      expect(Object.keys(assignment).length).toBeGreaterThan(0);

      // All assigned agent IDs should be valid
      for (const agentId of Object.values(assignment)) {
        expect([1, 2]).toContain(agentId);
      }
    });
  });

  describe('Integration: QUBO + Ising', () => {
    it('should complete full pipeline: build → solve → extract', async () => {
      const buildResult = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      const isingResult = await optimizeWithIsing({
        problemId: 'pipeline-test',
        quboMatrix: buildResult.qubo,
        useMock: true,
      });
      const assignment = extractAssignmentFromQUBO(buildResult.qubo, isingResult.solution);

      expect(assignment).toBeDefined();
      expect(isingResult.solveTimeMs).toBeGreaterThanOrEqual(0);
      expect(isingResult.solverVersion).toContain('mock');
    });

    it('should track proof metadata for determinism verification', async () => {
      const buildResult = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      const isingResult = await optimizeWithIsing({
        problemId: 'proof-test',
        quboMatrix: buildResult.qubo,
        useMock: true,
        seed: 123,
      });

      expect(isingResult.proofData.quboHash).toBe(buildResult.qubo.problemHash);
      expect(isingResult.proofData.solutionHash).toBeDefined();
      expect(isingResult.proofData.seed).toBe(123);
    });
  });

  describe('Day 1 Success Metrics', () => {
    it('should complete small case in < 100ms combined', async () => {
      const startTime = Date.now();

      const buildResult = await buildQUBOMatrix({ tasks, agentCapacities: agents });
      const isingResult = await optimizeWithIsing({
        problemId: 'perf-test',
        quboMatrix: buildResult.qubo,
        useMock: true,
      });

      const totalTimeMs = Date.now() - startTime;

      expect(totalTimeMs).toBeLessThan(100);
      expect(buildResult.buildTimeMs).toBeGreaterThanOrEqual(0);
      expect(isingResult.solveTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should maintain determinism over 10 runs with same seed', async () => {
      const buildResult = await buildQUBOMatrix({ tasks, agentCapacities: agents });

      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = await optimizeWithIsing({
          problemId: 'determinism-test',
          quboMatrix: buildResult.qubo,
          useMock: true,
          seed: 999,
        });
        results.push(result.proofData.solutionHash);
      }

      // All hashes should be identical
      const firstHash = results[0];
      for (const hash of results) {
        expect(hash).toBe(firstHash);
      }
    });
  });
});
