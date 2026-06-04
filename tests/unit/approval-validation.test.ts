import { describe, it, expect } from 'vitest';
import {
  validateApprovalRequest,
  validateApprovalDecision,
  validatePaginationParams,
} from '@/lib/validation/approval-validation';

describe('Approval Validation', () => {
  describe('validateApprovalRequest', () => {
    it('should accept valid approval request', () => {
      const data = {
        agentId: 'claude-code-01',
        orgId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'Deploy to production',
        input: { environment: 'prod' },
        expiresInHours: 24,
        priority: 'high',
      };

      const result = validateApprovalRequest(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toBeDefined();
      expect(result.data?.agentId).toBe('claude-code-01');
      expect(result.data?.priority).toBe('high');
    });

    it('should reject missing agentId', () => {
      const data = {
        orgId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'Deploy',
      };

      const result = validateApprovalRequest(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('agentId');
    });

    it('should reject invalid UUID for orgId', () => {
      const data = {
        agentId: 'agent-123',
        orgId: 'not-a-uuid',
        action: 'Deploy',
      };

      const result = validateApprovalRequest(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'orgId')).toBe(true);
    });

    it('should reject action less than 5 characters', () => {
      const data = {
        agentId: 'agent-123',
        orgId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'Do',
      };

      const result = validateApprovalRequest(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'action')).toBe(true);
    });

    it('should reject expiresInHours > 720 (30 days)', () => {
      const data = {
        agentId: 'agent-123',
        orgId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'Deploy',
        expiresInHours: 1000,
      };

      const result = validateApprovalRequest(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'expiresInHours')).toBe(true);
    });

    it('should default expiresInHours to 24 if not provided', () => {
      const data = {
        agentId: 'agent-123',
        orgId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'Deploy',
      };

      const result = validateApprovalRequest(data);
      expect(result.valid).toBe(true);
      expect(result.data?.expiresInHours).toBe(24);
    });

    it('should reject invalid priority', () => {
      const data = {
        agentId: 'agent-123',
        orgId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'Deploy',
        priority: 'urgent',
      };

      const result = validateApprovalRequest(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'priority')).toBe(true);
    });

    it('should accept valid priorities', () => {
      for (const priority of ['low', 'medium', 'high']) {
        const data = {
          agentId: 'agent-123',
          orgId: '550e8400-e29b-41d4-a716-446655440000',
          action: 'Deploy',
          priority,
        };

        const result = validateApprovalRequest(data);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject non-object input', () => {
      const result = validateApprovalRequest('not an object');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_INPUT');
    });
  });

  describe('validateApprovalDecision', () => {
    it('should accept valid approval decision', () => {
      const data = {
        decision: 'approved',
        reason: 'Looks good',
      };

      const result = validateApprovalDecision(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data?.decision).toBe('approved');
    });

    it('should accept valid rejection decision', () => {
      const data = {
        decision: 'rejected',
        reason: 'Does not meet standards',
      };

      const result = validateApprovalDecision(data);
      expect(result.valid).toBe(true);
      expect(result.data?.decision).toBe('rejected');
    });

    it('should reject invalid decision', () => {
      const data = {
        decision: 'pending',
      };

      const result = validateApprovalDecision(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'decision')).toBe(true);
    });

    it('should reject missing decision', () => {
      const data = {
        reason: 'Some reason',
      };

      const result = validateApprovalDecision(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'decision')).toBe(true);
    });

    it('should reject reason > 1000 characters', () => {
      const data = {
        decision: 'approved',
        reason: 'x'.repeat(1001),
      };

      const result = validateApprovalDecision(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'reason')).toBe(true);
    });

    it('should accept reason with exactly 1000 characters', () => {
      const data = {
        decision: 'approved',
        reason: 'x'.repeat(1000),
      };

      const result = validateApprovalDecision(data);
      expect(result.valid).toBe(true);
    });
  });

  describe('validatePaginationParams', () => {
    it('should use default pagination when not provided', () => {
      const result = validatePaginationParams();
      expect(result.valid).toBe(true);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(25);
    });

    it('should accept valid pagination params', () => {
      const result = validatePaginationParams(10, 50);
      expect(result.valid).toBe(true);
      expect(result.offset).toBe(10);
      expect(result.limit).toBe(50);
    });

    it('should reject negative offset', () => {
      const result = validatePaginationParams(-1, 25);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'offset')).toBe(true);
    });

    it('should reject limit > 100', () => {
      const result = validatePaginationParams(0, 101);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'limit')).toBe(true);
    });

    it('should reject limit < 1', () => {
      const result = validatePaginationParams(0, 0);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'limit')).toBe(true);
    });

    it('should parse string numbers', () => {
      const result = validatePaginationParams('10', '25');
      expect(result.valid).toBe(true);
      expect(result.offset).toBe(10);
      expect(result.limit).toBe(25);
    });

    it('should reject non-integer offsets', () => {
      const result = validatePaginationParams(10.5, 25);
      expect(result.valid).toBe(false);
    });

    it('should accept offset up to 10000', () => {
      const result = validatePaginationParams(10000, 25);
      expect(result.valid).toBe(true);
      expect(result.offset).toBe(10000);
    });

    it('should reject offset > 10000', () => {
      const result = validatePaginationParams(10001, 25);
      expect(result.valid).toBe(false);
    });
  });
});
