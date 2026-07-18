/**
 * Hybrid Solver: intelligent selector between Z3 and Ising
 *
 * Analyzes problem characteristics and chooses optimal solver:
 * - Z3: complex logic, exact proofs needed
 * - Ising: many variables, fast decision, soft constraints
 * - Parallel: both in parallel, return fastest successful
 */

import type {
  DeterministicConstraintResult,
  DeterministicProofRequest,
} from '../dsg/deterministic/types';
import { evaluateDeterministicGate } from '../dsg/deterministic/gate-engine';
import { evaluateGateWithIsingSolver } from './gate-adapter';
import type { IsingConfig } from './types';

export interface ProblemCharacteristics {
  numVariables: number;
  numConstraints: number;
  hardConstraintRatio: number; // 0-1: hard vs soft constraints
  criticalityRatio: number; // 0-1: critical vs non-critical
  avgConstraintArity: number; // avg variables per constraint
  hasComplexLogic: boolean;
}

export function analyzeProblem(
  constraints: DeterministicConstraintResult[],
): ProblemCharacteristics {
  const numConstraints = constraints.length;
  const numVariables = new Set(constraints.map((c) => c.evidenceKey)).size;

  const hardConstraints = constraints.filter(
    (c) => c.severity === 'critical',
  ).length;
  const hardConstraintRatio = numConstraints > 0 ? hardConstraints / numConstraints : 0;

  const criticalConstraints = constraints.filter(
    (c) => c.severity === 'critical',
  ).length;
  const criticalityRatio =
    numConstraints > 0 ? criticalConstraints / numConstraints : 0;

  const avgConstraintArity = numVariables > 0 ? numConstraints / numVariables : 0;

  // Heuristic: assume complex logic if many constraints per variable
  const hasComplexLogic = avgConstraintArity > 1.5;

  return {
    numVariables,
    numConstraints,
    hardConstraintRatio,
    criticalityRatio,
    avgConstraintArity,
    hasComplexLogic,
  };
}

export type SolverChoice = 'z3' | 'ising' | 'parallel';

export function selectSolver(
  characteristics: ProblemCharacteristics,
): SolverChoice {
  // Z3 preferred for:
  // - Complex logic (multiple constraints per variable)
  // - All hard constraints (exact proof needed)
  // - Small problems (Z3 scales better on small complex)
  if (characteristics.hasComplexLogic && characteristics.numVariables < 20) {
    return 'z3';
  }

  if (characteristics.hardConstraintRatio > 0.8) {
    return 'z3';
  }

  // Ising preferred for:
  // - Many variables
  // - Mostly soft constraints (probabilistic ok)
  // - Real-time requirement
  if (characteristics.numVariables > 50) {
    return 'ising';
  }

  if (characteristics.hardConstraintRatio < 0.3) {
    return 'ising';
  }

  // Parallel for medium-sized, mixed problems
  if (
    characteristics.numVariables > 20 &&
    characteristics.hardConstraintRatio > 0.3 &&
    characteristics.hardConstraintRatio < 0.8
  ) {
    return 'parallel';
  }

  // Default: Z3 for exact proofs
  return 'z3';
}

export interface HybridSolveResult {
  solver: 'z3' | 'ising' | 'hybrid';
  z3_result?: {
    ok: boolean;
    gateStatus: string;
    time_ms: number;
    error?: string;
  };
  ising_result?: {
    ok: boolean;
    gateStatus: string;
    time_ms: number;
    error?: string;
  };
  selected: 'z3' | 'ising';
  decision: {
    ok: boolean;
    gateStatus: 'PASS' | 'BLOCK' | 'REVIEW';
    reason?: string;
  };
}

/**
 * Solve using both Z3 and Ising in parallel, return fastest successful
 */
export async function solveBothParallel(
  request: DeterministicProofRequest,
): Promise<HybridSolveResult> {
  const startMs = Date.now();
  const { getDeterministicPolicyManifest } = await import('../dsg/deterministic/policy-manifest');
  const manifest = getDeterministicPolicyManifest();
  const context = request.context ?? {};
  const constraints = manifest.constraints.map((constraint) => ({
    ...constraint,
    passed: context[constraint.evidenceKey] === true,
  }));

  const promises = [
    evaluateDeterministicGate(request)
      .then((result) => ({
        solver: 'z3',
        result,
        time: Date.now() - startMs,
      }))
      .catch((error) => ({
        solver: 'z3',
        error: error instanceof Error ? error.message : 'Unknown error',
        time: Date.now() - startMs,
      })),

    evaluateGateWithIsingSolver(constraints, request)
      .then((result) => ({
        solver: 'ising',
        result,
        time: Date.now() - startMs,
      }))
      .catch((error) => ({
        solver: 'ising',
        error: error instanceof Error ? error.message : 'Unknown error',
        time: Date.now() - startMs,
      })),
  ];

  const [z3Outcome, isingOutcome] = await Promise.all(promises);

  // Prefer successful results, then fastest
  const z3Success = !('error' in z3Outcome);
  const isingSuccess = !('error' in isingOutcome);

  let selected: 'z3' | 'ising';
  let decision;

  if (z3Success && isingSuccess) {
    // Both succeeded: prefer Z3 (exact), but if Ising agrees, use faster
    if (z3Outcome.result.ok === isingOutcome.result.ok) {
      selected = z3Outcome.time < isingOutcome.time ? 'z3' : 'ising';
    } else {
      selected = 'z3'; // Prefer exact proof on disagreement
    }
  } else if (z3Success) {
    selected = 'z3';
  } else if (isingSuccess) {
    selected = 'ising';
  } else {
    // Both failed: return Z3 error (more authoritative)
    selected = 'z3';
  }

  const selectedResult = selected === 'z3' ? z3Outcome : isingOutcome;
  decision = 'result' in selectedResult ? selectedResult.result : selectedResult;

  return {
    solver: 'hybrid',
    z3_result: z3Success ? { ...z3Outcome.result, time_ms: z3Outcome.time } : undefined,
    ising_result: isingSuccess ? { ...isingOutcome.result, time_ms: isingOutcome.time } : undefined,
    selected,
    decision: {
      ok: decision.ok ?? false,
      gateStatus: decision.gateStatus ?? 'BLOCK',
      reason: decision.reason,
    },
  };
}

/**
 * Smart solver selection and execution
 */
export async function solveHybrid(
  request: DeterministicProofRequest,
  forceParallel?: boolean,
): Promise<HybridSolveResult> {
  const { getDeterministicPolicyManifest } = await import('../dsg/deterministic/policy-manifest');
  const manifest = getDeterministicPolicyManifest();
  const context = request.context ?? {};
  const constraints = manifest.constraints.map((constraint) => ({
    ...constraint,
    passed: context[constraint.evidenceKey] === true,
  }));

  const characteristics = analyzeProblem(constraints);
  const choice = forceParallel ? 'parallel' : selectSolver(characteristics);

  if (choice === 'parallel') {
    return solveBothParallel(request);
  }

  const startMs = Date.now();

  if (choice === 'z3') {
    try {
      const result = await evaluateDeterministicGate(request);
      return {
        solver: 'z3',
        z3_result: { ...result, time_ms: Date.now() - startMs },
        selected: 'z3',
        decision: {
          ok: result.ok,
          gateStatus: result.gateStatus,
          reason: result.reason,
        },
      };
    } catch (error) {
      return {
        solver: 'z3',
        z3_result: {
          ok: false,
          gateStatus: 'BLOCK',
          time_ms: Date.now() - startMs,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        selected: 'z3',
        decision: {
          ok: false,
          gateStatus: 'BLOCK',
          reason: 'Z3 solver error',
        },
      };
    }
  } else {
    try {
      const result = await evaluateGateWithIsingSolver(constraints, request);
      return {
        solver: 'ising',
        ising_result: { ...result, time_ms: Date.now() - startMs },
        selected: 'ising',
        decision: {
          ok: result.ok,
          gateStatus: result.gateStatus,
          reason: result.reason,
        },
      };
    } catch (error) {
      return {
        solver: 'ising',
        ising_result: {
          ok: false,
          gateStatus: 'BLOCK',
          time_ms: Date.now() - startMs,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        selected: 'ising',
        decision: {
          ok: false,
          gateStatus: 'BLOCK',
          reason: 'Ising solver error',
        },
      };
    }
  }
}

/**
 * Debug info: show problem analysis
 */
export async function analyzeProblemDebug(
  request: DeterministicProofRequest,
): Promise<{
  characteristics: ProblemCharacteristics;
  recommendedSolver: SolverChoice;
  reasoning: string;
}> {
  const { getDeterministicPolicyManifest } = await import('../dsg/deterministic/policy-manifest');
  const manifest = getDeterministicPolicyManifest();
  const context = request.context ?? {};
  const constraints = manifest.constraints.map((constraint) => ({
    ...constraint,
    passed: context[constraint.evidenceKey] === true,
  }));

  const characteristics = analyzeProblem(constraints);
  const solver = selectSolver(characteristics);

  let reasoning = '';
  if (solver === 'z3') {
    if (characteristics.hasComplexLogic && characteristics.numVariables < 20) {
      reasoning = 'Complex logic on small problem → Z3 for exact proof';
    } else if (characteristics.hardConstraintRatio > 0.8) {
      reasoning = 'High hard constraint ratio → Z3 for exact proof';
    } else {
      reasoning = 'Default to Z3 for exactness';
    }
  } else if (solver === 'ising') {
    if (characteristics.numVariables > 50) {
      reasoning = 'Many variables (>50) → Ising for scalability';
    } else if (characteristics.hardConstraintRatio < 0.3) {
      reasoning = 'Many soft constraints → Ising probabilistic';
    } else {
      reasoning = 'Medium problem, mixed constraints → Ising';
    }
  } else {
    reasoning = 'Medium mixed problem → Parallel both solvers';
  }

  return { characteristics, recommendedSolver: solver, reasoning };
}
