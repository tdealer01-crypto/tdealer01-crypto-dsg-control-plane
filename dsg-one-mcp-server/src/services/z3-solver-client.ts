/**
 * Z3 Formal Proof Solver HTTP Client
 * Connects TypeScript MCP tools to external Z3 and QUBO solver services.
 *
 * Truth boundary: if the configured solver is missing, unreachable, or returns
 * an invalid response, this client returns UNKNOWN / unavailable evidence. It
 * never substitutes a local heuristic and never reports SAT without the solver.
 */

export interface Z3SolverConfig {
  z3SolverUrl?: string;
  quboSolverUrl?: string;
  timeoutMs?: number;
}

export class Z3SolverClient {
  private z3Url: string | null;
  private quboUrl: string | null;
  private timeoutMs: number;

  constructor(config: Z3SolverConfig = {}) {
    this.z3Url = config.z3SolverUrl || process.env.DSG_Z3_SOLVER_URL || null;
    this.quboUrl = config.quboSolverUrl || process.env.DSG_QUBO_SOLVER_URL || null;
    this.timeoutMs = config.timeoutMs || parseInt(process.env.DSG_SOLVER_TIMEOUT_MS || '5000', 10);
  }

  private unavailableVerification(constraints: any[], reason: string) {
    return {
      overall_status: 'UNKNOWN' as const,
      constraints_satisfied: 0,
      constraints_total: constraints.length,
      results: [],
      solver_available: false,
      error: reason,
    };
  }

  private unavailableQubo(
    input: {
      framework: string;
      rules: any[];
      constraints: any[];
      budgetConstraint?: number;
      seed?: number;
    },
    reason: string
  ) {
    const budget = input.budgetConstraint || 1500;
    return {
      selected_rules: [] as number[],
      total_cost: 0,
      total_risk_reduction: 0,
      total_business_value: 0,
      energy: 0,
      constraints_satisfied: 0,
      constraints_total: input.constraints.length,
      z3_status: 'UNKNOWN' as const,
      solution_hash: '',
      iterations: 0,
      framework: input.framework,
      within_budget: false,
      budget_remaining: budget,
      solver_available: false,
      error: reason,
    };
  }

  /**
   * Verify constraints using the configured external SMT solver.
   */
  async verifyConstraints(
    solutionState: number[],
    constraints: any[],
    verbose: boolean = false
  ): Promise<{
    overall_status: 'SAT' | 'UNSAT' | 'UNKNOWN';
    constraints_satisfied: number;
    constraints_total: number;
    results: any[];
    solver_available?: boolean;
    error?: string;
  }> {
    if (!this.z3Url) {
      return this.unavailableVerification(constraints, 'z3_solver_not_configured');
    }

    try {
      const constraintFormulas = constraints
        .map((c) => this.constraintToSMTLib(c, solutionState))
        .filter(Boolean);

      const smt2Formula = `(set-logic QF_LIA)\n${solutionState
        .map((_v, i) => `(declare-const rule_${i} () Int)`)
        .join('\n')}\n${solutionState
        .map((v, i) => `(assert (= rule_${i} ${v}))`)
        .join('\n')}\n${constraintFormulas.join('\n')}\n(check-sat)`;

      const response = await fetch(this.z3Url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smt2: smt2Formula,
          timeout_ms: this.timeoutMs,
        }),
        signal: AbortSignal.timeout(this.timeoutMs + 1000),
      });

      if (!response.ok) {
        console.error('[Z3 Client] Constraint verification failed:', response.status);
        return this.unavailableVerification(constraints, `z3_solver_http_${response.status}`);
      }

      const result = await response.json();
      const status =
        result?.status === 'sat'
          ? ('SAT' as const)
          : result?.status === 'unsat'
            ? ('UNSAT' as const)
            : ('UNKNOWN' as const);

      return {
        overall_status: status,
        constraints_satisfied: status === 'SAT' ? constraints.length : 0,
        constraints_total: constraints.length,
        results: verbose
          ? constraints.map((c, i) => ({
              constraint: c,
              satisfied: status === 'SAT',
              formula: constraintFormulas[i] || '',
            }))
          : [],
        solver_available: true,
      };
    } catch (error) {
      console.error('[Z3 Client] Error verifying constraints:', error);
      return this.unavailableVerification(constraints, 'z3_solver_unreachable');
    }
  }

  /**
   * Solve QUBO/Ising optimization using the configured external solver.
   */
  async solveQubo(input: {
    framework: string;
    rules: any[];
    constraints: any[];
    budgetConstraint?: number;
    seed?: number;
  }): Promise<{
    selected_rules: number[];
    total_cost: number;
    total_risk_reduction: number;
    total_business_value: number;
    energy: number;
    constraints_satisfied: number;
    constraints_total: number;
    z3_status: 'SAT' | 'UNSAT' | 'UNKNOWN';
    solution_hash: string;
    iterations: number;
    framework: string;
    within_budget: boolean;
    budget_remaining: number;
    solver_available?: boolean;
    error?: string;
  }> {
    if (!this.quboUrl) {
      return this.unavailableQubo(input, 'qubo_solver_not_configured');
    }

    try {
      const response = await fetch(this.quboUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          framework: input.framework,
          rules: input.rules,
          constraints: input.constraints,
          budget_constraint: input.budgetConstraint || 1500,
          seed: input.seed || 42,
        }),
        signal: AbortSignal.timeout(this.timeoutMs + 2000),
      });

      if (!response.ok) {
        console.error('[Z3 Client] QUBO solve failed:', response.status);
        return this.unavailableQubo(input, `qubo_solver_http_${response.status}`);
      }

      const result = await response.json();
      if (!result || !['SAT', 'UNSAT', 'UNKNOWN'].includes(result.z3_status)) {
        return this.unavailableQubo(input, 'qubo_solver_invalid_response');
      }

      return {
        ...result,
        solver_available: true,
      };
    } catch (error) {
      console.error('[Z3 Client] Error solving QUBO:', error);
      return this.unavailableQubo(input, 'qubo_solver_unreachable');
    }
  }

  /**
   * Convert DSG constraint to SMT-LIB formula.
   */
  private constraintToSMTLib(constraint: any, _solutionState: number[]): string | null {
    const { type, rules } = constraint;

    switch (type) {
      case 'IMPLICATION':
        return `(assert (=> (= rule_${rules[0]} 1) (= rule_${rules[1]} 1)))`;
      case 'EQUIVALENCE':
        return `(assert (= (= rule_${rules[0]} 1) (= rule_${rules[1]} 1)))`;
      case 'MUTUAL_EXCLUSION':
        return `(assert (not (and (= rule_${rules[0]} 1) (= rule_${rules[1]} 1))))`;
      case 'MIN_ACTIVE': {
        const sum = `(+ ${rules.map((r: number) => `rule_${r}`).join(' ')})`;
        return `(assert (>= ${sum} 1))`;
      }
      case 'MAX_COST':
        return null;
      case 'AT_LEAST_ONE': {
        const disjunction = rules.map((r: number) => `(= rule_${r} 1)`).join(' ');
        return `(assert (or ${disjunction}))`;
      }
      default:
        return null;
    }
  }

  async healthCheck(): Promise<{ z3: boolean; qubo: boolean }> {
    const checks = await Promise.all([
      this.checkZ3Health(),
      this.checkQuboHealth(),
    ]);
    return { z3: checks[0], qubo: checks[1] };
  }

  private async checkZ3Health(): Promise<boolean> {
    if (!this.z3Url) return false;
    try {
      const response = await fetch(this.z3Url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smt2: '(set-logic QF_LIA) (check-sat)',
          timeout_ms: 1000,
        }),
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkQuboHealth(): Promise<boolean> {
    if (!this.quboUrl) return false;
    try {
      const response = await fetch(this.quboUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework: 'EU_GDPR_AI_ACT' }),
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default Z3SolverClient;
