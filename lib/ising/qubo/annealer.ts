import { hashGatewayValue } from '../../gateway/audit';
import { assertConstraintsResolve, verifyConstraints } from './constraints';
import { createRng } from './deterministic-rng';
import { buildQuboMatrix, quboEnergy } from './matrix';
import type {
  AnnealConfig,
  AnnealStep,
  ConstraintVerdict,
  PolicyControl,
  QuboMatrix,
  QuboProblem,
  QuboSolution,
} from './types';

export const SOLVER_VERSION = 'dsg-qubo-anneal/1.0.0';
export const PROVENANCE_CHAIN_ROOT = 'dsg-qubo-provenance/1.0.0';

const DEFAULTS = {
  seed: 42,
  maxIterations: 5000,
  coolingRate: 0.995,
  retainTrajectorySteps: 0,
} as const;

/**
 * Start hot enough for the problem's own energy scale.
 *
 * A fixed initial temperature makes the chain greedy from the first move on
 * any problem whose weights are larger than it, which traps the search in
 * whichever basin it happens to enter first. Scaling with the largest matrix
 * entry keeps early moves genuinely exploratory regardless of the units the
 * caller expresses value, risk, and cost in.
 */
function defaultInitialTemperature(qubo: QuboMatrix): number {
  let largest = 0;
  for (let i = 0; i < qubo.matrix.length; i += 1) {
    for (let j = i; j < qubo.matrix.length; j += 1) {
      const magnitude = Math.abs(qubo.matrix[i][j]);
      if (magnitude > largest) largest = magnitude;
    }
  }
  return Math.max(1, largest);
}

/** Coupling between two distinct variables, read from the upper triangle. */
function coupling(matrix: number[][], a: number, b: number): number {
  return a < b ? matrix[a][b] : matrix[b][a];
}

/**
 * Energy contribution of variable `k` when it is set: its diagonal term plus
 * every coupling to a currently-set variable. Flipping `k` changes the total
 * energy by exactly `+/- localField`, so a step costs O(n) instead of O(n^2).
 */
function localField(qubo: QuboMatrix, bits: number[], k: number): number {
  let field = qubo.matrix[k][k];
  for (let i = 0; i < bits.length; i += 1) {
    if (i !== k && bits[i] === 1) field += coupling(qubo.matrix, i, k);
  }
  return field;
}

function toAssignment(variables: string[], bits: number[]): Record<string, boolean> {
  const assignment: Record<string, boolean> = {};
  variables.forEach((name, i) => {
    assignment[name] = bits[i] === 1;
  });
  return assignment;
}

/**
 * Deterministic simulated annealing over an explicit QUBO matrix.
 *
 * Identical `seed` and problem produce an identical trajectory, identical
 * energies, and an identical provenance hash: the PRNG is the only source of
 * randomness and it is seeded, so nothing in the run depends on wall-clock
 * time, iteration timing, or map ordering.
 */
export function solveQubo(problem: QuboProblem, config: AnnealConfig = {}): QuboSolution {
  assertConstraintsResolve(problem.controls, problem.constraints);
  const qubo = buildQuboMatrix(problem);

  const seed = config.seed ?? DEFAULTS.seed;
  const maxIterations = config.maxIterations ?? DEFAULTS.maxIterations;
  const coolingRate = config.coolingRate ?? DEFAULTS.coolingRate;
  const retain = config.retainTrajectorySteps ?? DEFAULTS.retainTrajectorySteps;
  if (!(coolingRate > 0 && coolingRate < 1)) {
    throw new Error('coolingRate must be strictly between 0 and 1');
  }

  const rng = createRng(seed);
  const size = qubo.variables.length;
  const bits = new Array<number>(size).fill(0);

  let temperature = config.initialTemperature ?? defaultInitialTemperature(qubo);
  let energy = qubo.offset;
  let bestEnergy = energy;
  let bestBits = [...bits];
  let bestFeasibleEnergy = Number.POSITIVE_INFINITY;
  let bestFeasibleBits: number[] | null = null;

  const evaluateFeasible = (candidate: number[]): boolean =>
    verifyConstraints(
      problem.controls,
      problem.constraints,
      toAssignment(qubo.variables, candidate),
    ).every((verdict) => verdict.satisfied);

  if (evaluateFeasible(bits)) {
    bestFeasibleEnergy = energy;
    bestFeasibleBits = [...bits];
  }

  let previousHash: string | null = null;
  let chainHash = hashGatewayValue({ root: PROVENANCE_CHAIN_ROOT, seed, variables: qubo.variables });
  const trajectory: AnnealStep[] = [];

  let iteration = 0;
  for (; iteration < maxIterations && size > 0; iteration += 1) {
    const k = rng.nextInt(size);
    const field = localField(qubo, bits, k);
    const flippedTo = bits[k] === 1 ? 0 : 1;
    const deltaEnergy = (flippedTo - bits[k]) * field;

    const accepted =
      deltaEnergy <= 0 || (temperature > 0 && rng.next() < Math.exp(-deltaEnergy / temperature));
    const energyBefore = energy;
    if (accepted) {
      bits[k] = flippedTo;
      energy += deltaEnergy;
      if (energy < bestEnergy) {
        bestEnergy = energy;
        bestBits = [...bits];
      }
      if (energy < bestFeasibleEnergy && evaluateFeasible(bits)) {
        bestFeasibleEnergy = energy;
        bestFeasibleBits = [...bits];
      }
    }

    const step: Omit<AnnealStep, 'stepHash'> = {
      sequence: iteration,
      variable: qubo.variables[k],
      flippedTo: flippedTo === 1,
      accepted,
      temperature,
      energyBefore,
      energyAfter: energy,
      deltaEnergy,
      previousHash,
    };
    // Every step is chained, whether or not it is retained, so the head hash
    // covers the whole trajectory rather than only the retained window.
    const stepHash = hashGatewayValue({ chain: chainHash, ...step });
    chainHash = stepHash;
    previousHash = stepHash;
    if (trajectory.length < retain) trajectory.push({ ...step, stepHash });

    temperature *= coolingRate;
  }

  const finalBits = polish(qubo, problem, bestFeasibleBits ?? bestBits, bestFeasibleBits !== null);
  const assignment = toAssignment(qubo.variables, finalBits);
  const verdicts: ConstraintVerdict[] = verifyConstraints(
    problem.controls,
    problem.constraints,
    assignment,
  );
  const selected = problem.controls.filter((c) => assignment[c.id]).map((c) => c.id);

  return {
    selected,
    assignment,
    energy: quboEnergy(qubo, assignment),
    totalValue: sumOver(problem.controls, assignment, (c) => c.value),
    totalRiskReduction: sumOver(problem.controls, assignment, (c) => c.riskReduction),
    totalCost: sumOver(problem.controls, assignment, (c) => c.cost),
    verdicts,
    feasible: verdicts.every((verdict) => verdict.satisfied),
    iterations: iteration,
    finalTemperature: temperature,
    provenanceHash: chainHash,
    trajectory,
    seed,
    solverVersion: SOLVER_VERSION,
  };
}

/**
 * Deterministic single-flip descent from the annealed state.
 *
 * Annealing ends wherever the cooling schedule left it, which is often one
 * flip away from a strictly better assignment. Scanning variables in matrix
 * order keeps the polish reproducible, and when the annealed state was
 * feasible the descent refuses any flip that would break feasibility.
 */
function polish(
  qubo: QuboMatrix,
  problem: QuboProblem,
  start: number[],
  requireFeasible: boolean,
): number[] {
  const bits = [...start];
  const isFeasible = (candidate: number[]): boolean =>
    verifyConstraints(
      problem.controls,
      problem.constraints,
      toAssignment(qubo.variables, candidate),
    ).every((verdict) => verdict.satisfied);

  let improved = true;
  let guard = 0;
  while (improved && guard < qubo.variables.length * 4) {
    improved = false;
    guard += 1;
    for (let k = 0; k < bits.length; k += 1) {
      const flippedTo = bits[k] === 1 ? 0 : 1;
      const deltaEnergy = (flippedTo - bits[k]) * localField(qubo, bits, k);
      if (deltaEnergy >= 0) continue;
      const candidate = [...bits];
      candidate[k] = flippedTo;
      if (requireFeasible && !isFeasible(candidate)) continue;
      bits[k] = flippedTo;
      improved = true;
    }
  }
  return bits;
}

function sumOver(
  controls: PolicyControl[],
  assignment: Record<string, boolean>,
  pick: (control: PolicyControl) => number,
): number {
  const total = controls.reduce((sum, c) => (assignment[c.id] ? sum + pick(c) : sum), 0);
  return Math.round(total * 1e6) / 1e6;
}

/**
 * Re-derive a provenance chain from retained steps.
 *
 * Returns the recomputed head hash, which equals the run's `provenanceHash`
 * only when every step was retained. A mismatch means the retained window is
 * partial or the steps were altered.
 */
export function replayProvenance(
  steps: AnnealStep[],
  seed: number,
  variables: string[],
): string {
  let chainHash = hashGatewayValue({ root: PROVENANCE_CHAIN_ROOT, seed, variables });
  for (const step of steps) {
    const { stepHash: _ignored, ...core } = step;
    chainHash = hashGatewayValue({ chain: chainHash, ...core });
  }
  return chainHash;
}
