import { describe, it, expect, vi } from 'vitest';
import {
  recordDelegationActionAudit,
  recordAllowAction,
  recordBlockAction,
  type RecordDelegationActionInput,
  type AuditEvent,
} from '@/lib/audit/delegation-audit-recorder';
import { verifyEventChain } from '@/lib/audit/hash-chain';

describe('Delegation Audit Recorder - Recording Actions', () => {
  const jobId = '550e8400-e29b-41d4-a716-446655440002';
  const delegationId = 'deleg-001';
  const agentId = 'agent-claude-01';

  const baseInput: RecordDelegationActionInput = {
    jobId,
    delegationId,
    agentId,
    tool: 'browser',
    action: 'fill_form',
    target: 'https://stripe.com/onboarding',
    risk: 'MEDIUM',
    decision: 'ALLOW',
    reason: 'Action allowed by delegation contract',
    evidenceJson: {
      confidence: 0.95,
      source: 'delegation_policy',
      checked_at: new Date().toISOString(),
    },
  };

  it('should record ALLOW action without DB', async () => {
    const event = await recordDelegationActionAudit(baseInput);

    expect(event).toBeDefined();
    expect(event.eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(event.jobId).toBe(jobId);
    expect(event.delegationId).toBe(delegationId);
    expect(event.agentId).toBe(agentId);
    expect(event.tool).toBe('browser');
    expect(event.action).toBe('fill_form');
    expect(event.target).toBe('https://stripe.com/onboarding');
    expect(event.risk).toBe('MEDIUM');
    expect(event.decision).toBe('ALLOW');
    expect(event.reason).toBe('Action allowed by delegation contract');
    expect(event.previousHash).toBeUndefined();
    expect(event.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(event.createdAt).toBeDefined();
  });

  it('should record BLOCK action without DB', async () => {
    const input: RecordDelegationActionInput = {
      ...baseInput,
      decision: 'BLOCK',
      reason: 'Action violates security policy',
    };

    const event = await recordDelegationActionAudit(input);

    expect(event.decision).toBe('BLOCK');
    expect(event.reason).toBe('Action violates security policy');
    expect(event.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should record action with optional target', async () => {
    const input: RecordDelegationActionInput = {
      ...baseInput,
      target: undefined,
    };

    const event = await recordDelegationActionAudit(input);

    expect(event.target).toBeUndefined();
    expect(event.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should generate unique eventIds for same input', async () => {
    const event1 = await recordDelegationActionAudit(baseInput);
    const event2 = await recordDelegationActionAudit(baseInput);

    expect(event1.eventId).not.toBe(event2.eventId);
  });

  it('should generate different timestamps for different events', async () => {
    const event1 = await recordDelegationActionAudit(baseInput);
    // Small delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));
    const event2 = await recordDelegationActionAudit(baseInput);

    expect(event1.createdAt).not.toBe(event2.createdAt);
  });

  it('should generate different hashes for different eventIds', async () => {
    const event1 = await recordDelegationActionAudit(baseInput);
    const event2 = await recordDelegationActionAudit(baseInput);

    expect(event1.eventHash).not.toBe(event2.eventHash);
  });
});

describe('Delegation Audit Recorder - Convenience Functions', () => {
  const baseInput = {
    jobId: '550e8400-e29b-41d4-a716-446655440002',
    delegationId: 'deleg-001',
    agentId: 'agent-claude-01',
    tool: 'browser',
    action: 'submit_form',
    target: 'https://example.com',
    risk: 'HIGH' as const,
    evidenceJson: { checked: true },
  };

  it('should record allow action with helper', async () => {
    const event = await recordAllowAction({
      ...baseInput,
      reason: 'Approved by policy engine',
    });

    expect(event.decision).toBe('ALLOW');
    expect(event.reason).toBe('Approved by policy engine');
  });

  it('should record allow action with default reason', async () => {
    const event = await recordAllowAction(baseInput);

    expect(event.decision).toBe('ALLOW');
    expect(event.reason).toBe('Action allowed by delegation contract');
  });

  it('should record block action with helper', async () => {
    const event = await recordBlockAction({
      ...baseInput,
      reason: 'Blocked by risk policy',
    });

    expect(event.decision).toBe('BLOCK');
    expect(event.reason).toBe('Blocked by risk policy');
  });

  it('should record block action with default reason', async () => {
    const event = await recordBlockAction(baseInput);

    expect(event.decision).toBe('BLOCK');
    expect(event.reason).toBe('Action blocked by policy');
  });
});

describe('Delegation Audit Recorder - Hash Chain Integrity', () => {
  const jobId = '550e8400-e29b-41d4-a716-446655440002';

  const createInput = (overrides: any = {}): RecordDelegationActionInput => ({
    jobId,
    delegationId: 'deleg-001',
    agentId: 'agent-claude-01',
    tool: 'browser',
    action: 'action',
    risk: 'MEDIUM',
    decision: 'ALLOW',
    reason: 'Test',
    evidenceJson: {},
    ...overrides,
  });

  it('should create valid hash for single event', async () => {
    const event = await recordDelegationActionAudit(createInput());

    // Verify the event's hash is valid
    const result = verifyEventChain([event]);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should create valid individual event hashes without DB', async () => {
    const event1 = await recordDelegationActionAudit(createInput());
    const event2 = await recordDelegationActionAudit(
      createInput({
        delegationId: 'deleg-002',
      }),
    );
    const event3 = await recordDelegationActionAudit(
      createInput({
        delegationId: 'deleg-003',
      }),
    );

    // Without DB, previousHash won't be set
    // Each event should still have a valid hash
    expect(event1.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(event2.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(event3.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(event1.previousHash).toBeUndefined();
    expect(event2.previousHash).toBeUndefined();
    expect(event3.previousHash).toBeUndefined();
  });

  it('should handle multiple actions per delegation', async () => {
    const delegationId = 'deleg-multi-action';

    const event1 = await recordDelegationActionAudit(
      createInput({
        delegationId,
        action: 'action-1',
      }),
    );

    const event2 = await recordDelegationActionAudit(
      createInput({
        delegationId,
        action: 'action-2',
      }),
    );

    const event3 = await recordDelegationActionAudit(
      createInput({
        delegationId,
        action: 'action-3',
      }),
    );

    // All events should have valid individual hashes
    expect(event1.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(event2.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(event3.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    // Each should be independent without DB previousHash linking
    expect(event1.previousHash).toBeUndefined();
    expect(event2.previousHash).toBeUndefined();
    expect(event3.previousHash).toBeUndefined();
  });

  it('should handle mixed ALLOW and BLOCK decisions', async () => {
    const event1 = await recordDelegationActionAudit(
      createInput({
        decision: 'ALLOW',
        reason: 'Allowed',
      }),
    );

    const event2 = await recordDelegationActionAudit(
      createInput({
        delegationId: 'deleg-002',
        decision: 'BLOCK',
        reason: 'Blocked',
      }),
    );

    // Both events should have valid hashes
    expect(event1.decision).toBe('ALLOW');
    expect(event2.decision).toBe('BLOCK');
    expect(event1.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(event2.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should handle different risk levels', async () => {
    const risks: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    const events = await Promise.all(
      risks.map((risk, i) =>
        recordDelegationActionAudit(
          createInput({
            delegationId: `deleg-${i}`,
            risk,
          }),
        ),
      ),
    );

    // All events should have valid hashes
    for (const event of events) {
      expect(event.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
    // Verify all events have correct risk levels
    for (let i = 0; i < risks.length; i++) {
      expect(events[i].risk).toBe(risks[i]);
    }
  });
});

describe('Delegation Audit Recorder - Edge Cases', () => {
  const baseInput: RecordDelegationActionInput = {
    jobId: '550e8400-e29b-41d4-a716-446655440002',
    delegationId: 'deleg-001',
    agentId: 'agent-claude-01',
    tool: 'browser',
    action: 'action',
    risk: 'MEDIUM',
    decision: 'ALLOW',
    reason: 'Test',
    evidenceJson: {},
  };

  it('should handle empty evidenceJson', async () => {
    const event = await recordDelegationActionAudit({
      ...baseInput,
      evidenceJson: {},
    });

    expect(event.evidenceJson).toEqual({});
    expect(event.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should handle complex evidenceJson', async () => {
    const event = await recordDelegationActionAudit({
      ...baseInput,
      evidenceJson: {
        policy_checks: [
          { name: 'risk_gate', passed: true },
          { name: 'org_scope', passed: true },
        ],
        confidence_score: 0.98,
        metadata: {
          user_agent: 'Chrome/120',
          ip_country: 'US',
        },
      },
    });

    expect(event.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should handle all risk levels', async () => {
    const risks: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    for (const risk of risks) {
      const event = await recordDelegationActionAudit({
        ...baseInput,
        delegationId: `deleg-${risk}`,
        risk,
      });

      expect(event.risk).toBe(risk);
      expect(event.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
  });

  it('should handle very long reason text', async () => {
    const longReason = 'A'.repeat(1000);
    const event = await recordDelegationActionAudit({
      ...baseInput,
      reason: longReason,
    });

    expect(event.reason).toBe(longReason);
    expect(event.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should handle unicode in action and target', async () => {
    const event = await recordDelegationActionAudit({
      ...baseInput,
      action: 'fill_form_ทดสอบ',
      target: 'https://example.com?q=ทดสอบ',
    });

    expect(event.action).toBe('fill_form_ทดสอบ');
    expect(event.target).toBe('https://example.com?q=ทดสอบ');
    expect(event.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

describe('Delegation Audit Recorder - Event Properties', () => {
  it('should record createdAt timestamp', async () => {
    const beforeTime = new Date().toISOString();

    const event = await recordDelegationActionAudit({
      jobId: '550e8400-e29b-41d4-a716-446655440002',
      delegationId: 'deleg-001',
      agentId: 'agent-claude-01',
      tool: 'browser',
      action: 'action',
      risk: 'MEDIUM',
      decision: 'ALLOW',
      reason: 'Test',
      evidenceJson: {},
    });

    const afterTime = new Date().toISOString();

    expect(new Date(event.createdAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
    expect(new Date(event.createdAt).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
  });

  it('should record all required fields', async () => {
    const event = await recordDelegationActionAudit({
      jobId: '550e8400-e29b-41d4-a716-446655440002',
      delegationId: 'deleg-001',
      agentId: 'agent-claude-01',
      tool: 'browser',
      action: 'action',
      risk: 'MEDIUM',
      decision: 'ALLOW',
      reason: 'Test',
      evidenceJson: { test: true },
    });

    const requiredFields: (keyof AuditEvent)[] = [
      'eventId',
      'jobId',
      'delegationId',
      'agentId',
      'tool',
      'action',
      'risk',
      'decision',
      'reason',
      'evidenceJson',
      'eventHash',
      'createdAt',
    ];

    for (const field of requiredFields) {
      expect(event[field]).toBeDefined();
    }
  });
});
