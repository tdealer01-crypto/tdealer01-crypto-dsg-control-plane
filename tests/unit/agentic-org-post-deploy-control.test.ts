import { describe, expect, it } from 'vitest';
import {
  evaluatePostDeployControl,
  PROMOTION_RECEIPT_SCHEMA_VERSION,
  type DeploymentBinding,
  type MonitoringPostDeployResult,
  type ProductionTargetSnapshot,
  type PromotionReceipt,
} from '../../lib/agent-governance/agentic-org/post-deploy-control';

const baseline = 'a'.repeat(40);
const candidate = 'b'.repeat(40);
const promotionHash = 'c'.repeat(64);
const evidenceHash = 'd'.repeat(64);

function monitoring(overrides: Partial<MonitoringPostDeployResult> = {}): MonitoringPostDeployResult {
  return {
    status: 'PASS',
    reason: 'POST_DEPLOY_IMPROVEMENT_VERIFIED',
    data: {
      baselineCommit: baseline,
      candidateCommit: candidate,
      deploymentId: 'deploy-1',
      evidenceHash,
      recommendedAction: 'ACCEPT_NEXT_BASELINE',
      rollbackRecommended: false,
      nextBaselineEligible: true,
      monitoringAuthority: 'OBSERVATION_ONLY',
      executionAuthority: 'DSG_CONTROL_PLANE',
    },
    ...overrides,
  };
}

function receipt(overrides: Partial<PromotionReceipt> = {}): PromotionReceipt {
  return {
    schemaVersion: PROMOTION_RECEIPT_SCHEMA_VERSION,
    promotionId: 'promotion-1',
    verdict: 'ALLOW',
    targetRepository: 'tdealer01-crypto/dsg-one-v1',
    baselineCommit: baseline,
    candidateCommit: candidate,
    promotionHash,
    issuedBy: 'DSG_CONTROL_PLANE',
    ...overrides,
  };
}

function deployment(overrides: Partial<DeploymentBinding> = {}): DeploymentBinding {
  return {
    deploymentId: 'deploy-1',
    promotionId: 'promotion-1',
    promotionHash,
    targetRepository: 'tdealer01-crypto/dsg-one-v1',
    baselineCommit: baseline,
    candidateCommit: candidate,
    provider: 'UNBOUND',
    ...overrides,
  };
}

function target(overrides: Partial<ProductionTargetSnapshot> = {}): ProductionTargetSnapshot {
  return {
    provider: 'UNBOUND',
    status: 'BLOCKED_UNTIL_BOUND',
    productionDeployEnabled: false,
    deploymentAdapter: null,
    healthProbe: null,
    rollbackTarget: null,
    rollbackAdapterEndpoint: null,
    ...overrides,
  };
}

describe('evaluatePostDeployControl', () => {
  it('commits an improved canary as the next baseline when bindings match', () => {
    const result = evaluatePostDeployControl({
      monitoring: monitoring(),
      promotionReceipt: receipt(),
      deployment: deployment(),
      productionTarget: target(),
    });

    expect(result.action).toBe('COMMIT_NEXT_BASELINE');
    expect(result.nextBaselineCommit).toBe(candidate);
    expect(result.failures).toEqual([]);
  });

  it('holds neutral or insufficient evidence without production mutation', () => {
    const result = evaluatePostDeployControl({
      monitoring: monitoring({
        status: 'REVIEW',
        reason: 'CANARY_EVIDENCE_INSUFFICIENT',
        data: {
          ...monitoring().data,
          recommendedAction: 'HOLD_REVIEW',
          nextBaselineEligible: false,
        },
      }),
      promotionReceipt: receipt(),
      deployment: deployment(),
      productionTarget: target(),
    });

    expect(result.action).toBe('HOLD_REVIEW');
    expect(result.nextBaselineCommit).toBeNull();
  });

  it('blocks rollback while the canonical production target is unbound', () => {
    const result = evaluatePostDeployControl({
      monitoring: monitoring({
        status: 'BLOCK',
        reason: 'PROTECTED_METRIC_REGRESSION',
        data: {
          ...monitoring().data,
          recommendedAction: 'ROLLBACK_RECOMMENDED',
          rollbackRecommended: true,
          nextBaselineEligible: false,
        },
      }),
      promotionReceipt: receipt(),
      deployment: deployment(),
      productionTarget: target(),
    });

    expect(result.action).toBe('BLOCK');
    expect(result.failures.map((failure) => failure.code)).toContain('PRODUCTION_TARGET_UNBOUND');
  });

  it('allows rollback only with an allowlisted bound adapter, signed endpoint and target', () => {
    const boundTarget = target({
      provider: 'GCLOUD',
      status: 'BOUND',
      productionDeployEnabled: true,
      deploymentAdapter: 'GCLOUD',
      healthProbe: 'https://service.example.com/api/health',
      rollbackTarget: 'revision-previous',
      rollbackAdapterEndpoint: 'https://deploy-adapter.example.com/v1/rollback',
    });
    const result = evaluatePostDeployControl({
      monitoring: monitoring({
        status: 'BLOCK',
        reason: 'PROTECTED_METRIC_REGRESSION',
        data: {
          ...monitoring().data,
          recommendedAction: 'ROLLBACK_RECOMMENDED',
          rollbackRecommended: true,
          nextBaselineEligible: false,
        },
      }),
      promotionReceipt: receipt(),
      deployment: deployment({ provider: 'GCLOUD' }),
      productionTarget: boundTarget,
    });

    expect(result.action).toBe('EXECUTE_ROLLBACK');
    expect(result.rollbackAdapter).toBe('GCLOUD');
    expect(result.rollbackTarget).toBe('revision-previous');
  });

  it('blocks a non-HTTPS rollback endpoint', () => {
    const result = evaluatePostDeployControl({
      monitoring: monitoring({
        status: 'BLOCK',
        reason: 'PROTECTED_METRIC_REGRESSION',
        data: {
          ...monitoring().data,
          recommendedAction: 'ROLLBACK_RECOMMENDED',
          rollbackRecommended: true,
          nextBaselineEligible: false,
        },
      }),
      promotionReceipt: receipt(),
      deployment: deployment({ provider: 'GCLOUD' }),
      productionTarget: target({
        provider: 'GCLOUD',
        status: 'BOUND',
        productionDeployEnabled: true,
        deploymentAdapter: 'GCLOUD',
        healthProbe: 'https://service.example.com/api/health',
        rollbackTarget: 'revision-previous',
        rollbackAdapterEndpoint: 'http://deploy-adapter.example.com/v1/rollback',
      }),
    });

    expect(result.action).toBe('BLOCK');
    expect(result.failures.map((failure) => failure.code)).toContain('ROLLBACK_ADAPTER_ENDPOINT_INVALID');
  });

  it('blocks forged or mismatched promotion bindings', () => {
    const result = evaluatePostDeployControl({
      monitoring: monitoring(),
      promotionReceipt: receipt({ candidateCommit: 'e'.repeat(40) }),
      deployment: deployment(),
      productionTarget: target(),
    });

    expect(result.action).toBe('BLOCK');
    expect(result.failures.map((failure) => failure.code)).toContain('PROMOTION_BINDING_MISMATCH');
  });

  it('blocks inconsistent monitoring authority semantics', () => {
    const forged = monitoring() as MonitoringPostDeployResult & {
      data: MonitoringPostDeployResult['data'] & { monitoringAuthority: string };
    };
    forged.data.monitoringAuthority = 'PROMOTION_AUTHORITY';

    const result = evaluatePostDeployControl({
      monitoring: forged as MonitoringPostDeployResult,
      promotionReceipt: receipt(),
      deployment: deployment(),
      productionTarget: target(),
    });

    expect(result.action).toBe('BLOCK');
    expect(result.failures.map((failure) => failure.code)).toContain('MONITORING_AUTHORITY_INVALID');
  });

  it('produces a deterministic control evidence hash', () => {
    const input = {
      monitoring: monitoring(),
      promotionReceipt: receipt(),
      deployment: deployment(),
      productionTarget: target(),
    };
    expect(evaluatePostDeployControl(input).controlEvidenceHash)
      .toBe(evaluatePostDeployControl(input).controlEvidenceHash);
  });
});
