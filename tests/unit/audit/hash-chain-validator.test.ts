import { describe, it, expect } from 'vitest';
import {
  computeEventHash,
  verifyEventChain,
  isEventHashValid,
  type EventPayloadForHash
} from '@/lib/audit/hash-chain';

describe('Hash Chain Validator', () => {
  describe('computeEventHash', () => {
    it('should compute deterministic hash', () => {
      const event: EventPayloadForHash = {
        eventId: 'event-1',
        jobId: 'job-1',
        delegationId: 'del-1',
        agentId: 'agent-1',
        tool: 'browser',
        action: 'click',
        target: 'button.submit',
        risk: 'low',
        decision: 'ALLOW',
        reason: 'User approved',
        evidenceJson: { approval: true },
        createdAt: '2026-07-30T10:00:00Z'
      };

      const hash1 = computeEventHash(event);
      const hash2 = computeEventHash(event);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:/);
    });

    it('should produce different hash for different events', () => {
      const event1: EventPayloadForHash = {
        eventId: 'event-1',
        jobId: 'job-1',
        delegationId: 'del-1',
        agentId: 'agent-1',
        tool: 'browser',
        action: 'click',
        target: 'button',
        risk: 'low',
        decision: 'ALLOW',
        reason: 'User approved',
        evidenceJson: { approval: true },
        createdAt: '2026-07-30T10:00:00Z'
      };

      const event2: EventPayloadForHash = {
        eventId: 'event-2',
        jobId: 'job-1',
        delegationId: 'del-1',
        agentId: 'agent-1',
        tool: 'browser',
        action: 'click',
        target: 'button',
        risk: 'low',
        decision: 'BLOCK',
        reason: 'Security policy',
        evidenceJson: { approved: false },
        createdAt: '2026-07-30T10:00:00Z'
      };

      const hash1 = computeEventHash(event1);
      const hash2 = computeEventHash(event2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('isEventHashValid', () => {
    it('should validate correct event hash', () => {
      const event = {
        eventId: 'event-1',
        jobId: 'job-1',
        delegationId: 'del-1',
        agentId: 'agent-1',
        tool: 'browser',
        action: 'click',
        target: 'button',
        risk: 'low',
        decision: 'ALLOW' as const,
        reason: 'User approved',
        evidenceJson: { approval: true },
        createdAt: '2026-07-30T10:00:00Z'
      };

      const hash = computeEventHash(event);
      const isValid = isEventHashValid({ ...event, eventHash: hash });

      expect(isValid).toBe(true);
    });
  });

  describe('verifyEventChain', () => {
    it('should handle empty chain', () => {
      const result = verifyEventChain([]);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should verify valid single event', () => {
      const event = {
        eventId: 'event-1',
        jobId: 'job-1',
        delegationId: 'del-1',
        agentId: 'agent-1',
        tool: 'browser',
        action: 'click',
        target: 'button',
        risk: 'low',
        decision: 'ALLOW' as const,
        reason: 'User approved',
        evidenceJson: { approval: true },
        previousHash: undefined,
        createdAt: '2026-07-30T10:00:00Z'
      };

      const hash = computeEventHash(event);
      const result = verifyEventChain([{ ...event, eventHash: hash }]);

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
