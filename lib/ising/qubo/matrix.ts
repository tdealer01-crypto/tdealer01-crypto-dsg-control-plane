import type {
  FormalConstraint,
  IsingModel,
  PolicyControl,
  QuboMatrix,
  QuboProblem,
} from './types';

export const DEFAULT_PENALTY = 100;
export const DEFAULT_SLACK_GRANULARITY = 1;

/**
 * Binary weights that represent every integer in [0, maxValue] exactly once
 * per achievable total: powers of two, with the final coefficient truncated so
 * the encoding cannot overshoot `maxValue`.
 */
export function slackWeights(maxValue: number): number[] {
  const bound = Math.floor(maxValue);
  if (!Number.isFinite(bound) || bound <= 0) return [];
  const weights: number[] = [];
  let covered = 0;
  let power = 1;
  while (covered + power <= bound) {
    weights.push(power);
    covered += power;
    power *= 2;
  }
  if (covered < bound) weights.push(bound - covered);
  return weights;
}

interface PenaltyTerm {
  /** Coefficient per variable index. */
  coefficients: Map<number, number>;
  /** Additive constant inside the squared expression. */
  constant: number;
  penalty: number;
}

class MatrixBuilder {
  readonly variables: string[];
  private readonly index = new Map<string, number>();
  private readonly cells = new Map<string, number>();
  offset = 0;

  constructor(variables: string[]) {
    this.variables = [...variables];
    this.variables.forEach((name, i) => this.index.set(name, i));
  }

  indexOf(name: string): number {
    const i = this.index.get(name);
    if (i === undefined) throw new Error(`Unknown QUBO variable: ${name}`);
    return i;
  }

  addVariable(name: string): number {
    if (this.index.has(name)) throw new Error(`Duplicate QUBO variable: ${name}`);
    const i = this.variables.length;
    this.variables.push(name);
    this.index.set(name, i);
    return i;
  }

  add(i: number, j: number, weight: number): void {
    if (weight === 0) return;
    const [lo, hi] = i <= j ? [i, j] : [j, i];
    const key = `${lo}:${hi}`;
    this.cells.set(key, (this.cells.get(key) ?? 0) + weight);
  }

  build(decisionCount: number): QuboMatrix {
    const size = this.variables.length;
    const matrix: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0));
    for (const [key, weight] of this.cells) {
      const [lo, hi] = key.split(':').map(Number);
      matrix[lo][hi] = weight;
    }
    return { variables: this.variables, decisionCount, matrix, offset: this.offset };
  }
}

/** Expand `penalty * (sum(coef_k * y_k) + constant)^2` into QUBO cells. */
function applySquaredPenalty(builder: MatrixBuilder, term: PenaltyTerm): void {
  const entries = [...term.coefficients.entries()];
  const { constant, penalty } = term;
  for (const [i, a] of entries) {
    // y^2 = y for binary y, so the square of each coefficient folds into the
    // diagonal together with the cross term against the constant.
    builder.add(i, i, penalty * (a * a + 2 * constant * a));
  }
  for (let k = 0; k < entries.length; k += 1) {
    for (let l = k + 1; l < entries.length; l += 1) {
      builder.add(entries[k][0], entries[l][0], 2 * penalty * entries[k][1] * entries[l][1]);
    }
  }
  builder.offset += penalty * constant * constant;
}

function addCoefficient(coefficients: Map<number, number>, index: number, value: number): void {
  coefficients.set(index, (coefficients.get(index) ?? 0) + value);
}

/**
 * Build the upper-triangular QUBO matrix for a policy-selection problem.
 *
 * The objective minimises `sum_i (cost_i - value_i - riskReduction_i) * x_i`,
 * which is equivalent to maximising net benefit. Constraints are added as
 * penalty terms; `at_least` and `budget_cap` introduce binary slack variables
 * so the inequality is encoded exactly rather than approximated.
 */
export function buildQuboMatrix(problem: QuboProblem): QuboMatrix {
  assertUniqueControls(problem.controls);
  const defaultPenalty = problem.defaultPenalty ?? DEFAULT_PENALTY;
  const granularity = problem.slackGranularity ?? DEFAULT_SLACK_GRANULARITY;
  if (!(granularity > 0)) throw new Error('slackGranularity must be greater than 0');

  const decisionCount = problem.controls.length;
  const builder = new MatrixBuilder(problem.controls.map((c) => c.id));

  for (const control of problem.controls) {
    const i = builder.indexOf(control.id);
    builder.add(i, i, control.cost - control.value - control.riskReduction);
  }

  for (const constraint of problem.constraints) {
    const penalty = constraint.penalty ?? defaultPenalty;
    if (penalty < 0) throw new Error(`Constraint ${constraint.id} has a negative penalty`);
    encodeConstraint(builder, problem, constraint, penalty, granularity);
  }

  return builder.build(decisionCount);
}

function encodeConstraint(
  builder: MatrixBuilder,
  problem: QuboProblem,
  constraint: FormalConstraint,
  penalty: number,
  granularity: number,
): void {
  switch (constraint.kind) {
    case 'implication': {
      // x_A - x_A x_B <= 0
      const a = builder.indexOf(constraint.antecedent);
      const b = builder.indexOf(constraint.consequent);
      builder.add(a, a, penalty);
      builder.add(a, b, -penalty);
      return;
    }
    case 'equivalence': {
      // (x_A - x_B)^2 = x_A + x_B - 2 x_A x_B
      const l = builder.indexOf(constraint.left);
      const r = builder.indexOf(constraint.right);
      builder.add(l, l, penalty);
      builder.add(r, r, penalty);
      builder.add(l, r, -2 * penalty);
      return;
    }
    case 'mutual_exclusion': {
      // x_A x_B = 0
      builder.add(builder.indexOf(constraint.left), builder.indexOf(constraint.right), penalty);
      return;
    }
    case 'at_least': {
      // sum(x_i) - k - s = 0, with s in [0, |controls| - k]
      const minimum = Math.max(0, Math.floor(constraint.minimum));
      if (minimum === 0) return;
      const coefficients = new Map<number, number>();
      for (const id of constraint.controls) addCoefficient(coefficients, builder.indexOf(id), 1);
      const slackMax = constraint.controls.length - minimum;
      for (const [bit, weight] of slackWeights(slackMax).entries()) {
        const index = builder.addVariable(`slack:${constraint.id}:${bit}`);
        addCoefficient(coefficients, index, -weight);
      }
      applySquaredPenalty(builder, { coefficients, constant: -minimum, penalty });
      return;
    }
    case 'budget_cap': {
      // sum(c_i x_i) + s - B = 0, with s in [0, B], on the granularity grid
      const budget = Math.floor(constraint.budget / granularity);
      const coefficients = new Map<number, number>();
      for (const control of problem.controls) {
        const scaled = Math.round(control.cost / granularity);
        if (scaled !== 0) addCoefficient(coefficients, builder.indexOf(control.id), scaled);
      }
      for (const [bit, weight] of slackWeights(budget).entries()) {
        const index = builder.addVariable(`slack:${constraint.id}:${bit}`);
        addCoefficient(coefficients, index, weight);
      }
      applySquaredPenalty(builder, { coefficients, constant: -budget, penalty });
      return;
    }
    default: {
      const exhaustive: never = constraint;
      throw new Error(`Unsupported constraint: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function assertUniqueControls(controls: PolicyControl[]): void {
  const seen = new Set<string>();
  for (const control of controls) {
    if (seen.has(control.id)) throw new Error(`Duplicate control id: ${control.id}`);
    seen.add(control.id);
  }
}

/** Energy of a 0/1 assignment: `sum_{i <= j} Q[i][j] x_i x_j + offset`. */
export function quboEnergy(qubo: QuboMatrix, assignment: Record<string, boolean>): number {
  const bits = qubo.variables.map((name) => (assignment[name] ? 1 : 0));
  let energy = qubo.offset;
  for (let i = 0; i < bits.length; i += 1) {
    if (bits[i] === 0) continue;
    for (let j = i; j < bits.length; j += 1) {
      if (bits[j] === 1) energy += qubo.matrix[i][j];
    }
  }
  return energy;
}

/**
 * Exact QUBO -> Ising transform under `x_i = (1 + s_i) / 2`.
 *
 * Energies agree for every assignment, which is what makes the spin form a
 * faithful rewrite rather than a re-parameterisation.
 */
export function toIsingModel(qubo: QuboMatrix): IsingModel {
  const size = qubo.variables.length;
  const h = new Array<number>(size).fill(0);
  const J: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  let offset = qubo.offset;

  for (let i = 0; i < size; i += 1) {
    const diagonal = qubo.matrix[i][i];
    h[i] += diagonal / 2;
    offset += diagonal / 2;
    for (let j = i + 1; j < size; j += 1) {
      const coupling = qubo.matrix[i][j];
      if (coupling === 0) continue;
      J[i][j] += coupling / 4;
      h[i] += coupling / 4;
      h[j] += coupling / 4;
      offset += coupling / 4;
    }
  }

  return { variables: qubo.variables, h, J, offset };
}

/** Energy of a spin assignment in `{-1, +1}`. */
export function isingEnergy(model: IsingModel, spins: Record<string, -1 | 1>): number {
  const values = model.variables.map((name) => spins[name] ?? -1);
  let energy = model.offset;
  for (let i = 0; i < values.length; i += 1) {
    energy += model.h[i] * values[i];
    for (let j = i + 1; j < values.length; j += 1) {
      if (model.J[i][j] !== 0) energy += model.J[i][j] * values[i] * values[j];
    }
  }
  return energy;
}

/** `x in {0,1}` -> `s in {-1,+1}`. */
export function toSpins(assignment: Record<string, boolean>): Record<string, -1 | 1> {
  const spins: Record<string, -1 | 1> = {};
  for (const [name, value] of Object.entries(assignment)) spins[name] = value ? 1 : -1;
  return spins;
}

/** `s in {-1,+1}` -> `x in {0,1}`. */
export function toBits(spins: Record<string, -1 | 1>): Record<string, boolean> {
  const assignment: Record<string, boolean> = {};
  for (const [name, value] of Object.entries(spins)) assignment[name] = value === 1;
  return assignment;
}
