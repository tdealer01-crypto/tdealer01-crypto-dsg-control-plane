import { describe, expect, it } from 'vitest';
import { runCanonicalActionFromSurface } from '@/lib/mcp/canonical-action-adapter';
import type { UnifiedAuthContext } from '@/lib/mcp/unified-auth';

const auth: UnifiedAuthContext = {
  source: 'session',
  actorId: 'actor-1',
  orgId: 'org-1',
  roles: ['operator'],
};

const baseInput = {
  sessionId: 'session-1',
  optimization: {
    problemId: 'adapter-test',
    tasks: [
      {
        id: 'task-1',
        requiredCapabilities: ['code'],
        estimatedTokens: 100,
        priority: 1,
      },
    ],
    agentCapacities: [
      {
        agentId: 1,
        capabilities: ['code'],
        maxConcurrentTasks: 1,
        maxTotalTasks: 1,
      },
    ],
    seed: 1,
    useMock: true,
    exactProofMaxVariables: 8,
    objective: {
      version: 'test-cost-v1',
      assignmentCosts: { 'task_task-1_agent_1': 0 },
    },
  },
  actionSolution: {
    runtime: 'render' as const,
    environment: 'staging',
    commitSha: '0123456789abcdef0123456789abcdef01234567',
  },
  approval: {
    requestId: 'approval-1',
    decision: 'approved' as const,
  },
  audit: {
    preAuditEventId: 'audit-1',
    ledgerId: 'ledger-1',
    chainHeadHash: 'a'.repeat(64),
  },
  evidence: {
    evidenceManifestId: 'manifest-1',
    policySnapshotHash: 'b'.repeat(64),
  },
};

function hooks() {
  return {
    simulate: async () => ({ ok: true, witnessHash: 'c'.repeat(64) }),
    execute: async () => ({
      status: 'SUCCESS' as const,
      observations: {
        'deployment.status': 'LIVE',
        'deployment.ref': baseInput.actionSolution.commitSha,
        'health.status': 'PASS',
      },
      evidence: [
        { fact: 'deployment.status', observerRole: 'verifier' as const, hash: 'd'.repeat(64) },
        { fact: 'deployment.ref', observerRole: 'verifier' as const, hash: 'e'.repeat(64) },
        { fact: 'health.status', observerRole: 'verifier' as const, hash: 'f'.repeat(64) },
      ],
      observedResultHash: '1'.repeat(64),
      evidenceItemIds: ['ev-1', 'ev-2', 'ev-3'],
    }),
  };
}

describe('canonical action surface adapter', () => {
  it('keeps Unify as a transport surface over the canonical chain', async () => {
    const result = await runCanonicalActionFromSurface(
      { ...baseInput, surface: 'unify' },
      auth,
      hooks(),
    );
    expect(result.surface).toBe('unify');
    expect(result.canonical).toBe(true);
    expect(result.boundary).toContain('do not create a second authorization');
  });

  it('keeps Trinity MCP on the same canonical chain', async () => {
    const result = await runCanonicalActionFromSurface(
      { ...baseInput, surface: 'trinity-mcp' },
      auth,
      hooks(),
    );
    expect(result.surface).toBe('trinity-mcp');
    expect(result.canonical).toBe(true);
    expect(result.boundary).toContain('canonical DSG ONE chain remains authoritative');
  });
});
