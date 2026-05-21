import { describe, it, expect, vi } from 'vitest';
import { evaluateAgentCommandGate, type AgentCommandGateRequest } from '../../lib/dsg/agent-command-gate';
import { recordGovernanceDecisionEvent, listGovernanceDecisionEvents } from '../../lib/governance/decision-recorder';


const governanceDecisionRows: Array<Record<string, any>> = [];

vi.mock('../../lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== 'dsg_governance_decision_events') {
        throw new Error(`unexpected_table:${table}`);
      }

      return {
        insert: async (row: Record<string, any>) => {
          governanceDecisionRows.push({
            ...row,
            created_at: row.created_at ?? new Date(0).toISOString(),
          });
          return { error: null };
        },
        select: () => ({
          eq: (_column: string, orgId: string) => ({
            order: () => ({
              limit: (limit: number) => ({
                data: governanceDecisionRows
                  .filter((row) => row.org_id === orgId)
                  .slice(-limit)
                  .reverse(),
                error: null,
              }),
            }),
          }),
        }),
      };
    },
  }),
}));


describe('Governance Runtime Hardening', () => {
  const testOrgId = 'org-test-governance';
  const testUserId = 'user-reviewer-001';

  describe('Agent Command Gate Evaluation', () => {
    it('should evaluate PASS for fully compliant command', () => {
      const input: AgentCommandGateRequest = {
        workspaceId: testOrgId,
        customerName: 'test-customer',
        runtime: {
          agentId: 'agent-001',
          agentName: 'test-agent',
          agentType: 'ai-agent',
          sessionId: 'sess-001',
          agentWillExecuteAction: true,
          requiresResultCallback: true,
          resultCallbackUrl: 'https://example.com/callback',
        },
        command: {
          commandId: 'cmd-001',
          actionType: 'read',
          targetSystemId: 'sys-001',
          operationName: 'list_records',
          riskLevel: 'low',
          dataClasses: ['public'],
        },
        rbac: {
          actorId: 'user-001',
          role: 'operator',
          permissions: ['tool:execute_low'],
        },
        audit: {
          preAuditEventId: 'evt-001',
          ledgerId: 'ledger-001',
          chainHeadHash: 'hash-001',
        },
        evidence: {
          evidenceManifestId: 'manifest-001',
          policySnapshotHash: 'policy-hash-001',
        },
      };

      const result = evaluateAgentCommandGate(input);
      expect(result.decision).toBe('PASS');
      expect(result.canAgentExecute).toBe(true);
      expect(result.status).toBe('AGENT_ACTION_ALLOWED');
      expect(result.invariantChecks.every((c) => c.status === 'PASS')).toBe(true);
    });

    it('should evaluate BLOCK for high-risk action without approval', () => {
      const input: AgentCommandGateRequest = {
        workspaceId: testOrgId,
        customerName: 'test-customer',
        runtime: {
          agentId: 'agent-001',
          agentType: 'ai-agent',
          sessionId: 'sess-001',
          agentWillExecuteAction: true,
          requiresResultCallback: true,
        },
        command: {
          commandId: 'cmd-002',
          actionType: 'payment',
          targetSystemId: 'sys-001',
          operationName: 'process_payment',
          riskLevel: 'high',
          dataClasses: ['payment'],
          idempotencyKey: 'idem-001',
          rollbackPlanId: 'plan-001',
        },
        rbac: {
          actorId: 'agent-001',
          role: 'operator',
          permissions: ['tool:execute_high'],
        },
        audit: {
          preAuditEventId: 'evt-002',
          ledgerId: 'ledger-001',
          chainHeadHash: 'hash-002',
        },
        evidence: {
          evidenceManifestId: 'manifest-002',
          policySnapshotHash: 'policy-hash-002',
        },
      };

      const result = evaluateAgentCommandGate(input);
      expect(result.decision).toBe('BLOCK');
      expect(result.canAgentExecute).toBe(false);
      expect(result.status).toBe('AGENT_ACTION_BLOCKED');
      expect(result.invariantChecks.some((c) => c.name === 'approval_for_high_risk_or_sensitive_action')).toBe(true);
    });

    it('should evaluate BLOCK when mutation lacks idempotencyKey', () => {
      const input: AgentCommandGateRequest = {
        workspaceId: testOrgId,
        customerName: 'test-customer',
        runtime: {
          agentId: 'agent-001',
          agentType: 'ai-agent',
          sessionId: 'sess-001',
          agentWillExecuteAction: true,
          requiresResultCallback: true,
        },
        command: {
          commandId: 'cmd-003',
          actionType: 'write',
          targetSystemId: 'sys-001',
          operationName: 'update_record',
          riskLevel: 'medium',
          dataClasses: ['internal'],
        },
        rbac: {
          actorId: 'agent-001',
          role: 'operator',
          permissions: ['tool:execute_medium'],
        },
        audit: {
          preAuditEventId: 'evt-003',
          ledgerId: 'ledger-001',
          chainHeadHash: 'hash-003',
        },
        evidence: {
          evidenceManifestId: 'manifest-003',
          policySnapshotHash: 'policy-hash-003',
        },
      };

      const result = evaluateAgentCommandGate(input);
      expect(result.decision).toBe('BLOCK');
      expect(result.canAgentExecute).toBe(false);
      expect(result.status).toBe('AGENT_ACTION_BLOCKED');
      expect(result.invariantChecks.some((c) => c.name === 'idempotency_for_mutation')).toBe(true);
    });

    it('should evaluate BLOCK when mutation lacks rollbackPlanId', () => {
      const input: AgentCommandGateRequest = {
        workspaceId: testOrgId,
        customerName: 'test-customer',
        runtime: {
          agentId: 'agent-001',
          agentType: 'ai-agent',
          sessionId: 'sess-001',
          agentWillExecuteAction: true,
          requiresResultCallback: true,
        },
        command: {
          commandId: 'cmd-004',
          actionType: 'delete',
          targetSystemId: 'sys-001',
          operationName: 'delete_record',
          riskLevel: 'high',
          dataClasses: ['internal'],
          idempotencyKey: 'idem-001',
        },
        rbac: {
          actorId: 'agent-001',
          role: 'operator',
          permissions: ['tool:execute_high'],
        },
        audit: {
          preAuditEventId: 'evt-004',
          ledgerId: 'ledger-001',
          chainHeadHash: 'hash-004',
        },
        evidence: {
          evidenceManifestId: 'manifest-004',
          policySnapshotHash: 'policy-hash-004',
        },
      };

      const result = evaluateAgentCommandGate(input);
      expect(result.decision).toBe('BLOCK');
      expect(result.canAgentExecute).toBe(false);
      expect(result.invariantChecks.some((c) => c.name === 'rollback_for_mutation')).toBe(true);
    });

    it('should evaluate BLOCK when RBAC permission is insufficient', () => {
      const input: AgentCommandGateRequest = {
        workspaceId: testOrgId,
        customerName: 'test-customer',
        runtime: {
          agentId: 'agent-001',
          agentType: 'ai-agent',
          sessionId: 'sess-001',
          agentWillExecuteAction: true,
          requiresResultCallback: true,
        },
        command: {
          commandId: 'cmd-005',
          actionType: 'payment',
          targetSystemId: 'sys-001',
          operationName: 'process_payment',
          riskLevel: 'critical',
          dataClasses: ['payment'],
          idempotencyKey: 'idem-001',
          rollbackPlanId: 'plan-001',
        },
        rbac: {
          actorId: 'agent-001',
          role: 'operator',
          permissions: ['tool:execute_low', 'tool:execute_medium'],
        },
        audit: {
          preAuditEventId: 'evt-005',
          ledgerId: 'ledger-001',
          chainHeadHash: 'hash-005',
        },
        evidence: {
          evidenceManifestId: 'manifest-005',
          policySnapshotHash: 'policy-hash-005',
        },
      };

      const result = evaluateAgentCommandGate(input);
      expect(result.decision).toBe('BLOCK');
      expect(result.invariantChecks.some((c) => c.name === 'rbac_permission_bound')).toBe(true);
    });

    it('should evaluate BLOCK when audit binding is missing', () => {
      const input: AgentCommandGateRequest = {
        workspaceId: testOrgId,
        customerName: 'test-customer',
        runtime: {
          agentId: 'agent-001',
          agentType: 'ai-agent',
          sessionId: 'sess-001',
          agentWillExecuteAction: true,
          requiresResultCallback: true,
        },
        command: {
          commandId: 'cmd-006',
          actionType: 'read',
          targetSystemId: 'sys-001',
          operationName: 'list',
          riskLevel: 'low',
          dataClasses: ['public'],
        },
        rbac: {
          actorId: 'agent-001',
          role: 'operator',
          permissions: ['tool:execute_low'],
        },
        audit: {
          preAuditEventId: '',
          ledgerId: 'ledger-001',
          chainHeadHash: 'hash-006',
        },
        evidence: {
          evidenceManifestId: 'manifest-006',
          policySnapshotHash: 'policy-hash-006',
        },
      };

      const result = evaluateAgentCommandGate(input);
      expect(result.decision).toBe('BLOCK');
      expect(result.invariantChecks.some((c) => c.name === 'audit_hook_bound')).toBe(true);
    });

    it('should evaluate BLOCK when evidence binding is missing', () => {
      const input: AgentCommandGateRequest = {
        workspaceId: testOrgId,
        customerName: 'test-customer',
        runtime: {
          agentId: 'agent-001',
          agentType: 'ai-agent',
          sessionId: 'sess-001',
          agentWillExecuteAction: true,
          requiresResultCallback: true,
        },
        command: {
          commandId: 'cmd-007',
          actionType: 'read',
          targetSystemId: 'sys-001',
          operationName: 'list',
          riskLevel: 'low',
          dataClasses: ['public'],
        },
        rbac: {
          actorId: 'agent-001',
          role: 'operator',
          permissions: ['tool:execute_low'],
        },
        audit: {
          preAuditEventId: 'evt-007',
          ledgerId: 'ledger-001',
          chainHeadHash: 'hash-007',
        },
        evidence: {
          evidenceManifestId: '',
          policySnapshotHash: 'policy-hash-007',
        },
      };

      const result = evaluateAgentCommandGate(input);
      expect(result.decision).toBe('BLOCK');
      expect(result.invariantChecks.some((c) => c.name === 'evidence_hook_bound')).toBe(true);
    });
  });

  describe('Governance Decision Event Recording', () => {
    it('should record approve decision with real user identity', async () => {
      const decisionId = `dec-${Date.now()}-approve`;
      const recorded = await recordGovernanceDecisionEvent({
        orgId: testOrgId,
        decisionId,
        gateId: 'gate-001',
        decision: 'REVIEW',
        action: 'approve',
        actorId: testUserId,
        actionAt: new Date().toISOString(),
        reason: 'Approved after manual review',
      });

      expect(recorded).toBe(true);

      const events = await listGovernanceDecisionEvents(testOrgId, 10);
      const found = events.find((e: any) => e.decision_id === decisionId);
      expect(found).toBeDefined();
      expect(found?.actor_id).toBe(testUserId);
      expect(found?.action).toBe('approve');
    });

    it('should record reject decision', async () => {
      const decisionId = `dec-${Date.now()}-reject`;
      const recorded = await recordGovernanceDecisionEvent({
        orgId: testOrgId,
        decisionId,
        gateId: 'gate-002',
        decision: 'BLOCK',
        action: 'reject',
        actorId: testUserId,
        actionAt: new Date().toISOString(),
        reason: 'Rejected: insufficient evidence',
      });

      expect(recorded).toBe(true);

      const events = await listGovernanceDecisionEvents(testOrgId, 10);
      const found = events.find((e: any) => e.decision_id === decisionId);
      expect(found?.action).toBe('reject');
    });

    it('should record pause action with reason', async () => {
      const decisionId = `dec-${Date.now()}-pause`;
      const recorded = await recordGovernanceDecisionEvent({
        orgId: testOrgId,
        decisionId,
        gateId: 'gate-003',
        action: 'pause',
        actorId: testUserId,
        actionAt: new Date().toISOString(),
        reason: 'Paused: awaiting additional context from operator',
      });

      expect(recorded).toBe(true);

      const events = await listGovernanceDecisionEvents(testOrgId, 10);
      const found = events.find((e: any) => e.decision_id === decisionId);
      expect(found?.action).toBe('pause');
    });

    it('should record rollback with evidence summary', async () => {
      const decisionId = `dec-${Date.now()}-rollback`;
      const recorded = await recordGovernanceDecisionEvent({
        orgId: testOrgId,
        decisionId,
        gateId: 'gate-004',
        action: 'rollback',
        actorId: testUserId,
        actionAt: new Date().toISOString(),
        reason: 'Rollback: action failed verification. Compensation: restore_from_backup_20250508_100000. Pre-state: abc123def456...',
      });

      expect(recorded).toBe(true);

      const events = await listGovernanceDecisionEvents(testOrgId, 10);
      const found = events.find((e: any) => e.decision_id === decisionId);
      expect(found?.action).toBe('rollback');
      expect(found?.reason).toContain('restore_from_backup');
    });
  });

  describe('Cross-Org Access Control', () => {
    it('should deny access to decisions from other orgs', async () => {
      const otherOrgId = 'org-other-governance';
      const decisionId = `dec-${Date.now()}-cross-org`;

      await recordGovernanceDecisionEvent({
        orgId: testOrgId,
        decisionId,
        gateId: 'gate-005',
        action: 'approve',
        actorId: testUserId,
        actionAt: new Date().toISOString(),
      });

      const events = await listGovernanceDecisionEvents(otherOrgId, 10);
      const found = events.find((e: any) => e.decision_id === decisionId);
      expect(found).toBeUndefined();
    });
  });

  describe('Evidence Requirements', () => {
    it('should require preStateHash for rollback — reason must reference pre-state', async () => {
      const withPreState = 'Rollback: action failed. Compensation: restore_backup_001. Pre-state: abc123def456...';
      const withoutPreState = 'Rollback: action failed. Compensation: restore_backup_001.';

      expect(withPreState).toMatch(/Pre-state:\s*\w+/);
      expect(withoutPreState).not.toMatch(/Pre-state:\s*\w+/);

      const decisionId = `dec-${Date.now()}-pre-state`;
      const recorded = await recordGovernanceDecisionEvent({
        orgId: testOrgId,
        decisionId,
        gateId: 'gate-pre-state',
        action: 'rollback',
        actorId: testUserId,
        actionAt: new Date().toISOString(),
        reason: withPreState,
      });
      expect(recorded).toBe(true);

      const events = await listGovernanceDecisionEvents(testOrgId, 10);
      const found = events.find((e: any) => e.decision_id === decisionId);
      expect(found?.reason).toMatch(/Pre-state:/);
    });

    it('should require compensationPlanId for rollback — reason must reference compensation', async () => {
      const withCompensation = 'Rollback: failed. Compensation: restore_from_backup_20250508. Pre-state: xyz789...';
      const withoutCompensation = 'Rollback: failed. Pre-state: xyz789...';

      expect(withCompensation).toMatch(/Compensation:\s*[\w_]+/);
      expect(withoutCompensation).not.toMatch(/Compensation:\s*[\w_]+/);

      const decisionId = `dec-${Date.now()}-compensation-plan`;
      const recorded = await recordGovernanceDecisionEvent({
        orgId: testOrgId,
        decisionId,
        gateId: 'gate-compensation',
        action: 'rollback',
        actorId: testUserId,
        actionAt: new Date().toISOString(),
        reason: withCompensation,
      });
      expect(recorded).toBe(true);

      const events = await listGovernanceDecisionEvents(testOrgId, 10);
      const found = events.find((e: any) => e.decision_id === decisionId);
      expect(found?.reason).toContain('Compensation:');
    });

    it('should require compensationActionHash — evidenceManifestId missing blocks gate evaluation', () => {
      const input: AgentCommandGateRequest = {
        workspaceId: testOrgId,
        customerName: 'test-customer',
        runtime: {
          agentId: 'agent-rollback',
          agentType: 'ai-agent',
          sessionId: 'sess-rollback',
          agentWillExecuteAction: true,
          requiresResultCallback: true,
        },
        command: {
          commandId: 'cmd-rollback',
          actionType: 'delete',
          targetSystemId: 'sys-001',
          operationName: 'compensating_delete',
          riskLevel: 'high',
          dataClasses: ['internal'],
          idempotencyKey: 'idem-comp-001',
          rollbackPlanId: 'plan-comp-001',
        },
        rbac: {
          actorId: testUserId,
          role: 'operator',
          permissions: ['tool:execute_high'],
        },
        audit: {
          preAuditEventId: 'evt-comp-001',
          ledgerId: 'ledger-001',
          chainHeadHash: 'hash-comp',
        },
        evidence: {
          evidenceManifestId: '',
          policySnapshotHash: 'policy-hash-comp',
        },
      };

      const result = evaluateAgentCommandGate(input);
      expect(result.decision).toBe('BLOCK');
      const evidenceCheck = result.invariantChecks.find((c) => c.name === 'evidence_hook_bound');
      expect(evidenceCheck).toBeDefined();
      expect(evidenceCheck?.status).toBe('FAIL');
    });
  });
});
