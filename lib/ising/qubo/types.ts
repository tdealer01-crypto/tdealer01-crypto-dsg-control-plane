/**
 * Deterministic QUBO / Ising policy-optimization types.
 *
 * The existing `lib/ising/solver.ts` searches boolean assignments against
 * callback predicates. This module adds the missing algebraic layer: an
 * explicit upper-triangular QUBO matrix, the exact QUBO <-> Ising transform,
 * formal constraint encodings, and a reproducible annealing trajectory.
 */

/** A selectable policy control with its decision weights. */
export interface PolicyControl {
  /** Stable identifier, e.g. a CCVS requirement_id. */
  id: string;
  /** Business value gained by selecting this control. */
  value: number;
  /** Risk reduction gained by selecting this control. */
  riskReduction: number;
  /** Cost incurred by selecting this control. */
  cost: number;
  /** Optional human-readable label carried through to results. */
  label?: string;
  /** Optional framework/source tag carried through to results. */
  framework?: string;
}

export type FormalConstraint =
  /** A -> B : selecting `antecedent` requires `consequent`. */
  | { kind: 'implication'; id: string; antecedent: string; consequent: string; penalty?: number }
  /** A <-> B : both selected or both unselected. */
  | { kind: 'equivalence'; id: string; left: string; right: string; penalty?: number }
  /** NOT (A AND B) : the two controls cannot both be selected. */
  | { kind: 'mutual_exclusion'; id: string; left: string; right: string; penalty?: number }
  /** sum(x_i) >= k over `controls`. */
  | { kind: 'at_least'; id: string; controls: string[]; minimum: number; penalty?: number }
  /** sum(cost_i * x_i) <= budget over all controls. */
  | { kind: 'budget_cap'; id: string; budget: number; penalty?: number };

export interface QuboProblem {
  controls: PolicyControl[];
  constraints: FormalConstraint[];
  /** Penalty weight applied to constraints that do not set their own. */
  defaultPenalty?: number;
  /**
   * Granularity used when binary-encoding slack for inequality constraints
   * (`at_least`, `budget_cap`). Costs and budgets are divided by this value and
   * rounded, so a granularity of 1 assumes integral costs. Default 1.
   */
  slackGranularity?: number;
}

/**
 * Upper-triangular QUBO matrix over `variables`.
 *
 * Energy is `sum_{i <= j} Q[i][j] * x_i * x_j` with `x in {0, 1}`; because
 * `x_i^2 = x_i`, the diagonal carries the linear terms.
 */
export interface QuboMatrix {
  /** Variable names in matrix order: decision variables first, then slack. */
  variables: string[];
  /** Number of leading entries in `variables` that are real controls. */
  decisionCount: number;
  /** `matrix[i][j]` is defined for `j >= i`; lower entries are 0. */
  matrix: number[][];
  /** Constant energy offset contributed by constraint encodings. */
  offset: number;
}

/** Ising form: `E(s) = offset + sum_i h_i s_i + sum_{i<j} J_ij s_i s_j`. */
export interface IsingModel {
  variables: string[];
  /** Local fields, indexed like `variables`. */
  h: number[];
  /** Upper-triangular couplings; `J[i][j]` defined for `j > i`. */
  J: number[][];
  offset: number;
}

export interface ConstraintVerdict {
  constraintId: string;
  kind: FormalConstraint['kind'];
  satisfied: boolean;
  /** Formal statement that was checked, in the pseudo-boolean form used. */
  formalExpression: string;
  detail: string;
}

export interface AnnealStep {
  sequence: number;
  variable: string;
  flippedTo: boolean;
  accepted: boolean;
  temperature: number;
  energyBefore: number;
  energyAfter: number;
  deltaEnergy: number;
  /** SHA-256 over this step bound to the previous step's hash. */
  stepHash: string;
  previousHash: string | null;
}

export interface AnnealConfig {
  /** Seed for the Mulberry32 PRNG. Identical seeds reproduce identical runs. */
  seed?: number;
  maxIterations?: number;
  initialTemperature?: number;
  /** Multiplicative cooling factor per iteration, 0 < rate < 1. */
  coolingRate?: number;
  /** Retain at most this many trajectory steps in the result. Default 0. */
  retainTrajectorySteps?: number;
}

export interface QuboSolution {
  /** Selected control ids, in catalog order. */
  selected: string[];
  /** Assignment over every matrix variable, slack included. */
  assignment: Record<string, boolean>;
  /** QUBO energy of `assignment`, including constraint penalties. */
  energy: number;
  totalValue: number;
  totalRiskReduction: number;
  totalCost: number;
  /** Exact verification of every constraint against `assignment`. */
  verdicts: ConstraintVerdict[];
  feasible: boolean;
  iterations: number;
  finalTemperature: number;
  /** Head of the SHA-256 provenance chain over the annealing trajectory. */
  provenanceHash: string;
  trajectory: AnnealStep[];
  seed: number;
  solverVersion: string;
}
