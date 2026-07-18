import type {
  IsingProblem,
  IsingSolution,
  IsingConfig,
  IsingVariable,
} from './types';

/**
 * Simulated Annealing solver for Ising-like constraint satisfaction problems
 *
 * Algorithm:
 * 1. Start with random configuration
 * 2. Iteratively flip spins (variables)
 * 3. Accept moves based on energy change + temperature
 * 4. Cool down temperature → converge to low-energy state
 * 5. Return best solution found
 */

function calculateEnergy(
  problem: IsingProblem,
  configuration: Record<string, boolean>,
): { energy: number; violated: string[] } {
  let totalEnergy = 0;
  const violated: string[] = [];

  for (const constraint of problem.constraints) {
    const satisfied = constraint.satisfactionFn(configuration);
    if (!satisfied) {
      violated.push(constraint.id);
      totalEnergy += constraint.weight;
    }
  }

  return { energy: totalEnergy, violated };
}

function randomBoolean(seed: number): boolean {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x) > 0.5;
}

export async function solveIsing(
  problem: IsingProblem,
  config: IsingConfig = {},
): Promise<IsingSolution> {
  const startMs = Date.now();
  const maxIterations = config.maxIterations ?? 5000;
  const initialTemp = config.initialTemperature ?? 1.0;
  const coolingRate = config.coolingRate ?? 0.995;
  const timeout_ms = config.timeout_ms ?? 10000;
  let randomSeed = config.randomSeed ?? Math.random() * 1000000;

  // Current and best solutions
  let current = { ...problem.variables };
  let best = { ...current };

  const currentEnergy = calculateEnergy(problem, current);
  let currentE = currentEnergy.energy;
  let bestE = currentE;

  let temperature = initialTemp;
  let iteration = 0;

  // Simulated annealing loop
  while (iteration < maxIterations && Date.now() - startMs < timeout_ms) {
    // Pick random variable to flip
    const varNames = Object.keys(problem.variables);
    if (varNames.length === 0) break;

    randomSeed = (randomSeed * 1103515245 + 12345) % (2 ** 31); // LCG PRNG
    const varIdx = Math.abs(randomSeed) % varNames.length;
    const varName = varNames[varIdx];

    // Flip spin
    const newConfig = { ...current, [varName]: !current[varName] };
    const newEnergy = calculateEnergy(problem, newConfig);
    const newE = newEnergy.energy;

    // Metropolis criterion
    const deltaE = newE - currentE;
    const acceptanceProbability = Math.exp(-deltaE / Math.max(temperature, 0.001));

    randomSeed = (randomSeed * 1103515245 + 12345) % (2 ** 31);
    const rand = Math.abs(randomSeed) % 1000 / 1000;

    if (deltaE < 0 || rand < acceptanceProbability) {
      current = newConfig;
      currentE = newE;

      // Track best solution
      if (currentE < bestE) {
        best = { ...current };
        bestE = currentE;
      }
    }

    // Cool down
    temperature *= coolingRate;
    iteration++;
  }

  // Evaluate final best solution
  const finalEnergy = calculateEnergy(problem, best);

  const variables: IsingVariable[] = Object.entries(best).map(([name, value]) => ({
    name,
    value,
  }));

  return {
    satisfiable: finalEnergy.violated.length === 0,
    variables,
    energy: finalEnergy.energy,
    violatedConstraints: finalEnergy.violated,
    iterations: iteration,
    temperature_final: temperature,
    solver_version: '1.0-ising-sa',
    time_ms: Date.now() - startMs,
  };
}

/**
 * Solve with retry strategy: if first attempt doesn't find solution,
 * try again with higher temperature and different seed
 */
export async function solveIsingWithRetry(
  problem: IsingProblem,
  config: IsingConfig = {},
  maxRetries: number = 3,
): Promise<IsingSolution> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await solveIsing(problem, {
      ...config,
      initialTemperature: (config.initialTemperature ?? 1.0) * (1 + attempt * 0.5),
      randomSeed: Math.random() * 1000000,
    });

    if (result.satisfiable) {
      return result;
    }

    if (attempt === maxRetries - 1) {
      return result; // Last attempt, return even if unsatisfiable
    }

    // Wait before retry
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error('Ising solver exhausted all retries');
}
