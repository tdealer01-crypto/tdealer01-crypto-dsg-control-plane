/**
 * DSG ONE — Verified Action Compiler (product layer 2).
 *
 *   Approved Plan -> Action -> Policy/Permission -> Constraint -> Z3 -> PASS/BLOCK
 *
 * This module owns the "Action -> Constraint" half: it turns one locked plan
 * step into the deterministic gate's constraint context and returns the raw
 * proof status. The PASS/REVIEW/BLOCK mapping lives in the run state machine so
 * that the risk table exists in exactly one place.
 *
 * Boundary, per docs/product/DSG_ONE_VERIFIED_EXECUTION.md §7 and CLAUDE.md §13:
 * the gate here is the DSG-native deterministic adapter. It does not invoke an
 * external production Z3 solver. Optimization and Ising never appear in this
 * path at all — they may pick candidates elsewhere, but they are not permitted
 * to decide correctness.
 */

import { createHash } from 'crypto';
import { evaluateDeterministicGate } from '../../dsg/deterministic/gate-engine';
import {
  DETERMINISTIC_POLICY_REF,
  DETERMINISTIC_POLICY_VERSION,
} from '../../dsg/deterministic/policy-manifest';
import type { DeterministicProof } from '../../dsg/deterministic/types';
import { isSupportedTargetSystem } from './plan-lock';
import type { GateVerdict, Run, RunStep } from './types';

/** Integrations the org has actually connected, for the permission constraint. */
export interface VerifyStepContext {
  /** Target systems with live credentials, e.g. ['github', 'vercel']. */
  connectedSystems: string[];
  /** Whether the org has an audit sink configured. */
  auditAvailable: boolean;
}

export interface VerifyStepResult {
  verdict: GateVerdict;
  proof: DeterministicProof;
  /** Constraint ids that failed, for the step's judgement reasons. */
  failedConstraints: string[];
}

/**
 * Derive a stable idempotency key for one step under one locked plan.
 *
 * Keyed on planHash + stepId so re-verifying the same step of the same approved
 * plan reuses the cached proof, while the same step under a re-approved plan is
 * a genuinely new question.
 */
export function stepIdempotencyKey(planHash: string, stepId: string): string {
  return createHash('sha256').update(`${planHash}:${stepId}`, 'utf8').digest('hex');
}

/**
 * Build the constraint context for one step.
 *
 * Each key corresponds to an evidenceKey in DETERMINISTIC_POLICY_CONSTRAINTS.
 * A key that is absent or not exactly `true` counts as unsatisfied — the gate
 * fails closed, so an integration we cannot confirm blocks rather than passes.
 */
export function buildStepContext(
  run: Run,
  step: RunStep,
  context: VerifyStepContext,
): Record<string, unknown> {
  const targetConnected = context.connectedSystems.includes(step.targetSystem);
  const inPlanScope = run.plan.allowedTargetSystems.includes(step.targetSystem);
  const operationAllowed =
    run.plan.allowedOperations.length === 0 ||
    run.plan.allowedOperations.includes(step.operation);
  const writes = step.actionType !== 'READ';

  return {
    // The plan named a concrete operation on a concrete system.
    requirement_clear: step.summary.trim().length > 0 && step.operation.trim().length > 0,
    // We know how to talk to this system at all.
    tool_available: isSupportedTargetSystem(step.targetSystem),
    // The approved plan covers this step, and the org has connected the system.
    permission_granted: inPlanScope && operationAllowed && targetConnected,
    // Writes must run under brokered credentials; reads need no secret.
    secret_bound: writes ? targetConnected : true,
    // Earlier steps in the plan settled successfully.
    dependency_resolved: run.steps
      .filter((other) => other.ordinal < step.ordinal)
      .every((other) => other.status === 'PASSED'),
    // The step reports something we can check afterwards.
    testable: step.phase === 'Checking' || writes,
    // Deploy steps need their target connected; everything else is vacuously ready.
    deploy_target_ready: step.actionType === 'DEPLOY' ? targetConnected : true,
    audit_hook_available: context.auditAvailable,

    // Non-constraint context, carried into the proof's inputHash so a step
    // verified under one plan cannot have its proof reused under another.
    planHash: run.planHash,
    stepId: step.stepId,
    targetSystem: step.targetSystem,
    operation: step.operation,
  };
}

/**
 * Run one locked plan step through the deterministic gate.
 *
 * Returns the raw proof status. Callers feed it to the state machine as a
 * STEP_VERIFIED event rather than interpreting it themselves.
 */
export async function verifyStep(
  run: Run,
  step: RunStep,
  context: VerifyStepContext,
): Promise<VerifyStepResult> {
  if (!run.planHash) {
    throw new Error('verifyStep requires an approved run: planHash is not frozen');
  }

  const idempotencyKey = stepIdempotencyKey(run.planHash, step.stepId);

  const decision = await evaluateDeterministicGate(
    {
      planId: run.runId,
      policyRef: DETERMINISTIC_POLICY_REF,
      policyVersion: DETERMINISTIC_POLICY_VERSION,
      riskLevel: step.riskLevel,
      nonce: idempotencyKey,
      idempotencyKey,
      context: buildStepContext(run, step, context),
    },
    { orgId: run.orgId },
  );

  return {
    verdict: decision.proofStatus,
    proof: decision.proof,
    failedConstraints: decision.proof.constraints
      .filter((constraint) => !constraint.passed)
      .map((constraint) => constraint.constraintId),
  };
}
