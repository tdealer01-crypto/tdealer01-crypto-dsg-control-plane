/**
 * Ising-to-Z3 Verifier
 *
 * Validates Ising optimizer's binary assignment using formal Z3 constraint checking.
 *
 * Flow:
 * 1. Accept Ising binary assignment (from ising-optimizer.ts)
 * 2. Convert to Z3 constraint assertions (x[i] == value)
 * 3. Call Z3.check() to verify assignment satisfies all constraints
 * 4. If SAT: assignment is feasible, return proof
 * 5. If UNSAT: assignment violates constraints, trigger fallback Z3 full solve
 *
 * Determinism: Z3 SAT check is deterministic (same input → same output)
 */

import type { QUBOMatrix, QUBOVariable } from './qubo-builder';
import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';
import type { Task, AgentCapacity } from '@/lib/dsg/multi-agent/types';

export interface Z3VerificationRequest {
  /** Ising binary assignment from ising-optimizer */
  isingAssignment: Record<string, number | boolean>;

  /** Original QUBO matrix for constraint extraction */
  quboMatrix: QUBOMatrix;

  /** Task list (for constraint context) */
  tasks: Task[];

  /** Agent capacities (for constraint context) */
  agentCapacities: AgentCapacity[];

  /** Timeout in milliseconds */
  timeout?: number;
}

export interface Z3VerificationResult {
  /** SAT/UNSAT status from Z3 check */
  isSAT: 'sat' | 'unsat' | 'timeout' | 'error';

  /** Whether Ising assignment is valid */
  isValid: boolean;

  /** Actual verification time in milliseconds */
  verifyTimeMs: number;

  /** Z3 proof/model for audit trail */
  proof: string;

  /** Proof fingerprint for determinism verification */
  proofHash: string;

  /** Violated constraints (if UNSAT) */
  violatedConstraints?: string[];

  /** Z3 solver version */
  z3Version: string;
}

/**
 * Verify Ising assignment against QUBO constraints using Z3.
 *
 * Returns verification result with SAT/UNSAT status.
 * If UNSAT, caller should trigger fallback Z3 full solve.
 */
export async function verifyIsingWithZ3(
  req: Z3VerificationRequest,
): Promise<Z3VerificationResult> {
  const startTime = Date.now();

  try {
    const { ctx, version } = await getZ3Context();
    const { Int } = ctx;
    const z3Version = `z3-solver-${version}`;

    const solver = new ctx.Solver();
    if (req.timeout && req.timeout > 0) {
      try {
        solver.set('timeout', Math.min(req.timeout, 30000));
      } catch {
        // Older bindings may reject the param name; safe to ignore.
      }
    }

    // Declare a 0/1 integer per assignment variable and pin it to the value
    // chosen by the Ising optimizer. Z3 — not JavaScript counting — then decides
    // whether the pinned assignment satisfies the feasibility constraints.
    const assignmentVars = req.quboMatrix.variables.filter(
      (v) => v.type === 'assignment',
    );
    const varExpr = new Map<string, any>();
    for (const v of assignmentVars) {
      const xi = Int.const(v.id);
      solver.add(xi.ge(0));
      solver.add(xi.le(1));
      const assigned = Number(req.isingAssignment[v.id]) === 1 ? 1 : 0;
      solver.add(xi.eq(assigned));
      varExpr.set(v.id, xi);
    }

    const constraintsList: string[] = [];

    // Constraint 1: each task is assigned to exactly one agent → sum == 1.
    for (const task of req.tasks) {
      const terms = assignmentVars
        .filter((v) => v.taskId === task.id)
        .map((v) => varExpr.get(v.id));
      if (terms.length > 0) {
        const sum = terms.slice(1).reduce((acc, t) => acc.add(t), terms[0]);
        solver.add(sum.eq(1));
      }
      constraintsList.push(`task_${task.id} assigned to exactly 1 agent`);
    }

    // Constraint 2: each agent stays within capacity → sum <= maxTotalTasks.
    for (const agent of req.agentCapacities) {
      const terms = assignmentVars
        .filter((v) => v.agentId === agent.agentId)
        .map((v) => varExpr.get(v.id));
      if (terms.length > 0) {
        const sum = terms.slice(1).reduce((acc, t) => acc.add(t), terms[0]);
        solver.add(sum.le(agent.maxTotalTasks));
      }
      constraintsList.push(`agent_${agent.agentId} total tasks <= ${agent.maxTotalTasks}`);
    }

    // Z3 SAT check. Deterministic for a fully-pinned assignment.
    const checkResult = await solver.check();
    const verifyTimeMs = Date.now() - startTime;

    if (checkResult === 'sat') {
      const proofContent = `SAT: Ising assignment verified by Z3\nConstraints satisfied: ${constraintsList.join('; ')}`;
      const proofHash = sha256Json(proofContent);
      return {
        isSAT: 'sat',
        isValid: true,
        verifyTimeMs,
        proof: proofContent,
        proofHash,
        z3Version,
      };
    }

    if (checkResult === 'unsat') {
      const violated = collectViolatedConstraints(req);
      const proofContent = `UNSAT: Ising assignment violates constraints (Z3)\nViolated: ${violated.join('; ')}\nAll constraints: ${constraintsList.join('; ')}`;
      const proofHash = sha256Json(proofContent);
      return {
        isSAT: 'unsat',
        isValid: false,
        verifyTimeMs,
        proof: proofContent,
        proofHash,
        violatedConstraints: violated,
        z3Version,
      };
    }

    // 'unknown' — usually a solver timeout on this query.
    const proofContent = `UNKNOWN: Z3 could not decide the Ising assignment\nConstraints: ${constraintsList.join('; ')}`;
    const proofHash = sha256Json(proofContent);
    return {
      isSAT: 'timeout',
      isValid: false,
      verifyTimeMs,
      proof: proofContent,
      proofHash,
      z3Version,
    };
  } catch (error) {
    const verifyTimeMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    const proofContent = `ERROR: Z3 verification failed: ${errorMsg}`;
    const proofHash = sha256Json(proofContent);

    return {
      isSAT: 'error',
      isValid: false,
      verifyTimeMs,
      proof: proofContent,
      proofHash,
      z3Version: 'z3-solver-wasm',
    };
  }
}

/**
 * Extract violated assignment constraints from UNSAT core.
 *
 * Useful for debugging why Ising solution failed Z3 verification.
 */
export function extractViolatedConstraints(unsatCore: string): string[] {
  const lines = unsatCore.split('\n');
  return lines.filter((line) => line.includes('assert') || line.includes('=='));
}

/**
 * Determine if fallback to Z3 full solve is needed.
 *
 * Returns true if Ising verification UNSAT rate exceeds threshold,
 * indicating hybrid solver should use Z3-only for this problem class.
 */
export function shouldFallbackToZ3FullSolve(
  verificationResult: Z3VerificationResult,
  fallbackThreshold: number = 0.1, // 10% UNSAT rate triggers fallback
): boolean {
  // For now, fallback immediately if UNSAT
  // Future: track UNSAT rate across batch and threshold at 10%
  return !verificationResult.isValid && verificationResult.isSAT === 'unsat';
}

/**
 * Recompute, for diagnostics only, which feasibility constraints the assignment
 * breaks. The authoritative SAT/UNSAT decision comes from Z3 in verifyIsingWithZ3;
 * this list only annotates an UNSAT result with human-readable reasons.
 */
function collectViolatedConstraints(req: Z3VerificationRequest): string[] {
  const taskCount = new Map<string, number>();
  const agentCount = new Map<number, number>();

  for (const varName of Object.keys(req.isingAssignment)) {
    if (Number(req.isingAssignment[varName]) === 1) {
      const v = req.quboMatrix.variables.find((x) => x.id === varName);
      if (v && v.type === 'assignment') {
        if (v.taskId) taskCount.set(v.taskId, (taskCount.get(v.taskId) ?? 0) + 1);
        if (v.agentId !== undefined) agentCount.set(v.agentId, (agentCount.get(v.agentId) ?? 0) + 1);
      }
    }
  }

  const violated: string[] = [];
  for (const task of req.tasks) {
    const count = taskCount.get(task.id) ?? 0;
    if (count !== 1) violated.push(`task_${task.id}_count == 1 (got ${count})`);
  }
  for (const agent of req.agentCapacities) {
    const count = agentCount.get(agent.agentId) ?? 0;
    if (count > agent.maxTotalTasks) {
      violated.push(`agent_${agent.agentId} exceeds capacity: ${count} > ${agent.maxTotalTasks}`);
    }
  }
  return violated;
}

// Z3 WASM init is expensive (~2s); cache one context per process
let z3InitPromise: Promise<{ ctx: any; version: string }> | null = null;

async function getZ3Context(): Promise<{ ctx: any; version: string }> {
  if (!z3InitPromise) {
    z3InitPromise = (async () => {
      const { init } = await import('z3-solver');
      const { Context, Z3 } = await init();
      let version = '4.16.0';
      try {
        const v = Z3.get_version ? Z3.get_version() : undefined;
        if (v && typeof v === 'object') {
          version = `${v.major}.${v.minor}.${v.build_number}`;
        }
      } catch {
        // Fall back to the pinned version string.
      }
      return { ctx: Context('ising-verifier'), version };
    })();
  }
  return z3InitPromise;
}
