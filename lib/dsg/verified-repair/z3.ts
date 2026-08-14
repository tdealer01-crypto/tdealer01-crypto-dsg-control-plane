import { sha256Json } from '@/lib/dsg/runtime/hash';
import type { RepairCandidate } from './types';
import type { RepairExactStatus } from './types';
import type { RepairQubo } from './qubo';

export interface RepairZ3Context {
  ctx: any;
  version: string;
}
let z3InitPromise: Promise<RepairZ3Context> | null = null;

async function getZ3Context(): Promise<RepairZ3Context> {
  if (!z3InitPromise) {
    z3InitPromise = (async () => {
      const { init } = await import('z3-solver');
      const { Context, Z3 } = await init();
      let version = 'z3-solver-wasm';
      try {
        const value = Z3.get_version?.();
        if (value && typeof value === 'object') {
          version = `${value.major}.${value.minor}.${value.build_number}`;
        }
      } catch {
        // The pinned package version remains the honest fallback identifier.
      }
      return { ctx: Context('dsg-verified-repair'), version };
    })();
  }
  return z3InitPromise;
}

function diagnosticViolations(
  qubo: RepairQubo,
  candidates: RepairCandidate[],
  assignment: Record<string, number | boolean>,
): string[] {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const selected = new Set(
    qubo.variables
      .filter((variable) => Number(assignment[variable.id]) === 1)
      .map((variable) => qubo.candidateOrder[Number(variable.agentId)]),
  );
  const violations: string[] = [];

  for (const group of qubo.groups) {
    const count = [...selected].filter((id) => byId.get(id)?.changeGroup === group).length;
    if (count !== 1) violations.push(`GROUP_${group}_EXACTLY_ONE_GOT_${count}`);
  }
  for (const [left, right] of qubo.conflictPairs) {
    if (selected.has(left) && selected.has(right)) {
      violations.push(`CONFLICT_${left}_${right}`);
    }
  }
  for (const [candidate, required] of qubo.requirementPairs) {
    if (selected.has(candidate) && !selected.has(required)) {
      violations.push(`REQUIREMENT_${candidate}_NEEDS_${required}`);
    }
  }
  return violations;
}

function proofHash(payload: Record<string, unknown>): string {
  return sha256Json({ schema: 'dsg.verified-repair.z3-proof.v1', ...payload });
}

export async function verifyRepairAssignment(
  qubo: RepairQubo,
  candidates: RepairCandidate[],
  assignment: Record<string, number | boolean>,
  timeoutMs = 5_000,
): Promise<{
  status: RepairExactStatus;
  valid: boolean;
  proof: string;
  proofHash: string;
  z3Version: string;
  verifyTimeMs: number;
  constraints: string[];
  counterexample: string[];
}> {
  const startedAt = Date.now();
  const constraints: string[] = [];

  try {
    const { ctx, version } = await getZ3Context();
    const solver = new ctx.Solver();
    try {
      solver.set('timeout', Math.min(Math.max(timeoutMs, 1), 30_000));
    } catch {
      // The WASM binding may not expose solver timeout on every version.
    }

    const variables = qubo.variables.map((variable, index) => {
      const expression = ctx.Int.const(`verified_repair_${index}`);
      const value = assignment[variable.id];
      if (!(value === 0 || value === 1 || value === false || value === true)) {
        throw new Error(`MISSING_OR_NON_BINARY_ASSIGNMENT:${variable.id}`);
      }
      solver.add(expression.ge(0), expression.le(1), expression.eq(Number(value)));
      return expression;
    });

    for (const group of qubo.groups) {
      const groupVariables = qubo.variables
        .map((variable, index) => ({ variable, expression: variables[index] }))
        .filter(({ variable }) => variable.taskId === group)
        .map(({ expression }) => expression);
      if (groupVariables.length === 0) {
        throw new Error(`NO_VARIABLES_FOR_GROUP:${group}`);
      }
      const sum = groupVariables.length === 1
        ? groupVariables[0]
        : groupVariables.slice(1).reduce((total: any, expression: any) => total.add(expression), groupVariables[0]);
      solver.add(sum.eq(1));
      constraints.push(`group:${group}:exactly_one`);
    }

    for (const [leftId, rightId] of qubo.conflictPairs) {
      const leftIndex = qubo.candidateOrder.indexOf(leftId);
      const rightIndex = qubo.candidateOrder.indexOf(rightId);
      if (leftIndex < 0 || rightIndex < 0) throw new Error(`UNKNOWN_CONFLICT:${leftId}:${rightId}`);
      solver.add(variables[leftIndex].add(variables[rightIndex]).le(1));
      constraints.push(`conflict:${leftId}:${rightId}:at_most_one`);
    }

    for (const [candidateId, requiredId] of qubo.requirementPairs) {
      const candidateIndex = qubo.candidateOrder.indexOf(candidateId);
      const requiredIndex = qubo.candidateOrder.indexOf(requiredId);
      if (candidateIndex < 0 || requiredIndex < 0) throw new Error(`UNKNOWN_REQUIREMENT:${candidateId}:${requiredId}`);
      solver.add(variables[candidateIndex].le(variables[requiredIndex]));
      constraints.push(`requirement:${candidateId}:needs:${requiredId}`);
    }

    const timeout = new Promise<'timeout'>((resolve) => {
      const timer = setTimeout(() => resolve('timeout'), Math.max(timeoutMs, 1) + 250);
      timer.unref?.();
    });
    const solverResult = await Promise.race([solver.check(), timeout]);
    const verifyTimeMs = Date.now() - startedAt;
    const status: RepairExactStatus = solverResult === 'sat'
      ? 'sat'
      : solverResult === 'unsat'
        ? 'unsat'
        : 'timeout';
    const counterexample = status === 'unsat'
      ? diagnosticViolations(qubo, candidates, assignment)
      : [];
    const proof = JSON.stringify({
      status,
      assignment,
      constraints,
      counterexample,
      z3Version: version,
    });
    return {
      status,
      valid: status === 'sat',
      proof,
      proofHash: proofHash({ status, assignment, constraints, counterexample, z3Version: version }),
      z3Version: version,
      verifyTimeMs,
      constraints,
      counterexample,
    };
  } catch (error) {
    const verifyTimeMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    const proof = JSON.stringify({ status: 'error', message, constraints });
    return {
      status: 'error',
      valid: false,
      proof,
      proofHash: proofHash({ status: 'error', message, constraints }),
      z3Version: 'z3-solver-wasm',
      verifyTimeMs,
      constraints,
      counterexample: [message],
    };
  }
}

export async function resetRepairZ3Context(): Promise<void> {
  z3InitPromise = null;
}
