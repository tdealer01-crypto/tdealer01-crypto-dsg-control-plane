import { describe, it, expect } from 'vitest';
import {
  computeEventHash,
  verifyEventChain,
  isEventHashValid,
  type EventPayloadForHash,
} from '@/lib/audit/hash-chain';

describe('Hash Chain - Event Hashing', () => {
  const basePayload: EventPayloadForHash = {
    eventId: '550e8400-e29b-41d4-a716-446655440001',
    jobId: '550e8400-e29b-41d4-a716-446655440002',
    delegationId: 'deleg-001',
    agentId: 'agent-claude-01',
    tool: 'browser',
    action: 'fill_form',
    target: 'https://stripe.com/onboarding',
    risk: 'MEDIUM',
    decision: 'ALLOW' as const,
    reason: 'Action allowed by delegation',
    evidenceJson: { confidence: 0.95, source: 'policy' },
    createdAt: '2026-06-10T12:00:00Z',
  };

  it('should compute a valid SHA256 hash', () => {
    const hash = computeEventHash(basePayload);
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should produce deterministic hash for same payload', () => {
    const hash1 = computeEventHash(basePayload);
    const hash2 = computeEventHash(basePayload);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hash when eventId changes', () => {
    const payload2 = { ...basePayload, eventId: '550e8400-e29b-41d4-a716-446655440999' };
    const hash1 = computeEventHash(basePayload);
    const hash2 = computeEventHash(payload2);
    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hash when decision changes', () => {
    const payloadAllow = basePayload;
    const payloadBlock = { ...basePayload, decision: 'BLOCK' as const };
    const hash1 = computeEventHash(payloadAllow);
    const hash2 = computeEventHash(payloadBlock);
    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hash when reason changes', () => {
    const payload2 = { ...basePayload, reason: 'Different reason' };
    const hash1 = computeEventHash(basePayload);
    const hash2 = computeEventHash(payload2);
    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hash when evidenceJson changes', () => {
    const payload2 = { ...basePayload, evidenceJson: { confidence: 0.50, source: 'policy' } };
    const hash1 = computeEventHash(basePayload);
    const hash2 = computeEventHash(payload2);
    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hash when createdAt changes', () => {
    const payload2 = { ...basePayload, createdAt: '2026-06-10T13:00:00Z' };
    const hash1 = computeEventHash(basePayload);
    const hash2 = computeEventHash(payload2);
    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hash when previousHash changes', () => {
    const payload1 = basePayload;
    const payload2 = {
      ...basePayload,
      previousHash: 'sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    };
    const hash1 = computeEventHash(payload1);
    const hash2 = computeEventHash(payload2);
    expect(hash1).not.toBe(hash2);
  });

  it('should handle optional fields correctly', () => {
    const payloadNoTarget = { ...basePayload, target: undefined };
    const payloadWithTarget = basePayload;
    const hash1 = computeEventHash(payloadNoTarget);
    const hash2 = computeEventHash(payloadWithTarget);
    expect(hash1).not.toBe(hash2);
  });
});

describe('Hash Chain - Event Validation', () => {
  const createEvent = (overrides: any = {}) => ({
    eventId: '550e8400-e29b-41d4-a716-446655440001',
    jobId: '550e8400-e29b-41d4-a716-446655440002',
    delegationId: 'deleg-001',
    agentId: 'agent-claude-01',
    tool: 'browser',
    action: 'fill_form',
    target: 'https://stripe.com',
    risk: 'MEDIUM' as const,
    decision: 'ALLOW' as const,
    reason: 'Allowed',
    evidenceJson: { score: 1 },
    previousHash: undefined,
    createdAt: '2026-06-10T12:00:00Z',
    eventHash: '', // Will be computed
    ...overrides,
  });

  it('should validate a single event hash', () => {
    const event = createEvent();
    const hash = computeEventHash({
      eventId: event.eventId,
      jobId: event.jobId,
      delegationId: event.delegationId,
      agentId: event.agentId,
      tool: event.tool,
      action: event.action,
      target: event.target,
      risk: event.risk,
      decision: event.decision,
      reason: event.reason,
      evidenceJson: event.evidenceJson,
      previousHash: event.previousHash,
      createdAt: event.createdAt,
    });
    event.eventHash = hash;

    expect(isEventHashValid(event)).toBe(true);
  });

  it('should reject invalid event hash', () => {
    const event = createEvent({
      eventHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
    });
    expect(isEventHashValid(event)).toBe(false);
  });
});

describe('Hash Chain - Chain Verification', () => {
  const createEvents = (count: number, jobId = '550e8400-e29b-41d4-a716-446655440002') => {
    const events = [];
    let previousHash: string | undefined;

    for (let i = 0; i < count; i++) {
      const eventId = `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`;
      const createdAt = new Date(2026, 5, 10, 12, i, 0).toISOString();

      const payload: EventPayloadForHash = {
        eventId,
        jobId,
        delegationId: `deleg-${i}`,
        agentId: `agent-${i}`,
        tool: 'browser',
        action: `action-${i}`,
        target: `target-${i}`,
        risk: 'MEDIUM',
        decision: 'ALLOW',
        reason: `Reason ${i}`,
        evidenceJson: { index: i },
        previousHash,
        createdAt,
      };

      const eventHash = computeEventHash(payload);

      events.push({
        eventId,
        jobId,
        delegationId: `deleg-${i}`,
        agentId: `agent-${i}`,
        tool: 'browser',
        action: `action-${i}`,
        target: `target-${i}`,
        risk: 'MEDIUM' as const,
        decision: 'ALLOW' as const,
        reason: `Reason ${i}`,
        evidenceJson: { index: i },
        previousHash,
        eventHash,
        createdAt,
      });

      previousHash = eventHash;
    }

    return events;
  };

  it('should verify empty chain', () => {
    const result = verifyEventChain([]);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should verify chain with single event', () => {
    const events = createEvents(1);
    const result = verifyEventChain(events);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should verify chain with multiple events', () => {
    const events = createEvents(5);
    const result = verifyEventChain(events);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect broken previousHash link', () => {
    const events = createEvents(3);
    // Break the link between event 1 and 2
    events[1].previousHash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';

    const result = verifyEventChain(events);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(`AUDIT_PREVIOUS_HASH_MISMATCH:${events[1].eventId}`);
  });

  it('should detect tampered event hash', () => {
    const events = createEvents(3);
    // Tamper with event 1 hash
    events[1].eventHash = 'sha256:9999999999999999999999999999999999999999999999999999999999999999';

    const result = verifyEventChain(events);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(`AUDIT_EVENT_HASH_MISMATCH:${events[1].eventId}`);
  });

  it('should detect cascading tampering in chain', () => {
    const events = createEvents(4);
    // Tamper with event 1
    events[1].eventHash = 'sha256:1111111111111111111111111111111111111111111111111111111111111111';
    // This will break the link to event 2
    // And event 2's hash will also be invalid after recompute

    const result = verifyEventChain(events);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('AUDIT_'))).toBe(true);
  });

  it('should detect first event with unexpected previousHash', () => {
    const events = createEvents(2);
    events[0].previousHash = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    // Recompute hash with new previousHash
    const payload: EventPayloadForHash = {
      eventId: events[0].eventId,
      jobId: events[0].jobId,
      delegationId: events[0].delegationId,
      agentId: events[0].agentId,
      tool: events[0].tool,
      action: events[0].action,
      target: events[0].target,
      risk: events[0].risk,
      decision: events[0].decision,
      reason: events[0].reason,
      evidenceJson: events[0].evidenceJson,
      previousHash: events[0].previousHash,
      createdAt: events[0].createdAt,
    };
    events[0].eventHash = computeEventHash(payload);

    const result = verifyEventChain(events);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('AUDIT_PREVIOUS_HASH_MISMATCH');
  });

  it('should verify chain even if events are unordered', () => {
    const events = createEvents(3);
    // Shuffle the events
    const shuffled = [events[2], events[0], events[1]];

    const result = verifyEventChain(shuffled);
    // Should still verify because verifyEventChain sorts them
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should verify chain with different job IDs remains independent', () => {
    const events1 = createEvents(2, '550e8400-e29b-41d4-a716-446655440001');
    const events2 = createEvents(2, '550e8400-e29b-41d4-a716-446655440002');

    const combined = [...events1, ...events2];

    const result = verifyEventChain(combined);
    // This should fail because the chains get mixed
    // Depending on timestamp ordering, previousHash links break
    expect(result.ok).toBe(false);
  });
});
