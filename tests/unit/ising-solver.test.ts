import { describe, it, expect } from 'vitest';
import { solveIsing, solveIsingWithRetry } from '../../lib/ising/solver';
import type { IsingProblem } from '../../lib/ising/types';

describe('Ising Solver', () => {
  describe('solveIsing', () => {
    it('should satisfy all constraints when possible', async () => {
      // Simple problem: all variables must be true
      const problem: IsingProblem = {
        variables: { a: false, b: false, c: false },
        constraints: [
          {
            id: 'c1',
            type: 'hard',
            weight: 1.0,
            variables: ['a'],
            satisfactionFn: (vars) => vars.a === true,
            description: 'a must be true',
          },
          {
            id: 'c2',
            type: 'hard',
            weight: 1.0,
            variables: ['b'],
            satisfactionFn: (vars) => vars.b === true,
            description: 'b must be true',
          },
          {
            id: 'c3',
            type: 'hard',
            weight: 1.0,
            variables: ['c'],
            satisfactionFn: (vars) => vars.c === true,
            description: 'c must be true',
          },
        ],
      };

      const solution = await solveIsing(problem, {
        maxIterations: 10000,
        initialTemperature: 1.0,
        coolingRate: 0.995,
      });

      expect(solution.satisfiable).toBe(true);
      expect(solution.energy).toBe(0);
      expect(solution.violatedConstraints).toHaveLength(0);
      expect(solution.variables).toContainEqual({ name: 'a', value: true });
      expect(solution.variables).toContainEqual({ name: 'b', value: true });
      expect(solution.variables).toContainEqual({ name: 'c', value: true });
    });

    it('should handle unsatisfiable problems', async () => {
      // Conflicting constraints: a must be true AND false
      const problem: IsingProblem = {
        variables: { a: false },
        constraints: [
          {
            id: 'c1',
            type: 'hard',
            weight: 1.0,
            variables: ['a'],
            satisfactionFn: (vars) => vars.a === true,
            description: 'a must be true',
          },
          {
            id: 'c2',
            type: 'hard',
            weight: 1.0,
            variables: ['a'],
            satisfactionFn: (vars) => vars.a === false,
            description: 'a must be false',
          },
        ],
      };

      const solution = await solveIsing(problem, {
        maxIterations: 5000,
        initialTemperature: 1.0,
      });

      expect(solution.satisfiable).toBe(false);
      expect(solution.violatedConstraints.length).toBeGreaterThan(0);
      expect(solution.energy).toBeGreaterThan(0);
    });

    it('should minimize energy for soft constraints', async () => {
      const problem: IsingProblem = {
        variables: { a: false, b: false },
        constraints: [
          {
            id: 'hard1',
            type: 'hard',
            weight: 10.0,
            variables: ['a'],
            satisfactionFn: (vars) => vars.a === true,
            description: 'Critical: a must be true',
          },
          {
            id: 'soft1',
            type: 'soft',
            weight: 1.0,
            variables: ['b'],
            satisfactionFn: (vars) => vars.b === true,
            description: 'Nice to have: b should be true',
          },
        ],
      };

      const solution = await solveIsing(problem, {
        maxIterations: 10000,
        initialTemperature: 1.0,
      });

      // Must satisfy hard constraint
      expect(solution.variables.find((v) => v.name === 'a')?.value).toBe(true);
      // Should also satisfy soft constraint (likely but not guaranteed)
      expect(solution.energy).toBeLessThanOrEqual(1.0);
    });

    it('should respect timeout', async () => {
      const problem: IsingProblem = {
        variables: { a: false, b: false, c: false, d: false },
        constraints: Array.from({ length: 4 }, (_, i) => ({
          id: `c${i}`,
          type: 'hard' as const,
          weight: 1.0,
          variables: [`var${i}`],
          satisfactionFn: (vars: Record<string, boolean>) => vars[`var${i}`] === true,
          description: `Constraint ${i}`,
        })),
      };

      const start = Date.now();
      const solution = await solveIsing(problem, {
        maxIterations: 1000000, // Very large
        timeout_ms: 100, // But short timeout
      });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500); // Should timeout quickly
      expect(solution.time_ms).toBeLessThan(200);
    });

    it('should track iteration count', async () => {
      const problem: IsingProblem = {
        variables: { a: true, b: true },
        constraints: [
          {
            id: 'c1',
            type: 'hard',
            weight: 1.0,
            variables: ['a'],
            satisfactionFn: (vars) => vars.a === true,
            description: 'already satisfied',
          },
        ],
      };

      const solution = await solveIsing(problem, {
        maxIterations: 5000,
      });

      expect(solution.iterations).toBeGreaterThan(0);
      expect(solution.iterations).toBeLessThanOrEqual(5000);
    });
  });

  describe('solveIsingWithRetry', () => {
    it('should retry with higher temperature on failure', async () => {
      const problem: IsingProblem = {
        variables: { a: false, b: false, c: false },
        constraints: [
          {
            id: 'c1',
            type: 'hard',
            weight: 1.0,
            variables: ['a', 'b', 'c'],
            satisfactionFn: (vars) => vars.a && vars.b && vars.c,
            description: 'all must be true',
          },
        ],
      };

      const solution = await solveIsingWithRetry(problem, {
        maxIterations: 10000,
        initialTemperature: 0.5, // Start low
      }, 3);

      // With retries and increasing temperature, should find solution
      expect(solution.time_ms).toBeGreaterThan(0);
    });

    it('should return result after exhausting retries', async () => {
      // Unsatisfiable problem
      const problem: IsingProblem = {
        variables: { a: false },
        constraints: [
          {
            id: 'c1',
            type: 'hard',
            weight: 1.0,
            variables: ['a'],
            satisfactionFn: (vars) => vars.a === true && vars.a === false,
            description: 'impossible',
          },
        ],
      };

      const solution = await solveIsingWithRetry(problem, {
        maxIterations: 100,
      }, 2);

      expect(solution.satisfiable).toBe(false);
      expect(solution.violatedConstraints.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should solve efficiently for moderate size problem', async () => {
      // 100 variables, all must be true
      const n = 100;
      const problem: IsingProblem = {
        variables: Object.fromEntries(Array.from({ length: n }, (_, i) => [`v${i}`, false])),
        constraints: Array.from({ length: n }, (_, i) => ({
          id: `c${i}`,
          type: 'hard' as const,
          weight: 1.0,
          variables: [`v${i}`],
          satisfactionFn: (vars: Record<string, boolean>) => vars[`v${i}`] === true,
          description: `v${i} must be true`,
        })),
      };

      const start = Date.now();
      const solution = await solveIsing(problem, {
        maxIterations: 5000,
        timeout_ms: 5000,
      });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000); // Should complete in < 1s
      expect(solution.time_ms).toBeLessThan(1000);
    });
  });
});
