import { describe, expect, it, vi } from 'vitest';
import { runCanonicalActionE2E } from '@/lib/dsg-one/canonical-action-e2e';
import type { Task, AgentCapacity } from '@/lib/dsg/multi-agent/types';

const tasks: Task[] = [
  {
    id: 'deploy-task',
    name: 'Deploy verified release',
    domain: 'deployment',
    operation: 'deploy',
    target: 'render',
    dataSensitivity: 'medium',
    externalEffect: true,
    reversibility: 'reversible',
    userAuthorized: true,
    planAllowed: true,
    hasFreshEvidence: true,
    hasRollback: true,
  } as Task,
];

const agents: AgentCapacity[] = [
  {
    agentId: 1,
    maxConcurrentTasks: 1,
    maxTotalTasks: 1,
    resourceAvailable: { cpu: 1 },
  },
];

function request(execute = vi.fn(async () => ({
  status: 'SUCCESS' as const,
  observations: {
    'deployment.status': 'LIVE',
    'deployment.ref': 'abc123',
    'health.status': 'PASS',
  },
  evidence: [
    { fact: 'deployment.status', observerRole: 'verifier' as const, hash: 'a'.repeat(64) },
    { fact: 'deployment.ref', observerRole: 'verifier' as const, hash: 'b'.repeat(64) },
    { fact: 'health.status', observerRole: 'verifier' as const, hash: 'c'.repeat(64) },
  ],
  observedResultHash: 'd'.repeat(64),
  evidenceItemIds: ['ev-deploy', 'ev-ref', 'ev-health'],
}))) {
  return {
    optimization: {
      problemId: 'deploy-opt-1',
      tasks,
      agentCapacities: agents,
      useMock: true,
      seed: 7,
      exactProofMaxVariables: 4,
      objective: {
        version: 'deployment-risk-cost-v1',
        assignmentCosts: {
          'task_deploy-task_agent_1': 1,
        },
      },
      constraintVersion: 'assignment-capacity-v1',
    },
    actionSolution: {
      runtime: 'render' as const,
      environment: 'preview',
      commitSha: 'abc123',
    },
    gate: {
      workspaceId: 'org-1',
      runtime: {
        agentId: 'unify-1',
        agentType: 'code-agent' as const,
        sessionId: 'session-1',
        agentWillExecuteAction: true as const,
        requiresResultCallback: true as const,
      },
      rbac: {
        actorId: 'user-1',
        role: 'approver' as const,
        permissions: ['tool:execute_high'],
        approvalRequestId: 'approval-1',
        approvalDecision: 'approved' as const,
        approvedBy: 'user-1',
        approvedAt: '2026-08-15T00:00:00.000Z',
      },
      audit: {
        preAuditEventId: 'audit-1',
        ledgerId: 'ledger-1',
        chainHeadHash: 'e'.repeat(64),
      },
      evidence: {
        evidenceManifestId: 'manifest-1',
        policySnapshotHash: 'f'.repeat(64),
      },
      planContractVerified: false,
    },
    simulate: vi.fn(async () => ({ ok: true, witnessHash: '1'.repeat(64) })),
    execute,
  };
}

describe('DSG ONE canonical action E2E', () => {
  it('runs the executor only after global proof, Action IR, DSG ALLOW, and simulation', async () => {
    const input = request();
    const result = await runCanonicalActionE2E(input);

    expect(result.verdict).toBe('PASS');
    expect(result.executionPerformed).toBe(true);
    expect(input.simulate).toHaveBeenCalledTimes(1);
    expect(input.execute).toHaveBeenCalledTimes(1);
    if ('replay' in result) {
      expect(result.replay.replayable).toBe(true);
      expect(result.deterministicReceiptHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('never invokes the executor when the DSG gate blocks', async () => {
    const execute = vi.fn(async () => ({
      status: 'SUCCESS' as const,
      observations: {},
      evidence: [],
      observedResultHash: 'd'.repeat(64),
      evidenceItemIds: ['ev'],
    }));
    const input = request(execute);
    input.gate.rbac.permissions = [];

    const result = await runCanonicalActionE2E(input);

    expect(result.verdict).toBe('BLOCK');
    expect(result.executionPerformed).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });
});
