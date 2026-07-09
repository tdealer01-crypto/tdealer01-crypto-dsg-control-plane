/**
 * Deterministic QUBO solver core (self-hosted "live" Ising solver).
 *
 * Greedy construction + seeded simulated-annealing sweeps + steepest-descent
 * polish. Minimizes E(x) = x^T Q x + c^T x over binary x.
 *
 * Determinism contract: the result is a pure function of (Q, linear, seed).
 * The iteration budget is derived from problem size only — never from wall
 * clock — so the same input always yields the same solution and energy.
 * This is what lets the DSG audit trail replay a live solve bit-for-bit.
 */

export interface QuboSolveInput {
  /** Symmetric QUBO matrix (n × n) */
  Q: number[][];
  /** Linear coefficients (length n) */
  linear: number[];
  /** Number of binary variables */
  numVariables: number;
  /** Seed for the annealing PRNG (default 0) */
  seed?: number;
}

export interface QuboSolveOutput {
  /** Binary solution vector (length n, values 0|1) */
  solution: number[];
  /** Energy of the solution: x^T Q x + c^T x (no constant term) */
  energy: number;
  /** Total variable-flip evaluations performed */
  evaluations: number;
  /** Solver identifier */
  version: string;
}

export const ISING_SOLVER_VERSION = 'dsg-anneal-v1';

/** mulberry32 — small deterministic PRNG, same stream for the same seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Contribution of variable i if set to 1, given the rest of x:
 * A_i = Q[i][i] + c_i + Σ_{j≠i} (Q[i][j] + Q[j][i]) x_j
 * Flipping i changes energy by +A_i (0→1) or -A_i (1→0).
 */
function contribution(Q: number[][], linear: number[], x: number[], i: number): number {
  let a = Q[i][i] + linear[i];
  for (let j = 0; j < x.length; j++) {
    if (j !== i && x[j] === 1) {
      a += Q[i][j] + Q[j][i];
    }
  }
  return a;
}

function totalEnergy(Q: number[][], linear: number[], x: number[]): number {
  let e = 0;
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== 1) continue;
    e += linear[i];
    for (let j = 0; j < x.length; j++) {
      if (x[j] === 1) e += Q[i][j];
    }
  }
  return e;
}

export function solveQubo(input: QuboSolveInput): QuboSolveOutput {
  const n = input.numVariables;
  const { Q, linear } = input;
  const rand = mulberry32(input.seed ?? 0);
  let evaluations = 0;

  // 1) Greedy construction: sequential pass, set x_i = 1 when it lowers energy.
  const x: number[] = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    evaluations++;
    if (contribution(Q, linear, x, i) < 0) x[i] = 1;
  }

  let energy = totalEnergy(Q, linear, x);
  let best = x.slice();
  let bestEnergy = energy;

  // 2) Seeded annealing sweeps. Budget depends on n only (determinism).
  const sweeps = Math.min(60, Math.max(12, Math.floor(2400 / Math.max(1, n))));
  // Initial temperature scaled to the largest absolute coefficient.
  let maxCoef = 1;
  for (let i = 0; i < n; i++) {
    maxCoef = Math.max(maxCoef, Math.abs(linear[i]));
    for (let j = 0; j < n; j++) maxCoef = Math.max(maxCoef, Math.abs(Q[i][j]));
  }
  let temperature = maxCoef;
  const cooling = 0.85;

  const order = Array.from({ length: n }, (_, i) => i);

  for (let sweep = 0; sweep < sweeps; sweep++) {
    // Deterministic Fisher–Yates shuffle from the seeded PRNG.
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    for (const i of order) {
      evaluations++;
      const a = contribution(Q, linear, x, i);
      const delta = x[i] === 0 ? a : -a;
      if (delta < 0 || rand() < Math.exp(-delta / Math.max(temperature, 1e-9))) {
        x[i] = 1 - x[i];
        energy += delta;
        if (energy < bestEnergy) {
          bestEnergy = energy;
          best = x.slice();
        }
      }
    }

    temperature *= cooling;
  }

  // 3) Steepest-descent polish on the best solution until a local optimum.
  const polished = best.slice();
  let improved = true;
  while (improved) {
    improved = false;
    let bestDelta = 0;
    let bestIdx = -1;
    for (let i = 0; i < n; i++) {
      evaluations++;
      const a = contribution(Q, linear, polished, i);
      const delta = polished[i] === 0 ? a : -a;
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      polished[bestIdx] = 1 - polished[bestIdx];
      bestEnergy += bestDelta;
      improved = true;
    }
  }

  return {
    solution: polished,
    energy: totalEnergy(Q, linear, polished),
    evaluations,
    version: ISING_SOLVER_VERSION,
  };
}
