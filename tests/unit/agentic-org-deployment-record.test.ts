import { describe, expect, it } from 'vitest';
import {
  bindDeploymentToPromotion,
  deploymentRecordMatchesReceipt,
  DEPLOYMENT_PREFLIGHT_MESSAGE,
  DEPLOYMENT_RECORD_SCHEMA_VERSION,
  evaluateDeploymentPreflightTarget,
  isDeploymentRecordRequest,
  type DeploymentRecordRequest,
  type PersistedDeploymentRecordRow,
  type PersistedPromotionReceiptRow,
} from '../../lib/agent-governance/agentic-org/deployment-record';
import {
  PROMOTION_RECEIPT_SCHEMA_VERSION,
  type PromotionReceipt,
} from '../../lib/agent-governance/agentic-org/post-deploy-control';

const REPO = 'tdealer01-crypto/dsg-agi-simulation';
const BASELINE = 'a'.repeat(40);
const CANDIDATE = 'b'.repeat(40);
const PROMOTION_HASH = 'c'.repeat(64);

function request(overrides: Partial<DeploymentRecordRequest> = {}): DeploymentRecordRequest {
  return {
    schemaVersion: DEPLOYMENT_RECORD_SCHEMA_VERSION,
    promotionId: 'promotion-abc123',
    promotionHash: PROMOTION_HASH,
    deploymentId: 'deploy-run-999-1',
    targetRepository: REPO,
    baselineCommit: BASELINE,
    candidateCommit: CANDIDATE,
    provider: 'AZURE',
    deploymentSlot: 'staging',
    imageDigest: 'sha256:deadbeef',
    workflowRunUri: 'https://github.com/tdealer01-crypto/dsg-agi-simulation/actions/runs/999',
    ...overrides,
  };
}

function receiptRow(overrides: Partial<PersistedPromotionReceiptRow> = {}): PersistedPromotionReceiptRow {
  return {
    promotion_id: 'promotion-abc123',
    promotion_hash: PROMOTION_HASH,
    target_repository: REPO,
    baseline_commit: BASELINE,
    candidate_commit: CANDIDATE,
    ...overrides,
  };
}

describe('deployment preflight target', () => {
  it('uses a stable HMAC message shared with the deployment workflow', () => {
    expect(DEPLOYMENT_PREFLIGHT_MESSAGE).toBe('dsg-deployment-preflight-v1');
  });

  it('passes only for an enabled bound provider with a rollback slot', () => {
    expect(evaluateDeploymentPreflightTarget({
      provider: 'AZURE',
      productionDeployEnabled: true,
      rollbackTarget: 'staging',
    })).toEqual([]);
  });

  it('blocks the canonical UNBOUND target before cloud mutation', () => {
    const failures = evaluateDeploymentPreflightTarget({
      provider: 'UNBOUND',
      productionDeployEnabled: false,
      rollbackTarget: null,
    });
    expect(failures).toContain('PRODUCTION_TARGET_UNBOUND');
    expect(failures).toContain('DEPLOYMENT_ROLLBACK_TARGET_MISSING');
  });

  it('blocks a nominally enabled target with no rollback slot', () => {
    expect(evaluateDeploymentPreflightTarget({
      provider: 'AZURE',
      productionDeployEnabled: true,
      rollbackTarget: '',
    })).toContain('DEPLOYMENT_ROLLBACK_TARGET_MISSING');
  });
});

describe('isDeploymentRecordRequest', () => {
  it('accepts a well-formed request', () => {
    expect(isDeploymentRecordRequest(request())).toBe(true);
  });

  it('accepts a request without the optional image digest', () => {
    const { imageDigest: _omitted, ...withoutDigest } = request();
    expect(isDeploymentRecordRequest(withoutDigest)).toBe(true);
  });

  it('rejects a wrong schema version', () => {
    expect(isDeploymentRecordRequest({ ...request(), schemaVersion: 'dsg-deployment-record-v2' })).toBe(false);
  });

  it('rejects short or non-hex commit SHAs', () => {
    expect(isDeploymentRecordRequest({ ...request(), candidateCommit: 'bbbb' })).toBe(false);
    expect(isDeploymentRecordRequest({ ...request(), baselineCommit: 'z'.repeat(40) })).toBe(false);
  });

  it('rejects a promotion hash that is not 64 hex characters', () => {
    expect(isDeploymentRecordRequest({ ...request(), promotionHash: 'c'.repeat(63) })).toBe(false);
  });

  it('rejects a non-HTTPS workflow run URI', () => {
    expect(isDeploymentRecordRequest({ ...request(), workflowRunUri: 'http://github.com/x' })).toBe(false);
  });

  it('rejects empty required strings', () => {
    expect(isDeploymentRecordRequest({ ...request(), deploymentId: '   ' })).toBe(false);
    expect(isDeploymentRecordRequest({ ...request(), deploymentSlot: '' })).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isDeploymentRecordRequest(null)).toBe(false);
    expect(isDeploymentRecordRequest('deployment')).toBe(false);
  });
});

describe('bindDeploymentToPromotion', () => {
  it('passes when every field matches the canonical receipt and the bound provider', () => {
    expect(bindDeploymentToPromotion(request(), receiptRow(), 'AZURE')).toEqual([]);
  });

  it('blocks a provider that is not the bound production provider', () => {
    expect(bindDeploymentToPromotion(request({ provider: 'GCLOUD' }), receiptRow(), 'AZURE'))
      .toContain('DEPLOYMENT_PROVIDER_MISMATCH');
  });

  it('blocks a deployment claiming a candidate commit the receipt did not approve', () => {
    expect(bindDeploymentToPromotion(request({ candidateCommit: 'd'.repeat(40) }), receiptRow(), 'AZURE'))
      .toContain('DEPLOYMENT_PROMOTION_BINDING_MISMATCH');
  });

  it('blocks a deployment whose promotion hash does not match the persisted receipt', () => {
    expect(bindDeploymentToPromotion(request(), receiptRow({ promotion_hash: 'e'.repeat(64) }), 'AZURE'))
      .toContain('DEPLOYMENT_PROMOTION_BINDING_MISMATCH');
  });

  it('blocks a deployment pointed at another repository', () => {
    expect(bindDeploymentToPromotion(request({ targetRepository: 'tdealer01-crypto/other' }), receiptRow(), 'AZURE'))
      .toContain('DEPLOYMENT_PROMOTION_BINDING_MISMATCH');
  });
});

describe('deploymentRecordMatchesReceipt', () => {
  function receipt(): PromotionReceipt {
    return {
      schemaVersion: PROMOTION_RECEIPT_SCHEMA_VERSION,
      promotionId: 'promotion-abc123',
      verdict: 'ALLOW',
      targetRepository: REPO,
      baselineCommit: BASELINE,
      candidateCommit: CANDIDATE,
      promotionHash: PROMOTION_HASH,
      issuedBy: 'DSG_CONTROL_PLANE',
    };
  }

  function record(overrides: Partial<PersistedDeploymentRecordRow> = {}): PersistedDeploymentRecordRow {
    return {
      deployment_id: 'deploy-run-999-1',
      promotion_id: 'promotion-abc123',
      target_repository: REPO,
      baseline_commit: BASELINE,
      candidate_commit: CANDIDATE,
      provider: 'AZURE',
      ...overrides,
    };
  }

  it('accepts a record bound to the same promotion, commits and provider', () => {
    expect(deploymentRecordMatchesReceipt(record(), receipt(), 'AZURE')).toBe(true);
  });

  it('rejects a record written for a different promotion', () => {
    expect(deploymentRecordMatchesReceipt(record({ promotion_id: 'promotion-other' }), receipt(), 'AZURE')).toBe(false);
  });

  it('rejects a record whose candidate commit drifted from the receipt', () => {
    expect(deploymentRecordMatchesReceipt(record({ candidate_commit: 'd'.repeat(40) }), receipt(), 'AZURE')).toBe(false);
  });

  it('rejects when the submitted provider disagrees with the recorded one', () => {
    expect(deploymentRecordMatchesReceipt(record(), receipt(), 'GCLOUD')).toBe(false);
  });
});
