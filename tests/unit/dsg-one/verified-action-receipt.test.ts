import { describe, expect, it } from 'vitest';
import { runCanonicalActionFromSurface } from '@/lib/mcp/canonical-action-adapter';
import type { UnifiedAuthContext } from '@/lib/mcp/unified-auth';
import {
  buildVerifiedActionReceipt,
  checkReceiptIntegrity,
  replayVerifiedAction,
  REPRODUCIBLE_CHAIN_FIELDS,
  RUN_SCOPED_CHAIN_FIELDS,
  VERIFIED_ACTION_RECEIPT_SCHEMA,
} from '@/lib/dsg-one/verified-action-receipt';
import { validateVerifiedActionRequest } from '@/lib/dsg-one/verified-action-request';

const auth: UnifiedAuthContext = {
  source: 'api-key',
  actorId: 'key-1',
  orgId: 'org-1',
  roles: ['operator'],
};

const optimization = {
  problemId: 'verified-action-receipt',
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
};

const observed = {
  simulation: { ok: true, witnessHash: 'c'.repeat(64) },
  execution: {
    status: 'SUCCESS' as const,
    observations: {
      'deployment.status': 'LIVE',
      'deployment.ref': '0123456789abcdef0123456789abcdef01234567',
      'health.status': 'PASS',
    },
    evidence: [
      { fact: 'deployment.status', observerRole: 'verifier' as const, hash: 'd'.repeat(64) },
      { fact: 'deployment.ref', observerRole: 'verifier' as const, hash: 'e'.repeat(64) },
      { fact: 'health.status', observerRole: 'verifier' as const, hash: 'f'.repeat(64) },
    ],
    observedResultHash: '1'.repeat(64),
    evidenceItemIds: ['ev-1', 'ev-2', 'ev-3'],
  },
};

const baseRequest = {
  idempotencyKey: 'idem-1',
  surface: 'api' as const,
  sessionId: 'session-1',
  optimization,
  actionSolution: {
    runtime: 'render' as const,
    environment: 'staging',
    commitSha: '0123456789abcdef0123456789abcdef01234567',
  },
  approval: { requestId: 'approval-1', decision: 'approved' as const },
  audit: { preAuditEventId: 'audit-1', ledgerId: 'ledger-1', chainHeadHash: 'a'.repeat(64) },
  evidence: { evidenceManifestId: 'manifest-1', policySnapshotHash: 'b'.repeat(64) },
  observed,
};

async function runChain() {
  return runCanonicalActionFromSurface(
    {
      surface: 'api',
      sessionId: baseRequest.sessionId,
      optimization: baseRequest.optimization as never,
      actionSolution: baseRequest.actionSolution,
      approval: baseRequest.approval,
      audit: baseRequest.audit,
      evidence: baseRequest.evidence,
    },
    auth,
    {
      simulate: async () => observed.simulation,
      execute: async () => observed.execution,
    },
  );
}

describe('verified action receipt', () => {
  it('issues a receipt bound to the canonical chain hashes', async () => {
    const chain = await runChain();
    const receipt = buildVerifiedActionReceipt({
      canonicalResult: chain.result,
      surface: 'api',
      workspaceId: 'org-1',
      problemId: optimization.problemId,
    });

    expect(receipt.schema).toBe(VERIFIED_ACTION_RECEIPT_SCHEMA);
    expect(receipt.receiptId).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.workspaceId).toBe('org-1');
    expect(receipt.chain.canonicalChainHash).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.chain.optimizationProofHash).toMatch(/^[0-9a-f]{64}$/);

    // The receipt must never soften the repository's standing claim boundary.
    expect(receipt.boundary.certificationClaim).toBe(false);
    expect(receipt.boundary.independentAuditClaim).toBe(false);
    expect(receipt.boundary.externalZ3SolverInvoked).toBe(false);
    expect(receipt.boundary.executedByDsg).toBe(false);
  });

  it('addresses the same chain run by the same receiptId regardless of issue time', async () => {
    const chain = await runChain();
    const first = buildVerifiedActionReceipt({
      canonicalResult: chain.result,
      surface: 'api',
      workspaceId: 'org-1',
      problemId: optimization.problemId,
      issuedAt: '2026-01-01T00:00:00.000Z',
    });
    const second = buildVerifiedActionReceipt({
      canonicalResult: chain.result,
      surface: 'api',
      workspaceId: 'org-1',
      problemId: optimization.problemId,
      issuedAt: '2026-06-30T12:00:00.000Z',
    });

    expect(second.receiptId).toBe(first.receiptId);
    expect(second.issuedAt).not.toBe(first.issuedAt);
  });

  it('detects a receipt whose verdict was edited after issue', async () => {
    const chain = await runChain();
    const receipt = buildVerifiedActionReceipt({
      canonicalResult: chain.result,
      surface: 'api',
      workspaceId: 'org-1',
      problemId: optimization.problemId,
    });

    expect(checkReceiptIntegrity(receipt).intact).toBe(true);

    const forged = {
      ...receipt,
      chain: { ...receipt.chain, actionPlanHash: '0'.repeat(64) },
    };
    const integrity = checkReceiptIntegrity(forged);
    expect(integrity.intact).toBe(false);
    if (!integrity.intact) {
      expect(integrity.presentedReceiptId).toBe(receipt.receiptId);
      expect(integrity.expectedReceiptId).not.toBe(receipt.receiptId);
    }
  });

  it('reports replayMatch when the chain reproduces every hash', async () => {
    const receipt = buildVerifiedActionReceipt({
      canonicalResult: (await runChain()).result,
      surface: 'api',
      workspaceId: 'org-1',
      problemId: optimization.problemId,
    });

    const replay = replayVerifiedAction(receipt, (await runChain()).result);

    expect(replay.replayMatch).toBe(true);
    expect(replay.receiptIntact).toBe(true);
    expect(replay.verdictMatch).toBe(true);
    expect(replay.mismatchedFields).toEqual([]);
    expect(replay.comparedFields).toBe(REPRODUCIBLE_CHAIN_FIELDS.length);
  });

  it('never asserts the timestamped hashes reproduce, and says which they are', async () => {
    const receipt = buildVerifiedActionReceipt({
      canonicalResult: (await runChain()).result,
      surface: 'api',
      workspaceId: 'org-1',
      problemId: optimization.problemId,
    });

    const replay = replayVerifiedAction(receipt, (await runChain()).result);

    // evaluateAgentCommandGate and buildAgentActionResultReceipt both hash a
    // wall-clock timestamp, so these three differ on every run of the same
    // action. A replay must stay green regardless.
    expect(replay.replayMatch).toBe(true);
    expect(replay.runScopedFields.map((entry) => entry.field)).toEqual(RUN_SCOPED_CHAIN_FIELDS);
    expect(replay.runScopedFields.some((entry) => !entry.match)).toBe(true);
    expect(REPRODUCIBLE_CHAIN_FIELDS).not.toContain('deterministicReceiptHash');
  });

  it('reports which chain hashes diverged when inputs change underneath a receipt', async () => {
    const receipt = buildVerifiedActionReceipt({
      canonicalResult: (await runChain()).result,
      surface: 'api',
      workspaceId: 'org-1',
      problemId: optimization.problemId,
    });

    // Same action, different target environment — the drift a stale receipt
    // must not hide.
    const drifted = await runCanonicalActionFromSurface(
      {
        surface: 'api',
        sessionId: baseRequest.sessionId,
        optimization: baseRequest.optimization as never,
        actionSolution: { ...baseRequest.actionSolution, environment: 'production' },
        approval: baseRequest.approval,
        audit: baseRequest.audit,
        evidence: baseRequest.evidence,
      },
      auth,
      {
        simulate: async () => observed.simulation,
        execute: async () => observed.execution,
      },
    );

    const replay = replayVerifiedAction(receipt, drifted.result);

    expect(replay.replayMatch).toBe(false);
    expect(replay.receiptIntact).toBe(true);
    expect(replay.mismatchedFields.length).toBeGreaterThan(0);
    expect(replay.reason).toContain('diverged');
  });
});

describe('verified action request validation', () => {
  it('accepts a complete request', () => {
    expect(validateVerifiedActionRequest(baseRequest).ok).toBe(true);
  });

  it('rejects a request with no bound business objective', () => {
    const { objective: _objective, ...withoutObjective } = optimization;
    const result = validateVerifiedActionRequest({
      ...baseRequest,
      optimization: withoutObjective,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.details.map((detail) => detail.field)).toContain('optimization.objective');
    }
  });

  it('rejects a request that asks DSG to execute rather than verify', () => {
    const { observed: _observed, ...withoutObserved } = baseRequest;
    const result = validateVerifiedActionRequest(withoutObserved);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.details.map((detail) => detail.field)).toContain('observed');
    }
  });

  it('rejects an execution result carrying no evidence', () => {
    const result = validateVerifiedActionRequest({
      ...baseRequest,
      observed: {
        ...observed,
        execution: { ...observed.execution, evidence: [] },
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.details.map((detail) => detail.field)).toContain(
        'observed.execution.evidence',
      );
    }
  });
});
