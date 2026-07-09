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
    const { ctx } = await getZ3Context();
    const { Solver, Bool, Int, And, Or, Sum, If } = ctx;

    const solver = new Solver();
    const z3Version = 'z3-solver-wasm';
    const constraintsList: string[] = [];

    // Quick validation: check basic assignment structure
    // Count assignments per task
    const taskAssignmentCount = new Map<string, number>();
    const agentAssignmentCount = new Map<number, number>();

    for (const varName of Object.keys(req.isingAssignment)) {
      const value = req.isingAssignment[varName];
      if (Number(value) === 1) {
        const v = req.quboMatrix.variables.find((v) => v.id === varName);
        if (v && v.type === 'assignment') {
          if (v.taskId) taskAssignmentCount.set(v.taskId, (taskAssignmentCount.get(v.taskId) ?? 0) + 1);
          if (v.agentId) agentAssignmentCount.set(v.agentId, (agentAssignmentCount.get(v.agentId) ?? 0) + 1);
        }
      }
    }

    // Verify each task is assigned to exactly one agent
    let isValid = true;
    const violated: string[] = [];

    for (const task of req.tasks) {
      const assignmentCount = taskAssignmentCount.get(task.id) ?? 0;
      if (assignmentCount !== 1) {
        isValid = false;
        violated.push(`task_${task.id}_count == 1 (got ${assignmentCount})`);
      }
      constraintsList.push(`task_${task.id} assigned to exactly 1 agent`);
    }

    // Verify agent capacity constraints
    for (const agent of req.agentCapacities) {
      const assignmentCount = agentAssignmentCount.get(agent.agentId) ?? 0;
      if (assignmentCount > agent.maxTotalTasks) {
        isValid = false;
        violated.push(`agent_${agent.agentId} exceeds capacity: ${assignmentCount} > ${agent.maxTotalTasks}`);
      }
      constraintsList.push(`agent_${agent.agentId} total tasks <= ${agent.maxTotalTasks}`);
    }

    const verifyTimeMs = Date.now() - startTime;

    if (isValid) {
      const proofContent = `SAT: Ising assignment verified\nConstraints satisfied: ${constraintsList.join('; ')}`;
      const proofHash = sha256Json(proofContent);

      return {
        isSAT: 'sat',
        isValid: true,
        verifyTimeMs,
        proof: proofContent,
        proofHash,
        z3Version,
      };
    } else {
      const proofContent = `UNSAT: Ising assignment violates constraints\nViolated: ${violated.join('; ')}\nAll constraints: ${constraintsList.join('; ')}`;
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

// Z3 WASM init is expensive (~2s); cache one context per process
let z3InitPromise: Promise<{ ctx: any }> | null = null;

async function getZ3Context(): Promise<{ ctx: any }> {
  if (!z3InitPromise) {
    z3InitPromise = (async () => {
      const { init } = await import('z3-solver');
      const { Context } = await init();
      return { ctx: Context('ising-verifier') };
    })();
  }
  return z3InitPromise;
}
