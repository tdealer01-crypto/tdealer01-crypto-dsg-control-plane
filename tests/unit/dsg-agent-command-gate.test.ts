import { describe, it, expect } from 'vitest';
import {
  evaluateAgentCommandGate,
  buildAgentActionResultReceipt,
  type AgentCommandGateRequest,
  type AgentActionResultRequest,
} from '@/lib/dsg/agent-command-gate';
import { evaluateAction } from '@/lib/dsg/evaluate-action';

function makeRequest(overrides: Partial<AgentCommandGateRequest> = {}): AgentCommandGateRequest {
  return {
    workspaceId: 'ws-test-01',
    runtime: {
      agentId: 'agent-001',
      agentType: 'ai-agent',
      sessionId: 'session-abc',
      agentWillExecuteAction: true,
      requiresResultCallback: true,
    },
    command: {
      commandId: 'cmd-001',
      actionType: 'read',
      targetSystemId: 'supabase-prod',
      operationName: 'fetch_user_record',
      riskLevel: 'low',
      dataClasses: [],
      idempotencyKey: 'idem-001',
    },
    rbac: {
      actorId: 'user-001',
      role: 'operator',
      permissions: ['tool:execute_low'],
    },
    audit: {
      preAuditEventId: 'audit-001',
      ledgerId: 'ledger-001',
      chainHeadHash: 'abc123',
    },
    evidence: {
      evidenceManifestId: 'manifest-001',
      policySnapshotHash: 'snap-001',
    },
    ...overrides,
  };
}

describe('evaluateAgentCommandGate', () => {
  it('PASS for a fully valid low-risk read command', () => {
    const result = evaluateAgentCommandGate(makeRequest());
    expect(result.decision).toBe('PASS');
    expect(result.canAgentExecute).toBe(true);
    expect(result.status).toBe('AGENT_ACTION_ALLOWED');
    expect(result.actionEnvelope).toBeDefined();
    expect(result.actionEnvelope?.allowedAction).toBe('read');
    expect(result.actionEnvelope?.mustReturnResultTo).toBe('/api/dsg/agent-command-gate/result');
  });

  it('BLOCK when workspaceId is missing', () => {
    const result = evaluateAgentCommandGate(makeRequest({ workspaceId: '' }));
    expect(result.decision).toBe('BLOCK');
    expect(result.canAgentExecute).toBe(false);
    const lockCheck = result.invariantChecks.find((c) => c.name === 'command_locked');
    expect(lockCheck?.status).toBe('BLOCK');
  });

  it('BLOCK when actor lacks required permission for medium risk', () => {
    const result = evaluateAgentCommandGate(
      makeRequest({
        command: {
          commandId: 'cmd-002',
          actionType: 'write',
          targetSystemId: 'db-001',
          operationName: 'insert_record',
          riskLevel: 'medium',
          dataClasses: [],
          idempotencyKey: 'idem-002',
          rollbackPlanId: 'rollback-002',
        },
        rbac: {
          actorId: 'user-001',
          role: 'operator',
          permissions: ['tool:execute_low'],
        },
      }),
    );
    expect(result.decision).toBe('BLOCK');
    const permCheck = result.invariantChecks.find((c) => c.name === 'rbac_permission_bound');
    expect(permCheck?.status).toBe('BLOCK');
  });

  it('BLOCK when high-risk action lacks approval', () => {
    const result = evaluateAgentCommandGate(
      makeRequest({
        command: {
          commandId: 'cmd-003',
          actionType: 'deploy',
          targetSystemId: 'k8s-prod',
          operationName: 'deploy_release',
          riskLevel: 'high',
          dataClasses: [],
          idempotencyKey: 'idem-003',
          rollbackPlanId: 'rollback-003',
        },
        rbac: {
          actorId: 'user-001',
          role: 'operator',
          permissions: ['tool:execute_high', 'tool:execute_medium', 'tool:execute_low'],
        },
      }),
    );
    expect(result.decision).toBe('BLOCK');
    const approvalCheck = result.invariantChecks.find((c) => c.name === 'approval_for_high_risk_or_sensitive_action');
    expect(approvalCheck?.status).toBe('BLOCK');
  });

  it('PASS for high-risk deploy with approval proof', () => {
    const result = evaluateAgentCommandGate(
      makeRequest({
        command: {
          commandId: 'cmd-004',
          actionType: 'deploy',
          targetSystemId: 'k8s-prod',
          operationName: 'deploy_release',
          riskLevel: 'high',
          dataClasses: [],
          idempotencyKey: 'idem-004',
          rollbackPlanId: 'rollback-004',
        },
        rbac: {
          actorId: 'user-001',
          role: 'approver',
          permissions: ['tool:execute_high', 'tool:execute_medium', 'tool:execute_low'],
          approvalRequestId: 'apr-001',
          approvalDecision: 'approved',
          approvedBy: 'owner-001',
        },
      }),
    );
    expect(result.decision).toBe('PASS');
    expect(result.canAgentExecute).toBe(true);
  });

  it('produces deterministic commandHash for same input', () => {
    const req = makeRequest();
    const r1 = evaluateAgentCommandGate(req, new Date('2024-01-01T00:00:00Z'));
    const r2 = evaluateAgentCommandGate(req, new Date('2024-01-01T00:00:00Z'));
    expect(r1.commandHash).toBe(r2.commandHash);
    expect(r1.decisionHash).toBe(r2.decisionHash);
  });
});

describe('buildAgentActionResultReceipt', () => {
  it('accepted=true when all required fields present', () => {
    const input: AgentActionResultRequest = {
      workspaceId: 'ws-test-01',
      agentId: 'agent-001',
      sessionId: 'session-abc',
      commandId: 'cmd-001',
      envelopeId: 'env-001',
      decisionHash: 'hash-001',
      status: 'SUCCESS',
      startedAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-01T00:01:00Z',
      observedResultHash: 'result-hash-001',
      evidenceItemIds: ['ev-001'],
    };
    const receipt = buildAgentActionResultReceipt(input);
    expect(receipt.accepted).toBe(true);
    expect(receipt.status).toBe('SUCCESS');
    expect(receipt.receiptHash).toBeTruthy();
  });

  it('accepted=false when evidenceItemIds is empty', () => {
    const input: AgentActionResultRequest = {
      workspaceId: 'ws-test-01',
      agentId: 'agent-001',
      sessionId: 'session-abc',
      commandId: 'cmd-001',
      envelopeId: 'env-001',
      decisionHash: 'hash-001',
      status: 'SUCCESS',
      startedAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-01T00:01:00Z',
      observedResultHash: 'result-hash-001',
      evidenceItemIds: [],
    };
    const receipt = buildAgentActionResultReceipt(input);
    expect(receipt.accepted).toBe(false);
    expect(receipt.reasons.some((r) => r.includes('evidenceItemIds'))).toBe(true);
  });
});

describe('evaluateAction (simplified API)', () => {
  it('PASS for a low-risk read with minimal required fields', () => {
    const result = evaluateAction({
      workspaceId: 'ws-001',
      agentId: 'agent-001',
      sessionId: 'sess-001',
      action: 'fetch_user',
      actionType: 'read',
      targetSystemId: 'supabase',
      riskLevel: 'low',
      actorId: 'user-001',
    });
    expect(result.ok).toBe(true);
    expect(result.decision).toBe('PASS');
    expect(result.canExecute).toBe(true);
  });

  it('BLOCK for high-risk without approval', () => {
    const result = evaluateAction({
      workspaceId: 'ws-001',
      agentId: 'agent-001',
      sessionId: 'sess-001',
      action: 'deploy_service',
      actionType: 'deploy',
      targetSystemId: 'k8s-prod',
      riskLevel: 'high',
      actorId: 'user-001',
      idempotencyKey: 'idem-001',
      rollbackPlanId: 'rollback-001',
    });
    expect(result.ok).toBe(false);
    expect(result.decision).toBe('BLOCK');
  });
});
