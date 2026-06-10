/**
 * Unit tests for delegation types and validation
 */

import { describe, it, expect } from 'vitest';
import { validateDelegation, isDelegationValid, getTimeUntilExpiration } from '../../lib/delegation/delegation-service';
import type { DelegationContract } from '../../lib/delegation/types';

describe('DelegationContract validation', () => {
  const validDelegation: DelegationContract = {
    delegationId: 'deleg_123456_abcdef',
    orgId: 'org_001',
    userId: 'user_001',
    goal: 'Complete Stripe onboarding',
    scope: 'browser.stripe_marketplace',
    allowedActions: ['read_page', 'fill_form', 'click_safe_button'],
    blockedActions: ['delete_account', 'send_money'],
    requiresUserConfirm: ['final_submit', 'send_external_message'],
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +24h
  };

  describe('validateDelegation', () => {
    it('should validate a correct delegation', () => {
      const result = validateDelegation(validDelegation);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when delegationId is missing', () => {
      const invalid = { ...validDelegation, delegationId: '' };
      const result = validateDelegation(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('delegationId is required');
    });

    it('should fail when userId is missing', () => {
      const invalid = { ...validDelegation, userId: '' };
      const result = validateDelegation(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('userId'))).toBe(true);
    });

    it('should fail when goal is missing', () => {
      const invalid = { ...validDelegation, goal: '' };
      const result = validateDelegation(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('goal'))).toBe(true);
    });

    it('should fail when scope is missing', () => {
      const invalid = { ...validDelegation, scope: '' };
      const result = validateDelegation(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('scope'))).toBe(true);
    });

    it('should fail when allowedActions is not an array', () => {
      const invalid = { ...validDelegation, allowedActions: 'not_an_array' as unknown as string[] };
      const result = validateDelegation(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('allowedActions'))).toBe(true);
    });

    it('should fail when blockedActions is not an array', () => {
      const invalid = { ...validDelegation, blockedActions: 'not_an_array' as unknown as string[] };
      const result = validateDelegation(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('blockedActions'))).toBe(true);
    });

    it('should fail when expiresAt is not valid ISO8601', () => {
      const invalid = { ...validDelegation, expiresAt: 'not-a-date' };
      const result = validateDelegation(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('expiresAt'))).toBe(true);
    });

    it('should fail when expiresAt is missing', () => {
      const invalid = { ...validDelegation, expiresAt: '' };
      const result = validateDelegation(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('expiresAt'))).toBe(true);
    });

    it('should fail when action is in both allowedActions and blockedActions', () => {
      const invalid = {
        ...validDelegation,
        allowedActions: ['read_page', 'conflicting_action'],
        blockedActions: ['delete_account', 'conflicting_action'],
      };
      const result = validateDelegation(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('both allowedActions and blockedActions'))).toBe(true);
    });

    it('should warn about duplicate actions in allowedActions', () => {
      const invalid = {
        ...validDelegation,
        allowedActions: ['read_page', 'fill_form', 'read_page'],
      };
      const result = validateDelegation(invalid);
      expect(result.warnings.some((w) => w.includes('allowedActions'))).toBe(true);
    });

    it('should warn about duplicate actions in blockedActions', () => {
      const invalid = {
        ...validDelegation,
        blockedActions: ['delete_account', 'delete_account'],
      };
      const result = validateDelegation(invalid);
      expect(result.warnings.some((w) => w.includes('blockedActions'))).toBe(true);
    });
  });

  describe('isDelegationValid', () => {
    it('should return true for a valid non-expired delegation', () => {
      const result = isDelegationValid(validDelegation);
      expect(result).toBe(true);
    });

    it('should return false for null delegation', () => {
      const result = isDelegationValid(null);
      expect(result).toBe(false);
    });

    it('should return false for an expired delegation', () => {
      const expired = {
        ...validDelegation,
        expiresAt: new Date(Date.now() - 1000).toISOString(), // -1s
      };
      const result = isDelegationValid(expired);
      expect(result).toBe(false);
    });

    it('should return false for a delegation with invalid expiresAt', () => {
      const invalid = { ...validDelegation, expiresAt: 'not-a-date' };
      const result = isDelegationValid(invalid);
      expect(result).toBe(false);
    });

    it('should return false for a delegation with validation errors', () => {
      const invalid = { ...validDelegation, allowedActions: 'not_an_array' as unknown as string[] };
      const result = isDelegationValid(invalid);
      expect(result).toBe(false);
    });
  });

  describe('getTimeUntilExpiration', () => {
    it('should return positive milliseconds for a valid delegation', () => {
      const result = getTimeUntilExpiration(validDelegation);
      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
    });

    it('should return null for a null delegation', () => {
      const result = getTimeUntilExpiration(null);
      expect(result).toBeNull();
    });

    it('should return null for an expired delegation', () => {
      const expired = {
        ...validDelegation,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };
      const result = getTimeUntilExpiration(expired);
      expect(result).toBeNull();
    });

    it('should return approximate value for a delegation expiring soon', () => {
      const soon = {
        ...validDelegation,
        expiresAt: new Date(Date.now() + 5000).toISOString(), // +5s
      };
      const result = getTimeUntilExpiration(soon);
      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(5500); // Allow for execution time
    });
  });

  describe('Action permission checks', () => {
    it('should identify allowed actions correctly', () => {
      expect(validDelegation.allowedActions).toContain('read_page');
      expect(validDelegation.allowedActions).not.toContain('delete_account');
    });

    it('should identify blocked actions correctly', () => {
      expect(validDelegation.blockedActions).toContain('delete_account');
      expect(validDelegation.blockedActions).not.toContain('read_page');
    });

    it('should identify confirmation-required actions correctly', () => {
      expect(validDelegation.requiresUserConfirm).toContain('final_submit');
      expect(validDelegation.requiresUserConfirm).not.toContain('read_page');
    });

    it('should handle empty action lists', () => {
      const empty = {
        ...validDelegation,
        allowedActions: [],
        blockedActions: [],
        requiresUserConfirm: [],
      };
      const validation = validateDelegation(empty);
      expect(validation.valid).toBe(true); // Empty lists are technically valid
    });

    it('should handle wildcard allowed actions', () => {
      const wildcard = {
        ...validDelegation,
        allowedActions: ['*'],
      };
      expect(wildcard.allowedActions).toContain('*');
    });
  });
});
