/**
 * Warm-start strategies for Ising solver
 *
 * Provides good initial solution → faster convergence
 */

import type { IsingProblem, IsingConstraint } from './types';

/**
 * Greedy strategy: iteratively satisfy highest-weight constraints
 *
 * 1. Sort constraints by weight (descending)
 * 2. For each constraint, flip variables to satisfy it
 * 3. Return configuration that satisfies most high-weight constraints
 */
export function greedyWarmStart(problem: IsingProblem): Record<string, boolean> {
  const config = { ...problem.variables };
  const constraints = [...problem.constraints].sort(
    (a, b) => b.weight - a.weight,
  );

  for (const constraint of constraints) {
    // Try to satisfy this constraint
    const satisfied = constraint.satisfactionFn(config);
    if (!satisfied && constraint.variables.length > 0) {
      // Flip each variable in constraint one at a time
      for (const varName of constraint.variables) {
        const testConfig = { ...config, [varName]: !config[varName] };
        if (constraint.satisfactionFn(testConfig)) {
          config[varName] = !config[varName];
          break;
        }
      }
    }
  }

  return config;
}

/**
 * Genetic algorithm warm-start: evolve population of solutions
 *
 * 1. Generate random population
 * 2. Evaluate fitness (constraints satisfied, energy minimized)
 * 3. Select best solutions
 * 4. Mutate and crossover
 * 5. Return fittest individual
 */
export function geneticWarmStart(
  problem: IsingProblem,
  config: { populationSize?: number; generations?: number } = {},
): Record<string, boolean> {
  const populationSize = config.populationSize ?? 20;
  const generations = config.generations ?? 10;

  // Initialize population
  let population: Record<string, boolean>[] = [];
  for (let i = 0; i < populationSize; i++) {
    const individual: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(problem.variables)) {
      individual[key] = Math.random() > 0.5 ? !value : value;
    }
    population.push(individual);
  }

  // Evaluate fitness
  function fitness(solution: Record<string, boolean>): number {
    let score = 0;
    for (const constraint of problem.constraints) {
      if (constraint.satisfactionFn(solution)) {
        score += constraint.weight;
      }
    }
    return score;
  }

  // Evolve
  for (let gen = 0; gen < generations; gen++) {
    // Sort by fitness (descending)
    population.sort((a, b) => fitness(b) - fitness(a));

    // Keep top 50% + create new generation by mutation/crossover
    const elite = population.slice(0, Math.ceil(populationSize / 2));
    const newPopulation: Record<string, boolean>[] = [];

    // Keep elite
    newPopulation.push(...elite);

    // Create offspring via mutation + crossover
    while (newPopulation.length < populationSize) {
      // Select random parents from elite
      const parent1 = elite[Math.floor(Math.random() * elite.length)];
      const parent2 = elite[Math.floor(Math.random() * elite.length)];

      // Crossover
      const offspring: Record<string, boolean> = {};
      for (const key of Object.keys(problem.variables)) {
        offspring[key] = Math.random() > 0.5 ? parent1[key] : parent2[key];
      }

      // Mutation
      if (Math.random() < 0.1) {
        const mutateKey =
          Object.keys(problem.variables)[
            Math.floor(Math.random() * Object.keys(problem.variables).length)
          ];
        offspring[mutateKey] = !offspring[mutateKey];
      }

      newPopulation.push(offspring);
    }

    population = newPopulation;
  }

  // Return fittest
  return population.reduce((best, current) =>
    fitness(current) > fitness(best) ? current : best,
  );
}

/**
 * Constraint propagation: simple deduction from constraints
 *
 * If constraint has only 1 variable, that variable is determined
 */
export function constraintPropagationWarmStart(
  problem: IsingProblem,
): Record<string, boolean> {
  const config = { ...problem.variables };
  const determined = new Set<string>();

  let changed = true;
  while (changed) {
    changed = false;

    for (const constraint of problem.constraints) {
      if (constraint.type === 'hard' && constraint.variables.length === 1) {
        const varName = constraint.variables[0];
        if (!determined.has(varName)) {
          // Try both values, pick one that satisfies
          const testTrue = { ...config, [varName]: true };
          const testFalse = { ...config, [varName]: false };

          if (constraint.satisfactionFn(testTrue)) {
            config[varName] = true;
            determined.add(varName);
            changed = true;
          } else if (constraint.satisfactionFn(testFalse)) {
            config[varName] = false;
            determined.add(varName);
            changed = true;
          }
        }
      }
    }
  }

  return config;
}

/**
 * Hybrid warm-start: combine multiple strategies
 *
 * 1. Run constraint propagation (fast)
 * 2. Run greedy on remaining (medium)
 * 3. Run genetic on best 2 strategies (slow but good)
 * 4. Return fittest
 */
export function hybridWarmStart(problem: IsingProblem): Record<string, boolean> {
  function fitness(solution: Record<string, boolean>): number {
    let violations = 0;
    for (const constraint of problem.constraints) {
      if (!constraint.satisfactionFn(solution)) {
        violations += constraint.weight;
      }
    }
    return -violations; // Higher is better
  }

  // Strategy 1: Constraint propagation
  const s1 = constraintPropagationWarmStart(problem);

  // Strategy 2: Greedy
  const s2 = greedyWarmStart(problem);

  // Strategy 3: Genetic (short run)
  const s3 = geneticWarmStart(problem, {
    populationSize: 10,
    generations: 5,
  });

  // Return best
  const candidates = [s1, s2, s3];
  return candidates.reduce((best, current) =>
    fitness(current) > fitness(best) ? current : best,
  );
}

/**
 * Select warm-start strategy based on problem size
 */
export function selectWarmStartStrategy(
  problem: IsingProblem,
): Record<string, boolean> {
  const numVars = Object.keys(problem.variables).length;
  const numConstraints = problem.constraints.length;

  if (numVars < 10 && numConstraints < 10) {
    // Small problem: use genetic (explore thoroughly)
    return geneticWarmStart(problem, {
      populationSize: 30,
      generations: 20,
    });
  } else if (numVars < 100) {
    // Medium problem: use hybrid
    return hybridWarmStart(problem);
  } else {
    // Large problem: use greedy (fast)
    return greedyWarmStart(problem);
  }
}
