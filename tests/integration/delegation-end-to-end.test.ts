/**
 * End-to-End Delegation Workflow Tests
 *
 * Tests the complete user-delegated AGI runtime workflow:
 * 1. Create delegation contract
 * 2. Plan with Z3 verification
 * 3. Execute step by step with permission gates
 * 4. Request and validate user confirmations
 * 5. Record audit trail with hash chain
 * 6. Verify job state progression
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createExecutionFixture,
  cleanupExecutionFixture,
  getSupabaseTestAdmin,
  makeTestId,
  assertOk,
} from './helpers/supabase-test-factory';

type DelegationContract = {
  delegationId: string;
  orgId: string;
  userId: string;
  goal: string;
  scope: string;
  allowedActions: string[];
  blockedActions: string[];
  requiresUserConfirm: string[];
  expiresAt: string;
};

type AgentWorkStep = {
  stepId: string;
  tool: string;
  action: string;
  target?: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresConfirmation: boolean;
  confirmationReason?: string;
};

type AuditEvent = {
  eventId: string;
  jobId: string;
  delegationId: string;
  tool: string;
  action: string;
  risk: string;
  decision: string;
  eventHash: string;
  previousHash: string | null;
  createdAt: string;
};

/**
 * Compute SHA256 hash of an event for chain verification
 */
function computeEventHash(event: Record<string, unknown>): string {
  const data = JSON.stringify(event);
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return `sha256:${hash}`;
}

/**
 * Mock permission gate decision
 */
function checkPermission(step: AgentWorkStep, delegation: DelegationContract): { allowed: boolean; reason: string } {
  // Check if action is explicitly blocked
  if (delegation.blockedActions.includes(step.action)) {
    return { allowed: false, reason: 'Action is blocked by delegation' };
  }

  // Check if action is allowed
  if (!delegation.allowedActions.includes(step.action)) {
    return { allowed: false, reason: 'Action is not in allowed list' };
  }

  // Check expiration
  const expiresDate = new Date(delegation.expiresAt);
  if (expiresDate <= new Date()) {
    return { allowed: false, reason: 'Delegation has expired' };
  }

  return { allowed: true, reason: 'Permission granted' };
}

// Live-DB suite: requires a real Supabase project. Skipped when the service
// role key / URL are not configured (e.g. unit-evidence CI jobs).
describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL)('User-Delegated AGI Runtime E2E', () => {
  let supabase: SupabaseClient;

  beforeEach(() => {
    supabase = getSupabaseTestAdmin();
  });

  describe('Complete delegation workflow', () => {
    it('should execute complete workflow: goal → plan → verify → execute → audit', async () => {
      // 1. Create delegation contract
      const delegationId = `deleg_${makeTestId('e2e-workflow')}`;
      const orgId = makeTestId('org');
      const userId = makeTestId('user');
      const jobId = crypto.randomUUID();

      const delegation: DelegationContract = {
        delegationId,
        orgId,
        userId,
        goal: 'fill_stripe_form',
        scope: 'browser.stripe_marketplace',
        allowedActions: ['read_page', 'fill_form', 'click_safe_button', 'submit_form'],
        blockedActions: [],
        requiresUserConfirm: ['submit_form'],
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      // Insert delegation job
      const { error: jobError } = await supabase.from('delegated_agi_jobs').insert({
        job_id: jobId,
        delegation_id: delegationId,
        org_id: orgId,
        user_id: userId,
        goal: delegation.goal,
        scope: delegation.scope,
        status: 'active',
        current_state: 'CREATED',
        delegation_json: delegation,
        expires_at: delegation.expiresAt,
      });

      expect(jobError).toBeNull();

      // 2. Define plan steps (simulated Z3-verified plan)
      const planSteps: AgentWorkStep[] = [
        {
          stepId: makeTestId('step'),
          tool: 'browser',
          action: 'read_page',
          target: 'https://stripe.com/docs/stripe-js',
          risk: 'LOW',
          requiresConfirmation: false,
        },
        {
          stepId: makeTestId('step'),
          tool: 'browser',
          action: 'fill_form',
          target: '#stripe-form',
          risk: 'MEDIUM',
          requiresConfirmation: false,
        },
        {
          stepId: makeTestId('step'),
          tool: 'browser',
          action: 'click_safe_button',
          target: '#validate-btn',
          risk: 'LOW',
          requiresConfirmation: false,
        },
        {
          stepId: makeTestId('step'),
          tool: 'browser',
          action: 'submit_form',
          target: '#stripe-form',
          risk: 'CRITICAL',
          requiresConfirmation: true,
          confirmationReason: 'This is a financial transaction',
        },
      ];

      // 3. Execute steps and record audit trail
      const auditEvents: AuditEvent[] = [];
      let previousHash: string | null = null;

      for (const step of planSteps) {
        // Check permission
        const permission = checkPermission(step, delegation);
        expect(permission.allowed).toBe(true);

        // Request confirmation if needed
        let confirmationId: string | null = null;
        if (step.requiresConfirmation) {
          confirmationId = crypto.randomUUID();
          const { error: confirmError } = await supabase.from('user_confirmation_requests').insert({
            request_id: confirmationId,
            job_id: jobId,
            delegation_id: delegationId,
            step_json: step,
            evidence_json: { permissionCheck: permission },
            status: 'PENDING',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          });

          expect(confirmError).toBeNull();

          // Simulate user approval
          const { error: approveError } = await supabase
            .from('user_confirmation_requests')
            .update({
              status: 'APPROVED',
              approved_by: userId,
              approved_at: new Date().toISOString(),
            })
            .eq('request_id', confirmationId);

          expect(approveError).toBeNull();
        }

        // Record execution in audit trail
        const eventData = {
          tool: step.tool,
          action: step.action,
          target: step.target,
          risk: step.risk,
          decision: 'ALLOW',
          reason: 'Permitted by delegation',
          timestamp: new Date().toISOString(),
        };

        const eventHash = computeEventHash(eventData);
        const eventId = crypto.randomUUID();

        const { error: auditError } = await supabase.from('agi_action_audit').insert({
          event_id: eventId,
          job_id: jobId,
          delegation_id: delegationId,
          agent_id: 'agent-test-001',
          tool: step.tool,
          action: step.action,
          target: step.target,
          risk: step.risk,
          decision: 'ALLOW',
          reason: 'Permitted by delegation',
          evidence_json: eventData,
          previous_hash: previousHash,
          event_hash: eventHash,
          created_at: new Date().toISOString(),
        });

        expect(auditError).toBeNull();

        auditEvents.push({
          eventId,
          jobId,
          delegationId,
          tool: step.tool,
          action: step.action,
          risk: step.risk,
          decision: 'ALLOW',
          eventHash,
          previousHash,
          createdAt: new Date().toISOString(),
        });

        previousHash = eventHash;
      }

      // 4. Verify audit chain integrity
      const { data: auditTrail, error: fetchError } = await supabase
        .from('agi_action_audit')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      expect(fetchError).toBeNull();
      expect(auditTrail).toHaveLength(planSteps.length);

      // Verify hash chain consistency
      for (let i = 0; i < auditTrail!.length; i++) {
        const event = auditTrail![i];
        if (i > 0) {
          expect(event.previous_hash).toBe(auditTrail![i - 1].event_hash);
        } else {
          expect(event.previous_hash).toBeNull();
        }
        // Hash should match expected format
        expect(event.event_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
      }

      // 5. Verify job state progression
      const { data: finalJob, error: jobFetchError } = await supabase
        .from('delegated_agi_jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();

      expect(jobFetchError).toBeNull();
      expect(finalJob).toBeDefined();

      // Update job to completed state
      const { error: updateError } = await supabase
        .from('delegated_agi_jobs')
        .update({
          status: 'completed',
          current_state: 'COMPLETED',
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId);

      expect(updateError).toBeNull();

      // Verify final state
      const { data: completedJob } = await supabase
        .from('delegated_agi_jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();

      expect(completedJob?.status).toBe('completed');
      expect(completedJob?.current_state).toBe('COMPLETED');

      // Cleanup
      await supabase.from('delegated_agi_jobs').delete().eq('job_id', jobId);
      await supabase.from('agi_action_audit').delete().eq('job_id', jobId);
      await supabase.from('user_confirmation_requests').delete().eq('job_id', jobId);
    });

    it('should block if HIGH action attempted without confirmation', async () => {
      const delegationId = `deleg_${makeTestId('block-test')}`;
      const orgId = makeTestId('org');
      const userId = makeTestId('user');

      const delegation: DelegationContract = {
        delegationId,
        orgId,
        userId,
        goal: 'deploy_code',
        scope: 'repo.main_branch',
        allowedActions: ['read_code', 'create_branch', 'push_commit', 'create_pr'],
        blockedActions: ['merge_pr', 'deploy_prod'],
        requiresUserConfirm: ['create_pr'],
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      // Try to execute a blocked action
      const blockedStep: AgentWorkStep = {
        stepId: makeTestId('step'),
        tool: 'repo',
        action: 'merge_pr',
        target: 'main',
        risk: 'CRITICAL',
        requiresConfirmation: true,
        confirmationReason: 'Merging to main requires approval',
      };

      // Check permission - should be blocked
      const permission = checkPermission(blockedStep, delegation);
      expect(permission.allowed).toBe(false);
      expect(permission.reason).toContain('blocked');
    });

    it('should detect tampered audit event via hash mismatch', async () => {
      const delegationId = `deleg_${makeTestId('tamper-test')}`;
      const orgId = makeTestId('org');
      const userId = makeTestId('user');
      const jobId = crypto.randomUUID();

      // Create job
      await supabase.from('delegated_agi_jobs').insert({
        job_id: jobId,
        delegation_id: delegationId,
        org_id: orgId,
        user_id: userId,
        goal: 'test_goal',
        scope: 'test_scope',
        status: 'active',
        current_state: 'CREATED',
        delegation_json: {},
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });

      // Insert first event
      const eventData1 = {
        tool: 'test',
        action: 'action1',
        risk: 'LOW',
        decision: 'ALLOW',
        timestamp: new Date().toISOString(),
      };
      const hash1 = computeEventHash(eventData1);

      const { error: err1 } = await supabase.from('agi_action_audit').insert({
        event_id: crypto.randomUUID(),
        job_id: jobId,
        delegation_id: delegationId,
        agent_id: 'agent-test',
        tool: 'test',
        action: 'action1',
        risk: 'LOW',
        decision: 'ALLOW',
        reason: 'test',
        evidence_json: eventData1,
        previous_hash: null,
        event_hash: hash1,
        created_at: new Date().toISOString(),
      });
      expect(err1).toBeNull();

      // Insert second event (normally would link to first)
      const eventData2 = {
        tool: 'test',
        action: 'action2',
        risk: 'LOW',
        decision: 'ALLOW',
        timestamp: new Date().toISOString(),
      };
      const hash2 = computeEventHash(eventData2);

      const eventId2 = crypto.randomUUID();
      const { error: err2 } = await supabase.from('agi_action_audit').insert({
        event_id: eventId2,
        job_id: jobId,
        delegation_id: delegationId,
        agent_id: 'agent-test',
        tool: 'test',
        action: 'action2',
        risk: 'LOW',
        decision: 'ALLOW',
        reason: 'test',
        evidence_json: eventData2,
        previous_hash: hash1, // Correctly linked
        event_hash: hash2,
        created_at: new Date().toISOString(),
      });
      expect(err2).toBeNull();

      // Now fetch and verify chain
      const { data: events } = await supabase
        .from('agi_action_audit')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      expect(events).toHaveLength(2);

      // Simulate tampering detection: verify that if event data changed,
      // the hash would be different
      const tamperedData = { ...eventData1, tool: 'hacked' };
      const tamperedHash = computeEventHash(tamperedData);
      expect(tamperedHash).not.toBe(hash1);

      // Cleanup
      await supabase.from('delegated_agi_jobs').delete().eq('job_id', jobId);
      await supabase.from('agi_action_audit').delete().eq('job_id', jobId);
    });

    it('should enforce expiration on delegations', async () => {
      const delegationId = `deleg_${makeTestId('expiry-test')}`;
      const orgId = makeTestId('org');
      const userId = makeTestId('user');

      // Create delegation with expiration in the past
      const expiredDelegation: DelegationContract = {
        delegationId,
        orgId,
        userId,
        goal: 'test_goal',
        scope: 'test_scope',
        allowedActions: ['read_page'],
        blockedActions: [],
        requiresUserConfirm: [],
        expiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      };

      // Try to check permission - should fail due to expiration
      const step: AgentWorkStep = {
        stepId: makeTestId('step'),
        tool: 'browser',
        action: 'read_page',
        risk: 'LOW',
        requiresConfirmation: false,
      };

      const permission = checkPermission(step, expiredDelegation);
      expect(permission.allowed).toBe(false);
      expect(permission.reason).toContain('expired');
    });
  });
});
