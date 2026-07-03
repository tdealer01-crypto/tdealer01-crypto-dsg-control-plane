/**
 * Integration tests for delegation permission gate
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkDelegationPermission,
  isActionBlocked,
  isActionAllowed,
  requiresConfirmation,
} from '../../lib/spine/permission-gate';
import type { DelegationContract, AgentWorkStep, PermissionCheckContext } from '../../lib/delegation/types';

describe('Delegation Permission Gate', () => {
  let delegation: DelegationContract;

  beforeEach(() => {
    delegation = {
      delegationId: 'deleg_test_001',
      orgId: 'org_test',
      userId: 'user_test',
      goal: 'Complete form filling',
      scope: 'browser.form_filling',
      allowedActions: ['read_page', 'fill_form', 'click_safe_button', 'browser:*'],
      blockedActions: ['delete_account', 'send_money', 'export_data'],
      requiresUserConfirm: ['final_submit', 'send_external_message'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  describe('checkDelegationPermission - Risk-based decisions', () => {
    it('should ALLOW LOW risk action that is in allowedActions', () => {
      const step: AgentWorkStep = {
        stepId: 'step_001',
        tool: 'browser',
        action: 'read_page',
        risk: 'LOW',
        requiresConfirmation: false,
      };

      const decision = checkDelegationPermission(delegation, step);
      expect(decision.decision).toBe('ALLOW');
      expect(decision.reason).toBe('LOW_RISK_ACTION_ALLOWED');
    });

    it('should ALLOW MEDIUM risk action that is in allowedActions', () => {
      const step: AgentWorkStep = {
        stepId: 'step_002',
        tool: 'browser',
        action: 'fill_form',
        risk: 'MEDIUM',
        requiresConfirmation: false,
      };

      const decision = checkDelegationPermission(delegation, step);
      expect(decision.decision).toBe('ALLOW');
      expect(decision.reason).toBe('MEDIUM_RISK_AUTO_ALLOWED_WITH_AUDIT');
      expect(decision.evidenceRequired).toContain('audit_log');
    });

    it('should REVIEW HIGH risk action even if in allowedActions', () => {
      const step: AgentWorkStep = {
        stepId: 'step_003',
        tool: 'browser',
        action: 'click_safe_button',
        risk: 'HIGH',
        requiresConfirmation: false,
      };

      const decision = checkDelegationPermission(delegation, step);
      expect(decision.decision).toBe('REVIEW');
      expect(decision.reason).toBe('HIGH_RISK_REQUIRES_CONFIRMATION');
      expect(decision.evidenceRequired).toContain('user_confirmation');
    });

    it('should REVIEW CRITICAL risk action', () => {
      const step: AgentWorkStep = {
        stepId: 'step_004',
        tool: 'browser',
        action: 'click_safe_button',
        risk: 'CRITICAL',
        requiresConfirmation: false,
      };

      const decision = checkDelegationPermission(delegation, step);
      expect(decision.decision).toBe('REVIEW');
      expect(decision.reason).toBe('CRITICAL_RISK_REQUIRES_CONFIRMATION');
      expect(decision.evidenceRequired).toContain('user_confirmation');
    });
  });

  describe('checkDelegationPermission - Blocked actions', () => {
    it('should BLOCK action that is in blockedActions', () => {
      const step: AgentWorkStep = {
        stepId: 'step_005',
        tool: 'browser',
        action: 'delete_account',
        risk: 'LOW',
        requiresConfirmation: false,
      };

      const decision = checkDelegationPermission(delegation, step);
      expect(decision.decision).toBe('BLOCK');
      expect(decision.reason).toBe('ACTION_BLOCKED_BY_DELEGATION');
    });

    it('should ALLOW unknown action if tool wildcard is present', () => {
      const step: AgentWorkStep = {
        stepId: 'step_006',
        tool: 'browser',
        action: 'unknown_action',
        risk: 'LOW',
        requiresConfirmation: false,
      };

      const decision = checkDelegationPermission(delegation, step);
      // browser:* is in allowedActions, so unknown_action is allowed
      expect(decision.decision).toBe('ALLOW');
      expect(decision.reason).toBe('LOW_RISK_ACTION_ALLOWED');
    });
  });

  describe('checkDelegationPermission - Confirmation overrides', () => {
    it('should REVIEW action that requires confirmation even if LOW risk', () => {
      const step: AgentWorkStep = {
        stepId: 'step_007',
        tool: 'browser',
        action: 'final_submit',
        risk: 'LOW',
        requiresConfirmation: false,
      };

      const decision = checkDelegationPermission(delegation, step);
      expect(decision.decision).toBe('REVIEW');
      expect(decision.reason).toContain('REQUIRES_CONFIRMATION');
      expect(decision.evidenceRequired).toContain('user_confirmation');
    });

    it('should REVIEW action with step-level requiresConfirmation flag', () => {
      const step: AgentWorkStep = {
        stepId: 'step_008',
        tool: 'browser',
        action: 'read_page',
        risk: 'LOW',
        requiresConfirmation: true, // Step-level flag
        confirmationReason: 'Sensitive data involved',
      };

      const decision = checkDelegationPermission(delegation, step);
      expect(decision.decision).toBe('REVIEW');
      expect(decision.evidenceRequired).toContain('user_confirmation');
    });
  });

  describe('checkDelegationPermission - Wildcard actions', () => {
    it('should ALLOW action with tool wildcard in allowedActions', () => {
      const step: AgentWorkStep = {
        stepId: 'step_009',
        tool: 'browser',
        action: 'any_browser_action',
        risk: 'LOW',
        requiresConfirmation: false,
      };

      const decision = checkDelegationPermission(delegation, step);
      // browser:* is in allowedActions
      expect(decision.decision).toBe('ALLOW');
    });
  });

  describe('checkDelegationPermission - Expired delegation', () => {
    it('should BLOCK action when delegation is expired', () => {
      const expiredDelegation: DelegationContract = {
        ...delegation,
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
      };

      const step: AgentWorkStep = {
        stepId: 'step_010',
        tool: 'browser',
        action: 'read_page',
        risk: 'LOW',
        requiresConfirmation: false,
      };

      const decision = checkDelegationPermission(expiredDelegation, step);
      expect(decision.decision).toBe('BLOCK');
      expect(decision.reason).toBe('DELEGATION_INVALID_OR_EXPIRED');
    });
  });

  describe('checkDelegationPermission - Null delegation', () => {
    it('should BLOCK action when delegation is null', () => {
      const step: AgentWorkStep = {
        stepId: 'step_011',
        tool: 'browser',
        action: 'read_page',
        risk: 'LOW',
        requiresConfirmation: false,
      };

      const decision = checkDelegationPermission(null, step);
      expect(decision.decision).toBe('BLOCK');
      expect(decision.reason).toBe('NO_DELEGATION');
    });
  });

  describe('checkDelegationPermission - Context awareness', () => {
    it('should include user presence in evidence when context provided', () => {
      const context: PermissionCheckContext = {
        agentId: 'agent_001',
        requestId: 'req_001',
        userPresent: true,
      };

      const step: AgentWorkStep = {
        stepId: 'step_012',
        tool: 'browser',
        action: 'final_submit',
        risk: 'HIGH',
        requiresConfirmation: false,
      };

      const decision = checkDelegationPermission(delegation, step, context);
      expect(decision.evidence?.userPresent).toBe(true);
    });
  });

  describe('Helper functions', () => {
    describe('isActionBlocked', () => {
      it('should return true for blocked actions', () => {
        expect(isActionBlocked(delegation, 'delete_account')).toBe(true);
        expect(isActionBlocked(delegation, 'send_money')).toBe(true);
      });

      it('should return false for allowed actions', () => {
        expect(isActionBlocked(delegation, 'read_page')).toBe(false);
      });

      it('should return true for null delegation', () => {
        expect(isActionBlocked(null, 'any_action')).toBe(true);
      });
    });

    describe('isActionAllowed', () => {
      it('should return true for allowed actions', () => {
        expect(isActionAllowed(delegation, 'read_page')).toBe(true);
        expect(isActionAllowed(delegation, 'fill_form')).toBe(true);
      });

      it('should return false for blocked actions', () => {
        expect(isActionAllowed(delegation, 'delete_account')).toBe(false);
      });

      it('should return false for unknown actions when no wildcard', () => {
        // Create a delegation without wildcard
        const restrictedDelegation: DelegationContract = {
          ...delegation,
          allowedActions: ['read_page', 'fill_form'],
        };
        expect(isActionAllowed(restrictedDelegation, 'unknown_action')).toBe(false);
      });

      it('should return false for null delegation', () => {
        expect(isActionAllowed(null, 'any_action')).toBe(false);
      });

      it('should support wildcard matches', () => {
        const wildDelegation: DelegationContract = {
          ...delegation,
          allowedActions: ['browser:*'],
        };
        expect(isActionAllowed(wildDelegation, 'any_browser_action')).toBe(true);
      });
    });

    describe('requiresConfirmation', () => {
      it('should return true for actions in requiresUserConfirm', () => {
        expect(requiresConfirmation(delegation, 'final_submit')).toBe(true);
        expect(requiresConfirmation(delegation, 'send_external_message')).toBe(true);
      });

      it('should return false for other actions', () => {
        expect(requiresConfirmation(delegation, 'read_page')).toBe(false);
      });

      it('should return true for null delegation', () => {
        expect(requiresConfirmation(null, 'any_action')).toBe(true);
      });
    });
  });

  describe('End-to-end delegation scenarios', () => {
    it('should handle a simple allowed action flow', () => {
      const step: AgentWorkStep = {
        stepId: 'step_e2e_001',
        tool: 'browser',
        action: 'read_page',
        target: 'https://example.com/form',
        risk: 'LOW',
        requiresConfirmation: false,
      };

      const decision = checkDelegationPermission(delegation, step);
      expect(decision.decision).toBe('ALLOW');
      expect(isActionAllowed(delegation, step.action)).toBe(true);
      expect(isActionBlocked(delegation, step.action)).toBe(false);
    });

    it('should handle a blocked action flow', () => {
      const step: AgentWorkStep = {
        stepId: 'step_e2e_002',
        tool: 'browser',
        action: 'delete_account',
        risk: 'CRITICAL',
        requiresConfirmation: true,
      };

      const decision = checkDelegationPermission(delegation, step);
      expect(decision.decision).toBe('BLOCK');
      expect(isActionBlocked(delegation, step.action)).toBe(true);
    });

    it('should handle a confirmation-required flow', () => {
      const step: AgentWorkStep = {
        stepId: 'step_e2e_003',
        tool: 'browser',
        action: 'final_submit',
        risk: 'MEDIUM',
        requiresConfirmation: false,
      };

      const decision = checkDelegationPermission(delegation, step);
      expect(decision.decision).toBe('REVIEW');
      expect(requiresConfirmation(delegation, step.action)).toBe(true);
    });
  });
});
