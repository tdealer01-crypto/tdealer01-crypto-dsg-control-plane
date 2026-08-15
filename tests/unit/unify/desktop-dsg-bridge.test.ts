import { describe, expect, it, vi } from 'vitest';
import {
  UnifyDesktopDsgBridge,
  verifyLocalEvidenceIntegrity,
  type UnifyExecutionRequest,
} from '@/lib/unify/desktop-dsg-bridge';

const formalContext = {
  is_grounded: true,
  is_api_clean: true,
  source_verified: true,
  has_audit_trail: true,
  nonce_lock: true,
  value: 1,
  intent_score: 1,
  compute_cost: 10,
};

const request: UnifyExecutionRequest = {
  target: 'shell',
  action: 'run-approved-command',
  args: { command: 'echo', args: ['verified'] },
  formalContext,
  gateRequest: {
    workspaceId: 'org-1',
    runtime: {
      agentId: 'unify-desktop',
      agentType: 'external-agent',
      sessionId: 'session-1',
      agentWillExecuteAction: true,
      requiresResultCallback: true,
    },
    command: {
      commandId: 'cmd-1',
      actionType: 'write',
      targetSystemId: 'local-shell',
      operationName: 'run-approved-command',
      riskLevel: 'low',
      dataClasses: [],
      idempotencyKey: 'idem-1',
      rollbackPlanId: 'rollback-1',
    },
    rbac: {
      actorId: 'user-1',
      role: 'operator',
      permissions: ['tool:execute_low'],
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
  },
};

const formalAllow = {
  ok: true,
  decision: 'ALLOW',
  makk8: {
    ok: true,
    decision: 'ALLOW',
    status: 'SAT',
    reason: 'SAMMA_Z3_VERIFIED',
    proofHash: 'c'.repeat(64),
    constraintsHash: 'd'.repeat(64),
  },
};

const gateAllow = {
  ok: true,
  result: {
    gateVersion: 'dsg-agent-command-gate-v1.0',
    decision: 'PASS',
    canAgentExecute: true,
    status: 'AGENT_ACTION_ALLOWED',
    reasons: ['decision_pass'],
    invariantChecks: [],
    commandHash: 'e'.repeat(64),
    decisionHash: 'f'.repeat(64),
    generatedAt: '2026-08-15T00:00:00.000Z',
    truthBoundary: 'allowed',
    actionEnvelope: {
      envelopeId: 'envelope-1',
      workspaceId: 'org-1',
      agentId: 'unify-desktop',
      sessionId: 'session-1',
      commandId: 'cmd-1',
      decisionHash: 'f'.repeat(64),
      allowedAction: 'write',
      targetSystemId: 'local-shell',
      operationName: 'run-approved-command',
      actionScope: ['local-shell', 'run-approved-command', 'write'],
      expiresAt: '2099-01-01T00:00:00.000Z',
      mustReturnResultTo: '/api/dsg/agent-command-gate/result',
      requiredResultFields: [],
    },
  },
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('UnifyDesktopDsgBridge', () => {
  it('does not execute when Makk-8/Z3 blocks', async () => {
    const fetchImpl = vi.fn(async () =>
      response({ ...formalAllow, ok: false, decision: 'BLOCK', makk8: { ...formalAllow.makk8, ok: false, decision: 'BLOCK', status: 'UNSAT' } }, 409),
    );
    const executor = { execute: vi.fn() };
    const bridge = new UnifyDesktopDsgBridge({ baseUrl: 'https://dsg.example', fetchImpl: fetchImpl as typeof fetch });

    const result = await bridge.execute(request, executor);

    expect(result.decision).toBe('BLOCK');
    expect(result.stage).toBe('MAKK8_Z3');
    expect(executor.execute).not.toHaveBeenCalled();
  });

  it('does not execute when DSG ONE command gate blocks', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(formalAllow))
      .mockResolvedValueOnce(response({ ok: false, result: { ...gateAllow.result, decision: 'BLOCK', canAgentExecute: false, status: 'AGENT_ACTION_BLOCKED', actionEnvelope: undefined } }, 409));
    const executor = { execute: vi.fn() };
    const bridge = new UnifyDesktopDsgBridge({ baseUrl: 'https://dsg.example', fetchImpl: fetchImpl as typeof fetch });

    const result = await bridge.execute(request, executor);

    expect(result.decision).toBe('BLOCK');
    expect(result.stage).toBe('DSG_ONE_GATE');
    expect(executor.execute).not.toHaveBeenCalled();
  });

  it('executes only after both gates, stores evidence, records receipt, and replays formal proof', async () => {
    const receipt = {
      gateVersion: 'dsg-agent-command-gate-v1.0',
      accepted: true,
      workspaceId: 'org-1',
      agentId: 'unify-desktop',
      commandId: 'cmd-1',
      envelopeId: 'envelope-1',
      status: 'SUCCESS',
      resultHash: '1'.repeat(64),
      receiptHash: '2'.repeat(64),
      reasons: ['agent_result_record_accepted'],
      recordedAt: '2026-08-15T00:00:01.000Z',
    };

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(formalAllow))
      .mockResolvedValueOnce(response(gateAllow))
      .mockResolvedValueOnce(response({ ok: true, receipt }))
      .mockResolvedValueOnce(response(formalAllow));

    const executor = {
      execute: vi.fn(async () => ({ status: 'SUCCESS' as const, output: { stdout: 'verified' } })),
    };
    const store = { save: vi.fn(async () => undefined) };
    const bridge = new UnifyDesktopDsgBridge({ baseUrl: 'https://dsg.example', fetchImpl: fetchImpl as typeof fetch });

    const result = await bridge.execute(request, executor, store);

    expect(result.decision).toBe('ALLOW');
    if (result.decision !== 'ALLOW') throw new Error('expected ALLOW');
    expect(executor.execute).toHaveBeenCalledTimes(1);
    expect(store.save).toHaveBeenCalledTimes(1);
    expect(result.receipt?.accepted).toBe(true);
    expect(result.replay.ok).toBe(true);
    expect(result.replay.reason).toBe('REPLAY_VERIFIED');
    expect(verifyLocalEvidenceIntegrity(result.evidence)).toBe(true);
    expect(result.evidence.evidenceHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('detects tampered local evidence', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(formalAllow))
      .mockResolvedValueOnce(response(gateAllow))
      .mockResolvedValueOnce(response({ ok: true, receipt: null }))
      .mockResolvedValueOnce(response(formalAllow));
    const executor = {
      execute: vi.fn(async () => ({ status: 'SUCCESS' as const, output: 'ok' })),
    };
    const bridge = new UnifyDesktopDsgBridge({ baseUrl: 'https://dsg.example', fetchImpl: fetchImpl as typeof fetch });
    const result = await bridge.execute(request, executor);
    if (result.decision !== 'ALLOW') throw new Error('expected ALLOW');

    const tampered = { ...result.evidence, action: 'changed-after-execution' };
    expect(verifyLocalEvidenceIntegrity(tampered)).toBe(false);
  });
});
