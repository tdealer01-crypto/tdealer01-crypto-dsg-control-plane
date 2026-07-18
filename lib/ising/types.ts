/**
 * Ising Model Solver Types
 *
 * Ising model: probabilistic constraint satisfaction solver
 * - Binary variables (spin up/down = true/false)
 * - Energy function = sum of constraint violations
 * - Goal: find configuration with minimum energy
 */

export interface IsingVariable {
  name: string;
  value: boolean; // spin: true=up, false=down
}

export interface IsingConstraint {
  id: string;
  type: 'hard' | 'soft';
  weight: number; // 1.0 for hard constraints
  variables: string[]; // variable names involved
  satisfactionFn: (vars: Record<string, boolean>) => boolean;
  description: string;
}

export interface IsingProblem {
  variables: Record<string, boolean>; // initial state
  constraints: IsingConstraint[];
}

export interface IsingSolution {
  satisfiable: boolean;
  variables: IsingVariable[];
  energy: number;
  violatedConstraints: string[];
  iterations: number;
  temperature_final: number;
  solver_version: string;
  time_ms: number;
}

export interface IsingConfig {
  maxIterations?: number;
  initialTemperature?: number;
  coolingRate?: number; // 0 < rate < 1
  randomSeed?: number;
  timeout_ms?: number;
}
