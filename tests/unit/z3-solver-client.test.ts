import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Z3SolverClient from '../../dsg-one-mcp-server/src/services/z3-solver-client';

/**
 * Truth-boundary tests for the external Z3/QUBO client.
 *
 * These tests deliberately do not stand up a fake solver service. When no real
 * solver URL is configured, the only correct result is UNKNOWN/unavailable.
 * Positive SAT/UNSAT evidence must come from a configured solver integration,
 * never from a unit-test fallback.
 */
describe('Z3SolverClient truth boundary', () => {
  let client: Z3SolverClient;

  beforeEach(() => {
    vi.stubEnv('DSG_Z3_SOLVER_URL', '');
    vi.stubEnv('DSG_QUBO_SOLVER_URL', '');
    client = new Z3SolverClient({ timeoutMs: 2000 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('constraint verification without a configured solver', () => {
    const cases = [
      { type: 'IMPLICATION', rules: [0, 1] },
      { type: 'EQUIVALENCE', rules: [0, 1] },
      { type: 'MUTUAL_EXCLUSION', rules: [0, 1] },
      { type: 'MIN_ACTIVE', rules: [0, 1, 2] },
      { type: 'AT_LEAST_ONE', rules: [0, 1, 2] },
    ];

    for (const constraint of cases) {
      it(`does not fabricate ${constraint.type} SAT/UNSAT evidence`, async () => {
        const result = await client.verifyConstraints(
          [1, 0, 1],
          [{ ...constraint, description: `test ${constraint.type}` }],
          true,
        );

        expect(result.overall_status).toBe('UNKNOWN');
        expect(result.solver_available).toBe(false);
        expect(result.error).toBe('z3_solver_not_configured');
        expect(result.constraints_satisfied).toBe(0);
        expect(result.constraints_total).toBe(1);
        expect(result.results).toEqual([]);
      });
    }
  });

  describe('QUBO solve without a configured solver', () => {
    it('returns unavailable evidence rather than a synthetic optimum', async () => {
      const result = await client.solveQubo({
        framework: 'EU_GDPR_AI_ACT',
        rules: [
          { id: 0, name: 'Rule1', cost: 100, riskReduction: 10, businessValue: 50 },
          { id: 1, name: 'Rule2', cost: 200, riskReduction: 20, businessValue: 60 },
        ],
        constraints: [],
        budgetConstraint: 500,
        seed: 42,
      });

      expect(result.z3_status).toBe('UNKNOWN');
      expect(result.solver_available).toBe(false);
      expect(result.error).toBe('qubo_solver_not_configured');
      expect(result.selected_rules).toEqual([]);
      expect(result.solution_hash).toBe('');
      expect(result.iterations).toBe(0);
      expect(result.within_budget).toBe(false);
      expect(result.framework).toBe('EU_GDPR_AI_ACT');
    });
  });

  describe('health checks', () => {
    it('reports both external solvers unavailable when they are not configured', async () => {
      await expect(client.healthCheck()).resolves.toEqual({ z3: false, qubo: false });
    });
  });

  describe('configuration', () => {
    it('accepts explicit real-solver endpoints without proving their availability', () => {
      const configured = new Z3SolverClient({
        z3SolverUrl: 'https://z3.example.com/api/solve',
        quboSolverUrl: 'https://qubo.example.com/api/solve',
        timeoutMs: 3000,
      });

      expect(configured).toBeDefined();
      // Connectivity/SAT evidence is intentionally not asserted in a unit test;
      // the configured integration must provide that evidence at runtime.
    });
  });
});
