import { describe, expect, it, vi } from 'vitest';
import { runDeployMonitor } from '../../skills/deploy-monitor/skill';

vi.mock('../../lib/dsg/seed/seed-engine', () => ({
  seedData: vi.fn(async () => ({
    ok: true,
    data: { status: 'ready', buildId: 'bld-123', url: 'https://app.vercel.app' },
    evidenceHash: 'sha256:seed-deploy-mock',
    sourceUrl: 'https://api.vercel.com/v13/deployments',
    gateStatus: 'PASS',
    searchAttempted: true,
  })),
}));

vi.mock('../../lib/dsg/logic/z3-agent-gate', () => ({
  runZ3AgentGate: vi.fn(async (input: { gateAllow: boolean; mockState?: boolean }) => {
    const blocked = !input.gateAllow || input.mockState;
    return {
      status: blocked ? 'BLOCK' : 'PASS',
      pass: !blocked,
      z3Check: blocked ? 'unsat' : 'sat',
      z3ProofHash: `sha256:mock-deploy-${input.gateAllow}`,
      violations: blocked
        ? [{ code: 'DEPLOY_WITHOUT_GATE_PASS', message: 'gate not passed' }]
        : [],
      agentType: 'deploy-monitor',
      jobId: 'test',
    };
  }),
}));

describe('Deploy Monitor Agent — Gate Pass Invariant', () => {
  it('canTriggerDeploy when gateAllow=true and not mockState', async () => {
    const r = await runDeployMonitor({
      jobId: 'dm-001',
      workspaceId: 'ws1',
      deploymentUrl: 'https://app.vercel.app',
      gateAllow: true,
      mockState: false,
    });
    expect(r.ok).toBe(true);
    expect(r.canTriggerDeploy).toBe(true);
  });

  it('BLOCK when gateAllow=false', async () => {
    const r = await runDeployMonitor({
      jobId: 'dm-002',
      workspaceId: 'ws1',
      deploymentUrl: 'https://app.vercel.app',
      gateAllow: false,
    });
    expect(r.ok).toBe(false);
    expect(r.canTriggerDeploy).toBe(false);
    expect(r.blockedReasons).toContain('DEPLOY_WITHOUT_GATE_PASS');
  });

  it('BLOCK in mockState even with gateAllow=true', async () => {
    const r = await runDeployMonitor({
      jobId: 'dm-003',
      workspaceId: 'ws1',
      deploymentUrl: 'https://app.vercel.app',
      gateAllow: true,
      mockState: true,
    });
    expect(r.canTriggerDeploy).toBe(false);
  });

  it('always returns z3ProofHash', async () => {
    const r = await runDeployMonitor({
      jobId: 'dm-004',
      workspaceId: 'ws1',
      deploymentUrl: 'https://app.vercel.app',
      gateAllow: true,
    });
    expect(r.z3ProofHash).toMatch(/^sha256:/);
  });

  it('always returns deploymentStatusHash from Seed Engine', async () => {
    const r = await runDeployMonitor({
      jobId: 'dm-005',
      workspaceId: 'ws1',
      deploymentUrl: 'https://app.vercel.app',
      gateAllow: true,
    });
    expect(r.deploymentStatusHash).toMatch(/^sha256:/);
  });

  it('echoes jobId and deploymentUrl in result', async () => {
    const r = await runDeployMonitor({
      jobId: 'dm-006',
      workspaceId: 'ws1',
      deploymentUrl: 'https://staging.example.com',
      gateAllow: true,
    });
    expect(r.jobId).toBe('dm-006');
    expect(r.deploymentUrl).toBe('https://staging.example.com');
  });
});
