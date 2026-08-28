// ============================================================================
// Governed candidate deployment records
// ============================================================================
//
// post-deploy control took its DeploymentBinding (deploymentId, provider,
// commits) straight from the monitoring payload and only cross-checked it
// against the promotion receipt. Nothing recorded that a deploy had actually
// happened, so canary evidence could be attributed to a deployment that never
// ran. The deploy step writes a record through this contract right after the
// slot swap; post-deploy control then requires a matching row.
//
// Validation lives here rather than in the route so it is unit-testable, which
// is the pattern the rest of lib/agent-governance/agentic-org follows.

import type { PromotionReceipt } from './post-deploy-control';

export const DEPLOYMENT_RECORD_SCHEMA_VERSION = 'dsg-deployment-record-v1' as const;
export const DEPLOYMENT_PREFLIGHT_MESSAGE = 'dsg-deployment-preflight-v1' as const;

const COMMIT = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;

export interface DeploymentRecordRequest {
  schemaVersion: typeof DEPLOYMENT_RECORD_SCHEMA_VERSION;
  promotionId: string;
  promotionHash: string;
  deploymentId: string;
  targetRepository: string;
  baselineCommit: string;
  candidateCommit: string;
  provider: string;
  deploymentSlot: string;
  imageDigest?: string;
  workflowRunUri: string;
}

/** The subset of a persisted promotion receipt row this contract binds against. */
export interface PersistedPromotionReceiptRow {
  promotion_id: string;
  promotion_hash: string;
  target_repository: string;
  baseline_commit: string;
  candidate_commit: string;
}

export type DeploymentRecordFailureCode =
  | 'DEPLOYMENT_RECORD_PAYLOAD_INVALID'
  | 'DEPLOYMENT_PROVIDER_MISMATCH'
  | 'DEPLOYMENT_PROMOTION_BINDING_MISMATCH';

export type DeploymentPreflightFailureCode =
  | 'PRODUCTION_TARGET_UNBOUND'
  | 'DEPLOYMENT_ROLLBACK_TARGET_MISSING';

export interface DeploymentPreflightTarget {
  provider: string;
  productionDeployEnabled: boolean;
  rollbackTarget: string | null;
}

export function evaluateDeploymentPreflightTarget(
  target: DeploymentPreflightTarget,
): DeploymentPreflightFailureCode[] {
  const failures: DeploymentPreflightFailureCode[] = [];
  if (target.provider === 'UNBOUND' || target.productionDeployEnabled !== true) {
    failures.push('PRODUCTION_TARGET_UNBOUND');
  }
  if (typeof target.rollbackTarget !== 'string' || target.rollbackTarget.trim().length === 0) {
    failures.push('DEPLOYMENT_ROLLBACK_TARGET_MISSING');
  }
  return failures;
}

export function isDeploymentRecordRequest(value: unknown): value is DeploymentRecordRequest {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return (
    body.schemaVersion === DEPLOYMENT_RECORD_SCHEMA_VERSION &&
    typeof body.promotionId === 'string' && body.promotionId.trim().length > 0 &&
    typeof body.promotionHash === 'string' && SHA256.test(body.promotionHash) &&
    typeof body.deploymentId === 'string' && body.deploymentId.trim().length > 0 &&
    typeof body.targetRepository === 'string' && body.targetRepository.trim().length > 0 &&
    typeof body.baselineCommit === 'string' && COMMIT.test(body.baselineCommit) &&
    typeof body.candidateCommit === 'string' && COMMIT.test(body.candidateCommit) &&
    typeof body.provider === 'string' && body.provider.trim().length > 0 &&
    typeof body.deploymentSlot === 'string' && body.deploymentSlot.trim().length > 0 &&
    typeof body.workflowRunUri === 'string' && body.workflowRunUri.startsWith('https://') &&
    (typeof body.imageDigest === 'undefined' || typeof body.imageDigest === 'string')
  );
}

/**
 * Binds a deployment record request to the canonical promotion receipt that
 * Control Plane persisted when it issued ALLOW. Every commit and hash must
 * match: a deployment can only ever be recorded against the exact candidate
 * the Control Plane approved.
 */
export function bindDeploymentToPromotion(
  request: DeploymentRecordRequest,
  receipt: PersistedPromotionReceiptRow,
  boundProvider: string,
): DeploymentRecordFailureCode[] {
  const failures: DeploymentRecordFailureCode[] = [];

  if (request.provider !== boundProvider) {
    failures.push('DEPLOYMENT_PROVIDER_MISMATCH');
  }

  const boundToReceipt = receipt.promotion_id === request.promotionId &&
    receipt.promotion_hash === request.promotionHash &&
    receipt.target_repository === request.targetRepository &&
    receipt.baseline_commit === request.baselineCommit &&
    receipt.candidate_commit === request.candidateCommit;
  if (!boundToReceipt) {
    failures.push('DEPLOYMENT_PROMOTION_BINDING_MISMATCH');
  }

  return failures;
}

/** The subset of a persisted deployment record row post-deploy control checks. */
export interface PersistedDeploymentRecordRow {
  deployment_id: string;
  promotion_id: string;
  target_repository: string;
  baseline_commit: string;
  candidate_commit: string;
  provider: string;
}

/**
 * True when a persisted deployment record actually corresponds to the promotion
 * receipt and provider that post-deploy control is being asked to act on.
 */
export function deploymentRecordMatchesReceipt(
  record: PersistedDeploymentRecordRow,
  receipt: PromotionReceipt,
  submittedProvider: string,
): boolean {
  return record.promotion_id === receipt.promotionId &&
    record.target_repository === receipt.targetRepository &&
    record.baseline_commit === receipt.baselineCommit &&
    record.candidate_commit === receipt.candidateCommit &&
    record.provider === submittedProvider;
}
