import crypto from 'node:crypto';

export const POST_DEPLOY_CONTROL_SCHEMA_VERSION = 'dsg-post-deploy-control-v1' as const;
export const PROMOTION_RECEIPT_SCHEMA_VERSION = 'dsg-promotion-receipt-v1' as const;

export type MonitoringStatus = 'PASS' | 'REVIEW' | 'BLOCK';
export type MonitoringRecommendedAction =
  | 'ACCEPT_NEXT_BASELINE'
  | 'ROLLBACK_RECOMMENDED'
  | 'HOLD_REVIEW';

export interface MonitoringPostDeployResult {
  status: MonitoringStatus;
  reason: string;
  data: {
    baselineCommit: string;
    candidateCommit: string;
    deploymentId: string;
    evidenceHash: string;
    recommendedAction: MonitoringRecommendedAction;
    rollbackRecommended: boolean;
    nextBaselineEligible: boolean;
    monitoringAuthority: 'OBSERVATION_ONLY';
    executionAuthority: 'DSG_CONTROL_PLANE';
  };
}

export interface PromotionReceipt {
  schemaVersion: typeof PROMOTION_RECEIPT_SCHEMA_VERSION;
  promotionId: string;
  verdict: 'ALLOW';
  targetRepository: string;
  baselineCommit: string;
  candidateCommit: string;
  promotionHash: string;
  issuedBy: 'DSG_CONTROL_PLANE';
}

export interface DeploymentBinding {
  deploymentId: string;
  promotionId: string;
  promotionHash: string;
  targetRepository: string;
  baselineCommit: string;
  candidateCommit: string;
  provider: string;
}

export interface ProductionTargetSnapshot {
  provider: string;
  status: string;
  productionDeployEnabled: boolean;
  deploymentAdapter: string | null;
  healthProbe: string | null;
  rollbackTarget: string | null;
  rollbackAdapterEndpoint: string | null;
}

export type PostDeployControlAction =
  | 'EXECUTE_ROLLBACK'
  | 'COMMIT_NEXT_BASELINE'
  | 'HOLD_REVIEW'
  | 'BLOCK';

export type PostDeployControlFailureCode =
  | 'MONITORING_AUTHORITY_INVALID'
  | 'MONITORING_RESULT_INCONSISTENT'
  | 'MONITORING_EVIDENCE_HASH_INVALID'
  | 'PROMOTION_RECEIPT_INVALID'
  | 'PROMOTION_BINDING_MISMATCH'
  | 'DEPLOYMENT_BINDING_MISMATCH'
  | 'PRODUCTION_TARGET_UNBOUND'
  | 'ROLLBACK_ADAPTER_UNBOUND'
  | 'ROLLBACK_ADAPTER_NOT_ALLOWLISTED'
  | 'ROLLBACK_ADAPTER_ENDPOINT_INVALID';

export interface PostDeployControlFailure {
  code: PostDeployControlFailureCode;
  message: string;
}

export interface PostDeployControlResult {
  schemaVersion: typeof POST_DEPLOY_CONTROL_SCHEMA_VERSION;
  action: PostDeployControlAction;
  failures: PostDeployControlFailure[];
  promotionId: string;
  deploymentId: string;
  baselineCommit: string;
  candidateCommit: string;
  monitoringEvidenceHash: string;
  controlEvidenceHash: string;
  rollbackAdapter: string | null;
  rollbackTarget: string | null;
  nextBaselineCommit: string | null;
  authority: 'DSG_CONTROL_PLANE';
}

const SHA256 = /^[0-9a-f]{64}$/i;
const COMMIT = /^[0-9a-f]{40}$/i;
const ALLOWED_ROLLBACK_ADAPTERS = new Set(['AWS', 'GCLOUD', 'DOCKER', 'AZURE']);

function stableHash(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function consistentMonitoringResult(result: MonitoringPostDeployResult): boolean {
  const { status, data } = result;
  if (status === 'BLOCK') {
    return data.recommendedAction === 'ROLLBACK_RECOMMENDED' &&
      data.rollbackRecommended === true && data.nextBaselineEligible === false;
  }
  if (status === 'REVIEW') {
    return data.recommendedAction === 'HOLD_REVIEW' &&
      data.rollbackRecommended === false && data.nextBaselineEligible === false;
  }
  return data.recommendedAction === 'ACCEPT_NEXT_BASELINE' &&
    data.rollbackRecommended === false && data.nextBaselineEligible === true;
}

function fail(
  failure: PostDeployControlFailure,
  monitoring: MonitoringPostDeployResult,
  receipt: PromotionReceipt,
  deployment: DeploymentBinding,
  prior: PostDeployControlFailure[] = [],
): PostDeployControlResult {
  const failures = [...prior, failure];
  const core = {
    schemaVersion: POST_DEPLOY_CONTROL_SCHEMA_VERSION,
    action: 'BLOCK' as const,
    failures,
    promotionId: receipt.promotionId,
    deploymentId: deployment.deploymentId,
    baselineCommit: monitoring.data.baselineCommit,
    candidateCommit: monitoring.data.candidateCommit,
    monitoringEvidenceHash: monitoring.data.evidenceHash,
    rollbackAdapter: null,
    rollbackTarget: null,
    nextBaselineCommit: null,
    authority: 'DSG_CONTROL_PLANE' as const,
  };
  return { ...core, controlEvidenceHash: stableHash(core) };
}

export function evaluatePostDeployControl(input: {
  monitoring: MonitoringPostDeployResult;
  promotionReceipt: PromotionReceipt;
  deployment: DeploymentBinding;
  productionTarget: ProductionTargetSnapshot;
}): PostDeployControlResult {
  const { monitoring, promotionReceipt: receipt, deployment, productionTarget: target } = input;

  if (monitoring.data.monitoringAuthority !== 'OBSERVATION_ONLY' ||
      monitoring.data.executionAuthority !== 'DSG_CONTROL_PLANE') {
    return fail({
      code: 'MONITORING_AUTHORITY_INVALID',
      message: 'Monitoring may only emit observed evidence and must delegate execution authority to DSG_CONTROL_PLANE.',
    }, monitoring, receipt, deployment);
  }

  if (!consistentMonitoringResult(monitoring)) {
    return fail({
      code: 'MONITORING_RESULT_INCONSISTENT',
      message: 'Monitoring status, recommendation, rollback flag, and next-baseline eligibility are inconsistent.',
    }, monitoring, receipt, deployment);
  }

  if (!SHA256.test(monitoring.data.evidenceHash)) {
    return fail({
      code: 'MONITORING_EVIDENCE_HASH_INVALID',
      message: 'Monitoring evidence must carry a SHA-256 hash.',
    }, monitoring, receipt, deployment);
  }

  if (receipt.schemaVersion !== PROMOTION_RECEIPT_SCHEMA_VERSION || receipt.verdict !== 'ALLOW' ||
      receipt.issuedBy !== 'DSG_CONTROL_PLANE' || !receipt.promotionId.trim() ||
      !SHA256.test(receipt.promotionHash) || !COMMIT.test(receipt.baselineCommit) ||
      !COMMIT.test(receipt.candidateCommit)) {
    return fail({
      code: 'PROMOTION_RECEIPT_INVALID',
      message: 'A canonical ALLOW promotion receipt with valid commit/hash bindings is required.',
    }, monitoring, receipt, deployment);
  }

  if (receipt.baselineCommit !== monitoring.data.baselineCommit ||
      receipt.candidateCommit !== monitoring.data.candidateCommit ||
      receipt.targetRepository !== deployment.targetRepository) {
    return fail({
      code: 'PROMOTION_BINDING_MISMATCH',
      message: 'Monitoring evidence must be bound to the same baseline/candidate/repository as the ALLOW promotion receipt.',
    }, monitoring, receipt, deployment);
  }

  if (deployment.promotionId !== receipt.promotionId ||
      deployment.promotionHash !== receipt.promotionHash ||
      deployment.baselineCommit !== receipt.baselineCommit ||
      deployment.candidateCommit !== receipt.candidateCommit ||
      deployment.deploymentId !== monitoring.data.deploymentId ||
      deployment.provider !== target.provider) {
    return fail({
      code: 'DEPLOYMENT_BINDING_MISMATCH',
      message: 'Post-deploy evidence must match the exact promoted deployment and configured provider.',
    }, monitoring, receipt, deployment);
  }

  const common = {
    schemaVersion: POST_DEPLOY_CONTROL_SCHEMA_VERSION,
    failures: [] as PostDeployControlFailure[],
    promotionId: receipt.promotionId,
    deploymentId: deployment.deploymentId,
    baselineCommit: receipt.baselineCommit,
    candidateCommit: receipt.candidateCommit,
    monitoringEvidenceHash: monitoring.data.evidenceHash,
    authority: 'DSG_CONTROL_PLANE' as const,
  };

  if (monitoring.status === 'REVIEW') {
    const core = {
      ...common,
      action: 'HOLD_REVIEW' as const,
      rollbackAdapter: null,
      rollbackTarget: null,
      nextBaselineCommit: null,
    };
    return { ...core, controlEvidenceHash: stableHash(core) };
  }

  // A measured next baseline must have come from a real, bound production
  // deployment. `UNBOUND` is never accepted as a deployable provider merely
  // because the submitted deployment object uses the same string.
  if (target.provider === 'UNBOUND' || target.productionDeployEnabled !== true) {
    return fail({
      code: 'PRODUCTION_TARGET_UNBOUND',
      message: 'Post-deploy mutation is blocked because no production provider is currently bound and enabled.',
    }, monitoring, receipt, deployment);
  }

  if (monitoring.status === 'PASS') {
    if (!target.deploymentAdapter || !target.healthProbe) {
      return fail({
        code: 'PRODUCTION_TARGET_UNBOUND',
        message: 'Next-baseline promotion requires a bound deployment adapter and health probe.',
      }, monitoring, receipt, deployment);
    }
    const core = {
      ...common,
      action: 'COMMIT_NEXT_BASELINE' as const,
      rollbackAdapter: null,
      rollbackTarget: null,
      nextBaselineCommit: receipt.candidateCommit,
    };
    return { ...core, controlEvidenceHash: stableHash(core) };
  }

  if (!target.deploymentAdapter || !target.rollbackTarget || !target.healthProbe || !target.rollbackAdapterEndpoint) {
    return fail({
      code: 'ROLLBACK_ADAPTER_UNBOUND',
      message: 'Rollback requires an approved deployment adapter, signed rollback endpoint, rollback target, and health probe.',
    }, monitoring, receipt, deployment);
  }

  const adapter = target.deploymentAdapter.toUpperCase();
  if (!ALLOWED_ROLLBACK_ADAPTERS.has(adapter)) {
    return fail({
      code: 'ROLLBACK_ADAPTER_NOT_ALLOWLISTED',
      message: `Rollback adapter ${adapter} is not in the deterministic allowlist.`,
    }, monitoring, receipt, deployment);
  }

  if (!target.rollbackAdapterEndpoint.startsWith('https://')) {
    return fail({
      code: 'ROLLBACK_ADAPTER_ENDPOINT_INVALID',
      message: 'Rollback adapter endpoint must use HTTPS.',
    }, monitoring, receipt, deployment);
  }

  const core = {
    ...common,
    action: 'EXECUTE_ROLLBACK' as const,
    rollbackAdapter: adapter,
    rollbackTarget: target.rollbackTarget,
    nextBaselineCommit: null,
  };
  return { ...core, controlEvidenceHash: stableHash(core) };
}
