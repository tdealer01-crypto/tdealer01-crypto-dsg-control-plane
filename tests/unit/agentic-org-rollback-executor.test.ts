import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { executeGovernedRollback, type GovernedRollbackRequest } from '../../lib/agent-governance/agentic-org/rollback-executor';

function request(): GovernedRollbackRequest {
  return {
    schemaVersion: 'dsg-governed-rollback-v1',
    promotionId: 'promotion-1',
    deploymentId: 'deploy-1',
    targetRepository: 'tdealer01-crypto/dsg-one-v1',
    candidateCommit: 'b'.repeat(40),
    adapter: 'GCLOUD',
    rollbackTarget: 'revision-previous',
    controlEvidenceHash: 'c'.repeat(64),
  };
}

describe('executeGovernedRollback', () => {
  it('signs exact rollback payload and accepts only bound health-passed evidence', async () => {
    const secret = 'rollback-secret';
    let body = '';
    let signature = '';
    const result = await executeGovernedRollback(
      'https://deploy-adapter.example.com/v1/rollback',
      secret,
      request(),
      async (_input, init) => {
        body = String(init?.body || '');
        signature = (init?.headers as Record<string, string>)['x-dsg-signature'];
        return new Response(JSON.stringify({
          schemaVersion: 'dsg-governed-rollback-evidence-v1',
          status: 'ROLLED_BACK',
          promotionId: 'promotion-1',
          deploymentId: 'deploy-1',
          rollbackTarget: 'revision-previous',
          healthPassed: true,
          evidenceHash: 'd'.repeat(64),
        }), { status: 200 });
      },
    );

    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(signature).toBe(`sha256=${expected}`);
    expect(result.status).toBe('ROLLED_BACK');
    expect(result.healthPassed).toBe(true);
  });

  it('rejects adapter evidence bound to another deployment', async () => {
    await expect(executeGovernedRollback(
      'https://deploy-adapter.example.com/v1/rollback',
      'secret',
      request(),
      async () => new Response(JSON.stringify({
        schemaVersion: 'dsg-governed-rollback-evidence-v1',
        status: 'ROLLED_BACK',
        promotionId: 'promotion-1',
        deploymentId: 'deploy-other',
        rollbackTarget: 'revision-previous',
        healthPassed: true,
        evidenceHash: 'd'.repeat(64),
      }), { status: 200 }),
    )).rejects.toThrow('ROLLBACK_EVIDENCE_BINDING_INVALID');
  });

  it('rejects non-HTTPS endpoints', async () => {
    await expect(executeGovernedRollback(
      'http://deploy-adapter.example.com/v1/rollback',
      'secret',
      request(),
    )).rejects.toThrow('ROLLBACK_ENDPOINT_MUST_BE_HTTPS');
  });
});
