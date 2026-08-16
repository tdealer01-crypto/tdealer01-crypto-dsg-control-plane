import { describe, expect, it } from 'vitest';
import {
  recordDelegationActionAudit,
  recordAllowAction,
  recordBlockAction,
  type RecordDelegationActionInput,
} from '@/lib/audit/delegation-audit-recorder';

/**
 * Audit truth-boundary tests.
 *
 * An in-memory object is not audit evidence. Positive persistence/hash-chain
 * integration must run against a configured audit database; this suite proves
 * that the recorder fails closed when that authority is absent.
 */
describe('Delegation Audit Recorder persistence boundary', () => {
  const baseInput: RecordDelegationActionInput = {
    jobId: '550e8400-e29b-41d4-a716-446655440002',
    delegationId: 'deleg-001',
    agentId: 'agent-claude-01',
    tool: 'browser',
    action: 'fill_form',
    target: 'https://stripe.com/onboarding',
    risk: 'MEDIUM',
    decision: 'ALLOW',
    reason: 'Action allowed by delegation contract',
    evidenceJson: { source: 'delegation_policy' },
  };

  it('does not fabricate ALLOW audit evidence without a database', async () => {
    await expect(recordDelegationActionAudit(baseInput, undefined)).rejects.toThrow(
      'AUDIT_DATABASE_REQUIRED',
    );
  });

  it('does not fabricate BLOCK audit evidence without a database', async () => {
    await expect(recordDelegationActionAudit({
      ...baseInput,
      decision: 'BLOCK',
      reason: 'Action violates security policy',
    }, undefined)).rejects.toThrow('AUDIT_DATABASE_REQUIRED');
  });

  it('recordAllowAction also requires persistence', async () => {
    const { decision: _decision, ...input } = baseInput;
    await expect(recordAllowAction(input, undefined)).rejects.toThrow('AUDIT_DATABASE_REQUIRED');
  });

  it('recordBlockAction also requires persistence', async () => {
    const { decision: _decision, ...input } = baseInput;
    await expect(recordBlockAction(input, undefined)).rejects.toThrow('AUDIT_DATABASE_REQUIRED');
  });

  it('does not treat optional target/evidence shape as permission to bypass persistence', async () => {
    await expect(recordDelegationActionAudit({
      ...baseInput,
      target: undefined,
      evidenceJson: {},
    }, undefined)).rejects.toThrow('AUDIT_DATABASE_REQUIRED');
  });
});
