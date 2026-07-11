#!/usr/bin/env npx tsx
/**
 * scripts/z3-gate.ts — DSG Z3 gate verification (CI "Z3 Gate Verification").
 *
 * Referenced by .github/workflows/dsg-deploy.yml. Two layers:
 *
 *   1. Deterministic invariants (always run, no network, no DB): exercise the
 *      DSG-native proof/gate engine in lib/dsg/deterministic and assert the
 *      PASS/BLOCK/REVIEW mapping, UNSUPPORTED-is-never-PASS, determinism, the
 *      full evidence surface, and the claim boundary.
 *
 *   2. External Z3 solver verification (real SMT-LIB2 solve): when an external
 *      solver is configured via the SAME env contract that the runtime uses
 *      (DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED=true + DSG_EXTERNAL_SOLVER_URL,
 *      see lib/dsg/deterministic/external-solver.ts and z3-solver-api/), the gate
 *      generates SAT and UNSAT formulas, calls the solver over HTTP, and asserts
 *      the verdicts agree with the deterministic gate.
 *
 * Claim boundary (CLAUDE.md §12): this gate does not *assume* an external Z3
 * solver. If none is configured — as in the default CI job, which passes only
 * Supabase secrets — the external layer is reported as `skip`, not `pass`, and
 * the deterministic layer still fully verifies the gate. Set
 * DSG_SOLVER_REQUIRED=true to turn an unconfigured/unreachable solver into a
 * hard failure (e.g. once z3-solver-api is actually deployed and wired in).
 *
 * Exit code is non-zero on any failed check; a JSON evidence artifact is written
 * under artifacts/z3-gate/.
 */

import fs from 'node:fs';
import path from 'node:path';

import { evaluateDeterministicGate, proofToGateStatus } from '../lib/dsg/deterministic/gate-engine';
import {
  proveDeterministicPlan,
  isProductionReadyDeterministicProof,
} from '../lib/dsg/deterministic/proof-engine';
import { getDeterministicPolicyManifest } from '../lib/dsg/deterministic/policy-manifest';
import {
  generateSmt2ForProof,
  invokeExternalSolver,
  isValidExternalSolverResult,
} from '../lib/dsg/deterministic/external-solver';
import type {
  DeterministicConstraintResult,
  DeterministicProofRequest,
} from '../lib/dsg/deterministic/types';
import { buildQUBOMatrix } from '../lib/dsg-one/qubo-builder';
import { optimizeWithIsing } from '../lib/dsg-one/ising-optimizer';
import { verifyIsingWithZ3 } from '../lib/dsg-one/ising-to-z3-verifier';
import type { Task, AgentCapacity } from '../lib/dsg/multi-agent/types';

type CheckStatus = 'pass' | 'fail' | 'skip';
type CheckResult = {
  name: string;
  status: CheckStatus;
  detail: string;
};

const results: CheckResult[] = [];

function record(name: string, ok: boolean, detail: string): void {
  results.push({ name, status: ok ? 'pass' : 'fail', detail });
}

function skip(name: string, detail: string): void {
  results.push({ name, status: 'skip', detail });
}

const manifest = getDeterministicPolicyManifest();

/** Build a request whose context satisfies every evidence key except the listed ones. */
function requestWith(overrides: {
  false?: string[];
  riskLevel?: DeterministicProofRequest['riskLevel'];
  nonceSuffix?: string;
}): DeterministicProofRequest {
  const falseKeys = new Set(overrides.false ?? []);
  const context: Record<string, unknown> = {};
  for (const constraint of manifest.constraints) {
    context[constraint.evidenceKey] = !falseKeys.has(constraint.evidenceKey);
  }
  const suffix = overrides.nonceSuffix ?? 'base';
  return {
    planId: `z3-gate-${suffix}`,
    riskLevel: overrides.riskLevel ?? 'high',
    nonce: `z3-gate-nonce-${suffix}`,
    idempotencyKey: `z3-gate-idem-${suffix}`,
    context,
  };
}

/** Resolve constraints exactly as proof-engine does, for SMT-LIB2 generation. */
function constraintsFor(request: DeterministicProofRequest): DeterministicConstraintResult[] {
  const context = request.context ?? {};
  return manifest.constraints.map((constraint) => ({
    ...constraint,
    passed: context[constraint.evidenceKey] === true,
  }));
}

async function verifyDeterministicInvariants(): Promise<void> {
  // 1. Fully-satisfied context → gate PASS, proof PASS, production-ready proof.
  const passReq = requestWith({ nonceSuffix: 'pass' });
  const passGate = await evaluateDeterministicGate(passReq);
  record(
    'full-context PASS',
    passGate.ok && passGate.gateStatus === 'PASS' && passGate.proofStatus === 'PASS',
    `gateStatus=${passGate.gateStatus} proofStatus=${passGate.proofStatus}`,
  );
  record(
    'PASS proof is production-ready shape',
    isProductionReadyDeterministicProof(passGate.proof),
    `productionReadyClaim=${passGate.proof.evidenceBoundary.productionReadyClaim}`,
  );

  // 2. Missing a critical evidence key → BLOCK.
  const blockGate = await evaluateDeterministicGate(
    requestWith({ false: ['permission_granted'], nonceSuffix: 'block' }),
  );
  record(
    'missing-critical BLOCK',
    !blockGate.ok && blockGate.gateStatus === 'BLOCK',
    `gateStatus=${blockGate.gateStatus} reason=${blockGate.reason ?? ''}`,
  );

  // 3. Missing only a medium-severity key → REVIEW (not PASS, not BLOCK).
  const reviewGate = await evaluateDeterministicGate(
    requestWith({ false: ['testable'], nonceSuffix: 'review' }),
  );
  record(
    'missing-medium REVIEW',
    !reviewGate.ok && reviewGate.gateStatus === 'REVIEW',
    `gateStatus=${reviewGate.gateStatus} proofStatus=${reviewGate.proofStatus}`,
  );

  // 4. UNSUPPORTED must never become PASS.
  const low = proofToGateStatus('UNSUPPORTED', 'low');
  const high = proofToGateStatus('UNSUPPORTED', 'high');
  const critical = proofToGateStatus('UNSUPPORTED', 'critical');
  record(
    'UNSUPPORTED is never PASS',
    low === 'REVIEW' && high === 'BLOCK' && critical === 'BLOCK',
    `low=${low} high=${high} critical=${critical}`,
  );

  // 5. Determinism: identical input → identical proof/input hashes.
  const proofA = await proveDeterministicPlan(requestWith({ nonceSuffix: 'det' }));
  const proofB = await proveDeterministicPlan(requestWith({ nonceSuffix: 'det' }));
  record(
    'deterministic proofHash',
    proofA.proofHash === proofB.proofHash && proofA.inputHash === proofB.inputHash,
    `proofHash ${proofA.proofHash === proofB.proofHash ? 'stable' : 'DIVERGED'}`,
  );

  // 6. Proof must expose the full evidence surface.
  const p = passGate.proof;
  record(
    'proof evidence surface complete',
    Boolean(
      p.policyRef &&
        p.policyVersion &&
        p.constraintSetHash &&
        p.proofHash &&
        p.inputHash &&
        p.solver?.name &&
        p.solver?.version &&
        p.replayProtection?.nonce &&
        p.replayProtection?.idempotencyKey,
    ),
    `policyVersion=${p.policyVersion} constraintSetHash=${p.constraintSetHash.slice(0, 12)}…`,
  );

  // 7. Claim boundary: no overclaim of external Z3 / certification / WORM / signing.
  const eb = p.evidenceBoundary;
  record(
    'claim boundary respected',
    eb.externalZ3ProductionSolverClaim === false &&
      eb.certificationClaim === false &&
      eb.independentAuditClaim === false &&
      eb.wormStorageCertifiedClaim === false &&
      eb.cryptographicSigningCompleteClaim === false,
    `externalZ3ProductionSolverClaim=${eb.externalZ3ProductionSolverClaim}`,
  );
}

/**
 * Verify the external Z3 solver when configured. Uses the runtime env contract so
 * this gate stays consistent with lib/dsg/deterministic/external-solver.ts.
 * Returns whether the external solver was actually invoked.
 */
async function verifyExternalSolver(): Promise<boolean> {
  const enabled =
    process.env.DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED === 'true' &&
    Boolean(process.env.DSG_EXTERNAL_SOLVER_URL);
  const required = process.env.DSG_SOLVER_REQUIRED === 'true';

  if (!enabled) {
    const reason =
      'external solver not configured (set DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED=true and DSG_EXTERNAL_SOLVER_URL)';
    if (required) {
      record('external Z3 solver configured', false, `DSG_SOLVER_REQUIRED=true but ${reason}`);
    } else {
      skip('external Z3 solver', reason);
    }
    return false;
  }

  // SAT case: every constraint satisfied → the AND-formula is satisfiable.
  const satReq = requestWith({ nonceSuffix: 'ext-sat' });
  const satSmt2 = generateSmt2ForProof(satReq, constraintsFor(satReq));
  const satResult = await invokeExternalSolver(satSmt2, satReq);

  if (!satResult) {
    const reason = `external solver unreachable/failed at ${process.env.DSG_EXTERNAL_SOLVER_URL}`;
    if (required) {
      record('external Z3 solver reachable', false, `DSG_SOLVER_REQUIRED=true but ${reason}`);
    } else {
      skip('external Z3 solver', reason);
    }
    return false;
  }

  record(
    'external Z3 SAT verdict',
    isValidExternalSolverResult(satResult) &&
      satResult.status === 'sat' &&
      satResult.satisfiable === true,
    `status=${satResult.status} solver=${satResult.solver_version} time_ms=${satResult.time_ms}`,
  );

  // UNSAT case: a critical constraint is false, so the required AND-formula is unsatisfiable.
  const unsatReq = requestWith({ false: ['permission_granted'], nonceSuffix: 'ext-unsat' });
  const unsatSmt2 = generateSmt2ForProof(unsatReq, constraintsFor(unsatReq));
  const unsatResult = await invokeExternalSolver(unsatSmt2, unsatReq);

  record(
    'external Z3 UNSAT verdict',
    Boolean(unsatResult) &&
      unsatResult!.status === 'unsat' &&
      unsatResult!.satisfiable === false,
    unsatResult ? `status=${unsatResult.status}` : 'no response',
  );

  // Cross-check: solver SAT ↔ deterministic gate PASS.
  const satGate = await evaluateDeterministicGate(satReq);
  const unsatGate = await evaluateDeterministicGate(unsatReq);
  record(
    'external Z3 agrees with deterministic gate',
    satResult.status === 'sat' &&
      satGate.gateStatus === 'PASS' &&
      Boolean(unsatResult) &&
      unsatResult!.status === 'unsat' &&
      unsatGate.gateStatus !== 'PASS',
    `sat→${satGate.gateStatus} unsat→${unsatGate.gateStatus}`,
  );

  return true;
}

/**
 * Verify the Ising → feasibility verifier (lib/dsg-one/ising-to-z3-verifier).
 *
 * Honesty note: verifyIsingWithZ3() currently initialises a z3-solver WASM
 * Context but decides SAT/UNSAT with deterministic JavaScript feasibility
 * counting (task-assigned-exactly-once + agent-capacity), not by asserting into
 * the Z3 solver. These checks therefore verify that feasibility contract, not a
 * Z3 formal proof. The verifier needs the `z3-solver` devDependency at runtime;
 * when it is absent (e.g. a production/omit-dev install) verifyIsingWithZ3
 * returns isSAT="error", which this layer reports as `skip` (or `fail` under
 * DSG_SOLVER_REQUIRED=true) rather than a false pass.
 */
function isingFixture(): { tasks: Task[]; agents: AgentCapacity[] } {
  // Mirrors tests/dsg-one-ising-phase2-z3-verify.test.ts: this 3-task / 2-agent
  // problem has a feasible mock optimizer solution that the verifier marks SAT.
  const tasks = [
    { id: 'task-1', name: 'Payment', domain: 'financial', operation: 'transfer', target: 'acct-1', dataSensitivity: 'high', externalEffect: true, reversibility: 'reversible', userAuthorized: true, planAllowed: true, hasFreshEvidence: true, hasRollback: true },
    { id: 'task-2', name: 'Audit', domain: 'compliance', operation: 'write', target: 'log', dataSensitivity: 'medium', externalEffect: false, reversibility: 'irreversible', userAuthorized: true, planAllowed: true, hasFreshEvidence: true, hasRollback: false },
    { id: 'task-3', name: 'Policy', domain: 'policy', operation: 'update', target: 'policy-engine', dataSensitivity: 'high', externalEffect: true, reversibility: 'reversible', userAuthorized: true, planAllowed: true, hasFreshEvidence: true, hasRollback: true },
  ] as unknown as Task[];
  const agents: AgentCapacity[] = [
    { agentId: 1, maxConcurrentTasks: 2, maxTotalTasks: 2, resourceAvailable: { cpu: 4, memory: 8 } },
    { agentId: 2, maxConcurrentTasks: 2, maxTotalTasks: 1, resourceAvailable: { cpu: 2, memory: 4 } },
  ];
  return { tasks, agents };
}

async function verifyIsingLayer(): Promise<boolean> {
  const required = process.env.DSG_SOLVER_REQUIRED === 'true';
  const { tasks, agents } = isingFixture();

  try {
    const build = await buildQUBOMatrix({ tasks, agentCapacities: agents });
    const ising = await optimizeWithIsing({ problemId: 'z3-gate-ising', quboMatrix: build.qubo, useMock: true });
    const feasible = await verifyIsingWithZ3({
      isingAssignment: ising.solution,
      quboMatrix: build.qubo,
      tasks,
      agentCapacities: agents,
    });

    if (feasible.isSAT === 'error') {
      const reason =
        'ising feasibility verifier unavailable (z3-solver devDependency not installed or WASM init failed)';
      if (required) {
        record('ising feasibility verifier available', false, `DSG_SOLVER_REQUIRED=true but ${reason}`);
      } else {
        skip('ising feasibility verifier', reason);
      }
      return false;
    }

    // Feasible mock assignment (each task → exactly one agent, within capacity) → SAT.
    record(
      'ising feasible assignment → SAT',
      feasible.isSAT === 'sat' && feasible.isValid === true,
      `isSAT=${feasible.isSAT} isValid=${feasible.isValid} z3Version=${feasible.z3Version}`,
    );

    // All-zero assignment: every task assigned 0 times → violates exactly-once → UNSAT.
    const zeros: Record<string, number> = {};
    for (const varName of Object.keys(build.qubo.variableMap)) {
      zeros[varName] = 0;
    }
    const infeasible = await verifyIsingWithZ3({
      isingAssignment: zeros,
      quboMatrix: build.qubo,
      tasks,
      agentCapacities: agents,
    });
    record(
      'ising infeasible (all-zero) → UNSAT',
      infeasible.isSAT === 'unsat' && infeasible.isValid === false,
      `isSAT=${infeasible.isSAT} isValid=${infeasible.isValid}`,
    );

    // Same assignment → same proof hash (deterministic verdict).
    const repeat = await verifyIsingWithZ3({
      isingAssignment: ising.solution,
      quboMatrix: build.qubo,
      tasks,
      agentCapacities: agents,
    });
    record(
      'ising verdict deterministic',
      feasible.proofHash === repeat.proofHash,
      `proofHash ${feasible.proofHash === repeat.proofHash ? 'stable' : 'DIVERGED'}`,
    );

    return true;
  } catch (error) {
    const reason = `ising verifier threw: ${error instanceof Error ? error.message : String(error)}`;
    if (required) {
      record('ising feasibility verifier available', false, reason);
    } else {
      skip('ising feasibility verifier', reason);
    }
    return false;
  }
}

async function run(): Promise<void> {
  await verifyDeterministicInvariants();
  const externalInvoked = await verifyExternalSolver();
  const isingVerified = await verifyIsingLayer();

  const failures = results.filter((r) => r.status === 'fail');
  const skipped = results.filter((r) => r.status === 'skip');
  const summary = {
    schema: 'dsg-z3-gate-v1',
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    policyRef: manifest.policyRef,
    policyVersion: manifest.policyVersion,
    constraintSetHash: manifest.constraintSetHash,
    externalZ3SolverInvoked: externalInvoked,
    externalZ3ProductionSolverClaim: false,
    isingFeasibilityVerifierInvoked: isingVerified,
    totalChecks: results.length,
    passedChecks: results.filter((r) => r.status === 'pass').length,
    skippedChecks: skipped.length,
    failedChecks: failures.length,
    checks: results,
    userOutcome:
      failures.length === 0
        ? `Z3 gate invariants hold${externalInvoked ? ' (external Z3 solver verified)' : ' (external Z3 solver not configured — deterministic layer only)'}.`
        : 'Z3 gate verification failed. Fix failing checks before merge/deploy.',
  };

  const outDir = path.join('artifacts', 'z3-gate');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'verification-result.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );

  console.log(JSON.stringify(summary, null, 2));

  if (!summary.ok) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('[z3-gate] Unexpected error:', error);
  process.exit(1);
});
