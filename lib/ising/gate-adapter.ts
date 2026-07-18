/**
 * Adapter: convert DSG deterministic constraints → Ising problem
 *
 * Bridges DSG deterministic gate framework with Ising solver
 */

import type {
  DeterministicConstraintResult,
  DeterministicProofRequest,
} from '../dsg/deterministic/types';
import type { IsingProblem, IsingConfig } from './types';
import { solveIsingWithRetry } from './solver';
import { hashDeterministicValue } from '../dsg/deterministic/proof-hash';

export function constraintsToIsingProblem(
  constraints: DeterministicConstraintResult[],
  request: DeterministicProofRequest,
): IsingProblem {
  const context = request.context ?? {};

  // Initialize variables from constraint evidence keys
  const variables: Record<string, boolean> = {};
  for (const constraint of constraints) {
    variables[constraint.evidenceKey] = context[constraint.evidenceKey] === true;
  }

  // Convert constraints to Ising constraints
  const isingConstraints = constraints.map((constraint) => ({
    id: constraint.constraintId,
    type: constraint.severity === 'critical' ? ('hard' as const) : ('soft' as const),
    weight: constraint.severity === 'critical' ? 10.0 : 1.0,
    variables: [constraint.evidenceKey],
    satisfactionFn: (vars: Record<string, boolean>) => vars[constraint.evidenceKey] === true,
    description: constraint.description,
  }));

  return {
    variables,
    constraints: isingConstraints,
  };
}

export async function evaluateGateWithIsingSolver(
  constraints: DeterministicConstraintResult[],
  request: DeterministicProofRequest,
  config?: IsingConfig,
) {
  const problem = constraintsToIsingProblem(constraints, request);

  const solution = await solveIsingWithRetry(problem, {
    maxIterations: 10000,
    initialTemperature: 1.0,
    coolingRate: 0.995,
    timeout_ms: 5000,
    ...config,
  });

  // Determine gate status from solution
  let status: 'PASS' | 'BLOCK' | 'REVIEW' = 'BLOCK';
  if (solution.satisfiable) {
    status = 'PASS';
  } else if (solution.violatedConstraints.length > 0) {
    // Check severity of violated constraints
    const violatedConstraints = constraints.filter((c) =>
      solution.violatedConstraints.includes(c.constraintId),
    );
    const hasCritical = violatedConstraints.some((c) => c.severity === 'critical');
    status = hasCritical ? 'BLOCK' : 'REVIEW';
  }

  const proofHash = hashDeterministicValue(
    JSON.stringify({
      constraints: solution.violatedConstraints,
      energy: solution.energy,
    }),
  );

  return {
    ok: status === 'PASS',
    gateStatus: status,
    proofStatus: solution.satisfiable ? 'PASS' : 'REVIEW' as const,
    reason: solution.violatedConstraints.length > 0
      ? `Ising solver: ${solution.violatedConstraints.length} constraints violated`
      : undefined,
    proof: {
      status: solution.satisfiable ? 'PASS' : 'REVIEW',
      solver: {
        name: 'ising-sa',
        version: solution.solver_version,
        solverInvoked: true,
      },
      proofHash,
      metadata: {
        energy: solution.energy,
        iterations: solution.iterations,
        temperature_final: solution.temperature_final,
        time_ms: solution.time_ms,
        violations: solution.violatedConstraints,
      },
    },
  };
}
