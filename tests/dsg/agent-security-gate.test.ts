import { describe, expect, it, vi } from 'vitest';
import { runSecurityGate } from '../../skills/security-gate/skill';

vi.mock('../../lib/dsg/logic/z3-agent-gate', () => ({
  runZ3AgentGate: vi.fn(async (input: { gateAllow: boolean }) => ({
    status: input.gateAllow ? 'PASS' : 'BLOCK',
    pass: input.gateAllow,
    z3Check: input.gateAllow ? 'sat' : 'unsat',
    z3ProofHash: `sha256:mock-gate-${input.gateAllow}`,
    violations: input.gateAllow ? [] : [{ code: 'ACTION_WITHOUT_GATE_ALLOW', message: 'no allow' }],
    agentType: 'security-gate',
    jobId: 'test',
  })),
}));

describe('Security Gate — Low Risk', () => {
  it('ALLOW for low risk actions', async () => {
    const r = await runSecurityGate({ actionId: 'a1', agentType: 'code-evolution', workspaceId: 'ws1', riskLevel: 'low', evidenceExists: false, mockState: false, requiresApproval: false });
    expect(r.decision).toBe('ALLOW');
    expect(r.ok).toBe(true);
  });
});

describe('Security Gate — Critical Risk Hard Block', () => {
  it('BLOCK critical without evidence before Z3', async () => {
    const r = await runSecurityGate({ actionId: 'a2', agentType: 'deploy-monitor', workspaceId: 'ws1', riskLevel: 'critical', evidenceExists: false, mockState: false, requiresApproval: true });
    expect(r.decision).toBe('BLOCK');
    expect(r.reason).toContain('CRITICAL');
    expect(r.ok).toBe(false);
  });

  it('ALLOW critical with evidence and approval', async () => {
    const r = await runSecurityGate({ actionId: 'a3', agentType: 'deploy-monitor', workspaceId: 'ws1', riskLevel: 'critical', evidenceExists: true, mockState: false, requiresApproval: true });
    expect(r.decision).toBe('ALLOW');
  });
});

describe('Security Gate — Mock State', () => {
  it('BLOCK critical in mock state', async () => {
    const r = await runSecurityGate({ actionId: 'a4', agentType: 'deploy-monitor', workspaceId: 'ws1', riskLevel: 'critical', evidenceExists: true, mockState: true, requiresApproval: true });
    expect(r.decision).toBe('BLOCK');
  });
});

describe('Security Gate — Z3 Proof Hash', () => {
  it('always returns z3ProofHash', async () => {
    const r = await runSecurityGate({ actionId: 'a5', agentType: 'orchestrator', workspaceId: 'ws1', riskLevel: 'medium', evidenceExists: true, mockState: false, requiresApproval: false });
    expect(r.z3ProofHash).toMatch(/^sha256:/);
  });

  it('blocked result includes actionId', async () => {
    const r = await runSecurityGate({ actionId: 'my-action-id', agentType: 'code-evolution', workspaceId: 'ws1', riskLevel: 'critical', evidenceExists: false, mockState: false, requiresApproval: true });
    expect(r.actionId).toBe('my-action-id');
  });
});
