/**
 * Tool Capability Router Integration Tests
 *
 * Tests that each tool executor correctly routes work steps,
 * applies safety gates, and returns proper evidence.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { routeToToolExecutor, routeBatchToExecutors, stepRequiresConfirmation, describeStep } from '@/lib/tool-capability-router';
import type { AgentWorkStep, DelegationContract } from '@/lib/delegation/types';
import type { ToolExecutionContext } from '@/lib/tool-capability-router';

describe('Tool Capability Router', () => {
  let baseDelegation: DelegationContract;
  let baseContext: ToolExecutionContext;

  beforeEach(() => {
    baseDelegation = {
      delegationId: 'deleg-001',
      orgId: 'org-001',
      userId: 'user-001',
      goal: 'Complete Stripe onboarding',
      scope: 'browser.repo.email.calendar.deploy',
      allowedActions: [],
      blockedActions: [],
      requiresUserConfirm: [],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    baseContext = {
      delegation: baseDelegation,
      orgId: 'org-001',
      sessionId: 'sess-001',
      requestId: 'req-001',
    };
  });

  describe('Browser tool routing', () => {
    it('should block browser step when tool not in scope', async () => {
      const narrowDelegation = { ...baseDelegation, scope: 'email' };

      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'browser',
          action: 'click',
          target: '#submit-button',
          risk: 'LOW',
          requiresConfirmation: false,
        },
        { ...baseContext, delegation: narrowDelegation }
      );

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('not in delegation scope');
    });

    it('should route browser click to Safe DOM executor', async () => {
      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'browser',
          action: 'click',
          target: 'element-123',
          risk: 'LOW',
          requiresConfirmation: false,
        },
        baseContext
      );

      // Should execute (may return ok or pending depending on manifest)
      expect(result).toBeDefined();
      expect(result.evidence).toBeDefined();
      expect(Array.isArray(result.evidence)).toBe(true);
    });

    it('should block browser step if action blocked by delegation', async () => {
      const restrictedDelegation = {
        ...baseDelegation,
        blockedActions: ['browser.type'],
      };

      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'browser',
          action: 'type',
          target: '#email-input',
          risk: 'LOW',
          requiresConfirmation: false,
        },
        { ...baseContext, delegation: restrictedDelegation }
      );

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('blocked');
    });
  });

  describe('Repo/GitHub routing', () => {
    it('should block repo action when not in scope', async () => {
      const narrowDelegation = { ...baseDelegation, scope: 'browser' };

      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'repo',
          action: 'commit',
          target: 'main',
          risk: 'HIGH',
          requiresConfirmation: false,
        },
        { ...baseContext, delegation: narrowDelegation }
      );

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('not in delegation scope');
    });

    it('should require confirmation for main branch commit', async () => {
      const confirmDelegation = {
        ...baseDelegation,
        requiresUserConfirm: ['repo.commit'],
      };

      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'repo',
          action: 'commit',
          target: 'main',
          risk: 'HIGH',
          requiresConfirmation: false,
        },
        { ...baseContext, delegation: confirmDelegation }
      );

      expect(result.actionRequired).toBe('CONFIRM_COMMIT');
      expect(result.evidence).toContain('target:main');
    });

    it('should auto-approve staging branch commit', async () => {
      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'repo',
          action: 'commit',
          target: 'staging',
          risk: 'MEDIUM',
          requiresConfirmation: false,
        },
        baseContext
      );

      expect(result.ok).toBe(true);
      expect(result.reason).toContain('Staging commit');
    });

    it('should require confirmation for PR merge to main', async () => {
      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'repo',
          action: 'merge',
          target: 'main',
          risk: 'CRITICAL',
          requiresConfirmation: false,
        },
        baseContext
      );

      expect(result.actionRequired).toBe('CONFIRM_MERGE');
      expect(result.reason).toContain('production branch');
    });

    it('should create PR with pending status', async () => {
      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'repo',
          action: 'pull_request',
          target: 'main',
          risk: 'MEDIUM',
          requiresConfirmation: false,
        },
        baseContext
      );

      expect(result.actionRequired).toBe('REVIEW_PR');
      expect(result.evidence.some((e) => e.startsWith('pr-'))).toBe(true);
    });
  });

  describe('Email routing', () => {
    it('should block email when not in scope', async () => {
      const narrowDelegation = { ...baseDelegation, scope: 'browser' };

      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'email',
          action: 'send',
          target: 'user@example.com',
          risk: 'HIGH',
          requiresConfirmation: false,
        },
        { ...baseContext, delegation: narrowDelegation }
      );

      expect(result.ok).toBe(false);
    });

    it('should require draft review before sending email', async () => {
      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'email',
          action: 'send',
          target: 'recipient@example.com|Welcome to DSG',
          risk: 'MEDIUM',
          requiresConfirmation: false,
        },
        baseContext
      );

      expect(result.actionRequired).toBe('REVIEW_DRAFT');
      expect(result.reason).toContain('draft');
      expect(result.evidence.some((e) => e.startsWith('draft-'))).toBe(true);
    });

    it('should block email without recipient', async () => {
      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'email',
          action: 'send',
          target: undefined,
          risk: 'MEDIUM',
          requiresConfirmation: false,
        },
        baseContext
      );

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('requires recipient');
    });

    it('should block email if action blocked by delegation', async () => {
      const restrictedDelegation = {
        ...baseDelegation,
        blockedActions: ['email.send'],
      };

      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'email',
          action: 'send',
          target: 'user@example.com',
          risk: 'MEDIUM',
          requiresConfirmation: false,
        },
        { ...baseContext, delegation: restrictedDelegation }
      );

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('blocked');
    });
  });

  describe('Calendar routing', () => {
    it('should block calendar when not in scope', async () => {
      const narrowDelegation = { ...baseDelegation, scope: 'email' };

      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'calendar',
          action: 'create',
          target: 'Team Meeting',
          risk: 'LOW',
          requiresConfirmation: false,
        },
        { ...baseContext, delegation: narrowDelegation }
      );

      expect(result.ok).toBe(false);
    });

    it('should auto-approve calendar event creation', async () => {
      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'calendar',
          action: 'create',
          target: 'Q3 Planning Session',
          risk: 'LOW',
          requiresConfirmation: false,
        },
        baseContext
      );

      expect(result.ok).toBe(true);
      expect(result.reason).toContain('Calendar event created');
    });

    it('should require confirmation for calendar event deletion', async () => {
      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'calendar',
          action: 'delete',
          target: 'old-event-id',
          risk: 'MEDIUM',
          requiresConfirmation: false,
        },
        baseContext
      );

      expect(result.actionRequired).toBe('CONFIRM_DELETE');
      expect(result.reason).toContain('deletion requires');
    });
  });

  describe('Deployment routing', () => {
    it('should block deploy when not in scope', async () => {
      const narrowDelegation = { ...baseDelegation, scope: 'email' };

      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'deploy',
          action: 'deploy',
          target: 'preview',
          risk: 'MEDIUM',
          requiresConfirmation: false,
        },
        { ...baseContext, delegation: narrowDelegation }
      );

      expect(result.ok).toBe(false);
    });

    it('should auto-approve preview deployment', async () => {
      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'deploy',
          action: 'deploy',
          target: 'preview',
          risk: 'MEDIUM',
          requiresConfirmation: false,
        },
        baseContext
      );

      expect(result.ok).toBe(true);
      expect(result.reason).toContain('Preview deployment');
    });

    it('should require confirmation for production deployment', async () => {
      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'deploy',
          action: 'deploy',
          target: 'production',
          risk: 'CRITICAL',
          requiresConfirmation: false,
        },
        baseContext
      );

      expect(result.actionRequired).toBe('CONFIRM_PRODUCTION_DEPLOY');
      expect(result.reason).toContain('Production deployment');
      expect(result.reason).toContain('explicit user confirmation');
    });

    it('should require confirmation for staging deploy if specified', async () => {
      const confirmDelegation = {
        ...baseDelegation,
        requiresUserConfirm: ['deploy.staging'],
      };

      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'deploy',
          action: 'deploy',
          target: 'staging',
          risk: 'MEDIUM',
          requiresConfirmation: false,
        },
        { ...baseContext, delegation: confirmDelegation }
      );

      expect(result.actionRequired).toBe('CONFIRM_PREVIEW_DEPLOY');
    });

    it('should block deploy without environment', async () => {
      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'deploy',
          action: 'deploy',
          target: undefined,
          risk: 'MEDIUM',
          requiresConfirmation: false,
        },
        baseContext
      );

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('target environment');
    });
  });

  describe('Batch routing', () => {
    it('should route multiple steps in order', async () => {
      const steps: AgentWorkStep[] = [
        {
          stepId: 'step-001',
          tool: 'email',
          action: 'send',
          target: 'user@example.com',
          risk: 'MEDIUM',
          requiresConfirmation: false,
        },
        {
          stepId: 'step-002',
          tool: 'deploy',
          action: 'deploy',
          target: 'preview',
          risk: 'MEDIUM',
          requiresConfirmation: false,
        },
      ];

      const results = await routeBatchToExecutors(steps, baseContext);

      expect(results).toHaveLength(2);
      expect(results[0].actionRequired).toBe('REVIEW_DRAFT');
      expect(results[1].ok).toBe(true);
    });
  });

  describe('Step analysis utilities', () => {
    it('should identify steps requiring confirmation', () => {
      const delayConfirm = { ...baseDelegation, requiresUserConfirm: ['deploy.production'] };

      expect(
        stepRequiresConfirmation(
          {
            stepId: 'step-001',
            tool: 'deploy',
            action: 'production',
            risk: 'CRITICAL',
            requiresConfirmation: false,
          },
          delayConfirm
        )
      ).toBe(true);
    });

    it('should mark production actions as requiring confirmation', () => {
      expect(
        stepRequiresConfirmation(
          {
            stepId: 'step-001',
            tool: 'deploy',
            action: 'deploy',
            target: 'production',
            risk: 'CRITICAL',
            requiresConfirmation: false,
          },
          baseDelegation
        )
      ).toBe(true);
    });

    it('should describe steps in human-readable form', () => {
      expect(
        describeStep({
          stepId: 'step-001',
          tool: 'browser',
          action: 'click',
          target: '#submit-btn',
          risk: 'LOW',
          requiresConfirmation: false,
        })
      ).toContain('Browser: Click on #submit-btn');

      expect(
        describeStep({
          stepId: 'step-002',
          tool: 'deploy',
          action: 'deploy',
          target: 'production',
          risk: 'CRITICAL',
          requiresConfirmation: false,
        })
      ).toContain('Deploy: Deploy on production');
    });
  });

  describe('Error handling', () => {
    it('should reject step without tool', async () => {
      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: '',
          action: 'test',
          risk: 'LOW',
          requiresConfirmation: false,
        },
        baseContext
      );

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('missing required');
    });

    it('should reject context without delegation', async () => {
      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'browser',
          action: 'click',
          risk: 'LOW',
          requiresConfirmation: false,
        },
        { ...baseContext, delegation: null as any }
      );

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('missing delegation');
    });

    it('should reject unknown tool', async () => {
      const result = await routeToToolExecutor(
        {
          stepId: 'step-001',
          tool: 'unknown_tool',
          action: 'test',
          risk: 'LOW',
          requiresConfirmation: false,
        },
        baseContext
      );

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Unknown tool');
    });
  });
});
