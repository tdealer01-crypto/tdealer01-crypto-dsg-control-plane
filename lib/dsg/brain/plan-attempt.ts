/**
 * Plan Attempt Model for DSG Brain.
 * Represents an immutable plan snapshot with deterministic identity.
 */

import { sha256Hash } from "./hash-utils";

export interface PlanAttemptInput {
  /** Stable hash of the original request/input that triggered planning */
  inputHash: string;
  /** Sequential attempt number (1-based) */
  attemptNo: number;
  /** The canonical plan text or structured plan */
  canonicalPlan: string;
  /** Version of the policy under which this plan was generated */
  policyVersion: string;
  /** Version of invariants enforced during planning */
  invariantVersion: string;
  /** Hash of the tool manifest available at planning time */
  toolManifestHash: string;
}

export interface PlanAttempt extends PlanAttemptInput {
  /** Deterministic hash of the canonical plan content */
  planHash: string;
}

/**
 * Build a PlanAttempt with computed planHash.
 * The planHash covers canonicalPlan, policyVersion, invariantVersion, and toolManifestHash.
 */
export function buildPlanAttempt(
  input: PlanAttemptInput
): PlanAttempt {
  const planHash = sha256Hash({
    canonicalPlan: input.canonicalPlan,
    policyVersion: input.policyVersion,
    invariantVersion: input.invariantVersion,
    toolManifestHash: input.toolManifestHash,
  });

  return {
    ...input,
    planHash,
  };
}

/**
 * Recompute the planHash for verification.
 */
export function recomputePlanHash(
  canonicalPlan: string,
  policyVersion: string,
  invariantVersion: string,
  toolManifestHash: string
): string {
  return sha256Hash({
    canonicalPlan,
    policyVersion,
    invariantVersion,
    toolManifestHash,
  });
}

/**
 * Verify that a PlanAttempt's planHash is internally consistent.
 */
export function verifyPlanHash(plan: PlanAttempt): boolean {
  const expected = recomputePlanHash(
    plan.canonicalPlan,
    plan.policyVersion,
    plan.invariantVersion,
    plan.toolManifestHash
  );
  return expected === plan.planHash;
}
