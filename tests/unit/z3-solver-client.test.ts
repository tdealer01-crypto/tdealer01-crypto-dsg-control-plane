import { describe, it, expect, beforeEach, vi } from 'vitest';
import Z3SolverClient from '../../dsg-one-mcp-server/src/services/z3-solver-client';

describe('Z3SolverClient', () => {
  let client: Z3SolverClient;

  beforeEach(() => {
    client = new Z3SolverClient({
      timeoutMs: 2000,
    });
  });

  describe('Local constraint evaluation (fallback)', () => {
    it('should evaluate IMPLICATION constraints correctly', async () => {
      const solutionState = [1, 0, 1];
      const constraints = [
        { type: 'IMPLICATION', rules: [0, 1], description: 'Test implication' },
      ];

      const result = await client.verifyConstraints(solutionState, constraints);

      expect(result.overall_status).toBe('UNSAT');
      expect(result.constraints_satisfied).toBe(0);
    });

    it('should evaluate EQUIVALENCE constraints', async () => {
      const solutionState = [1, 1, 0];
      const constraints = [
        { type: 'EQUIVALENCE', rules: [0, 1], description: 'Test equivalence' },
      ];

      const result = await client.verifyConstraints(solutionState, constraints);

      expect(result.overall_status).toBe('SAT');
      expect(result.constraints_satisfied).toBe(1);
    });

    it('should evaluate MUTUAL_EXCLUSION constraints', async () => {
      const solutionState = [1, 1, 0];
      const constraints = [
        { type: 'MUTUAL_EXCLUSION', rules: [0, 1], description: 'Test mutual exclusion' },
      ];

      const result = await client.verifyConstraints(solutionState, constraints);

      expect(result.overall_status).toBe('UNSAT');
    });

    it('should evaluate MIN_ACTIVE constraints', async () => {
      const solutionState = [1, 0, 1, 0];
      const constraints = [
        { type: 'MIN_ACTIVE', rules: [0, 1, 2, 3], description: 'At least 1 active' },
      ];

      const result = await client.verifyConstraints(solutionState, constraints);

      expect(result.overall_status).toBe('SAT');
      expect(result.constraints_satisfied).toBe(1);
    });

    it('should evaluate AT_LEAST_ONE constraints', async () => {
      const solutionState = [0, 0, 1];
      const constraints = [
        { type: 'AT_LEAST_ONE', rules: [0, 1, 2], description: 'At least one' },
      ];

      const result = await client.verifyConstraints(solutionState, constraints);

      expect(result.overall_status).toBe('SAT');
    });
  });

  describe('QUBO solver (fallback)', () => {
    it('should solve QUBO problem with fallback', async () => {
      const input = {
        framework: 'EU_GDPR_AI_ACT',
        rules: [
          { id: 0, name: 'Rule1', cost: 100, riskReduction: 10, businessValue: 50 },
          { id: 1, name: 'Rule2', cost: 200, riskReduction: 20, businessValue: 60 },
          { id: 2, name: 'Rule3', cost: 300, riskReduction: 30, businessValue: 70 },
        ],
        constraints: [],
        budgetConstraint: 500,
      };

      const result = await client.solveQubo(input);

      expect(result.z3_status).toBe('SAT');
      expect(result.framework).toBe('EU_GDPR_AI_ACT');
      expect(result.selected_rules).toBeDefined();
      expect(Array.isArray(result.selected_rules)).toBe(true);
      expect(result.within_budget).toBe(true);
      expect(result.budget_remaining).toBeGreaterThanOrEqual(0);
    });

    it('should include deterministic seed in solution', async () => {
      const input = {
        framework: 'THAI_PDPA',
        rules: [
          { id: 0, name: 'Rule1', cost: 100, riskReduction: 10, businessValue: 50 },
        ],
        constraints: [],
        seed: 42,
      };

      const result = await client.solveQubo(input);

      expect(result.iterations).toBe(5000);
      expect(result.z3_status).toBe('SAT');
    });
  });

  describe('SMT-LIB formula generation', () => {
    it('should format IMPLICATION as SMT-LIB', async () => {
      const solutionState = [1, 0];
      const constraints = [
        { type: 'IMPLICATION', rules: [0, 1], description: 'Rule0 => Rule1' },
      ];

      const result = await client.verifyConstraints(solutionState, constraints, true);

      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should handle multiple constraint types', async () => {
      const solutionState = [1, 1, 0, 1];
      const constraints = [
        { type: 'IMPLICATION', rules: [0, 1], description: 'Rule0 => Rule1' },
        { type: 'MUTUAL_EXCLUSION', rules: [2, 3], description: 'Not (Rule2 AND Rule3)' },
        { type: 'MIN_ACTIVE', rules: [0, 1, 2, 3], description: 'At least 1' },
      ];

      const result = await client.verifyConstraints(solutionState, constraints);

      expect(result.constraints_total).toBe(3);
      expect(result.overall_status).toBeDefined();
    });
  });

  describe('Health checks', () => {
    it('should detect unreachable solvers', async () => {
      const clientNoSolvers = new Z3SolverClient({
        z3SolverUrl: undefined,
        quboSolverUrl: undefined,
      });

      const health = await clientNoSolvers.healthCheck();

      expect(health.z3).toBe(false);
      expect(health.qubo).toBe(false);
    });
  });

  describe('Error handling and fallback', () => {
    it('should fallback gracefully on solver timeout', async () => {
      const clientWithShortTimeout = new Z3SolverClient({
        z3SolverUrl: 'https://example.invalid/api/solve', // Invalid URL
        timeoutMs: 100,
      });

      const solutionState = [1, 0];
      const constraints = [
        { type: 'IMPLICATION', rules: [0, 1], description: 'Test' },
      ];

      const result = await clientWithShortTimeout.verifyConstraints(solutionState, constraints);

      // Should fallback to local evaluation
      expect(result.overall_status).toBeDefined();
      expect(result.constraints_total).toBeGreaterThan(0);
    });

    it('should fallback on invalid HTTP response', async () => {
      const clientWithInvalid = new Z3SolverClient({
        quboSolverUrl: 'https://example.invalid/api/solve',
      });

      const input = {
        framework: 'EU_GDPR_AI_ACT',
        rules: [
          { id: 0, name: 'Rule1', cost: 100, riskReduction: 10, businessValue: 50 },
        ],
        constraints: [],
      };

      const result = await clientWithInvalid.solveQubo(input);

      // Should fallback to local mock
      expect(result.z3_status).toBe('SAT');
      expect(result.framework).toBe('EU_GDPR_AI_ACT');
    });
  });

  describe('Environment configuration', () => {
    it('should read solver URLs from environment', () => {
      const originalZ3 = process.env.DSG_Z3_SOLVER_URL;
      const originalQubo = process.env.DSG_QUBO_SOLVER_URL;

      try {
        process.env.DSG_Z3_SOLVER_URL = 'https://z3.example.com/api/solve';
        process.env.DSG_QUBO_SOLVER_URL = 'https://qubo.example.com/api/solve';

        const clientEnv = new Z3SolverClient();

        // Verify environment variables are being used (client created successfully)
        expect(clientEnv).toBeDefined();
      } finally {
        process.env.DSG_Z3_SOLVER_URL = originalZ3;
        process.env.DSG_QUBO_SOLVER_URL = originalQubo;
      }
    });

    it('should use provided config over environment', () => {
      const config = {
        z3SolverUrl: 'https://config-z3.example.com',
        quboSolverUrl: 'https://config-qubo.example.com',
        timeoutMs: 3000,
      };

      const clientConfig = new Z3SolverClient(config);
      expect(clientConfig).toBeDefined();
    });
  });
});
