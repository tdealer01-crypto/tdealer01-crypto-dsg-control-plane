import { describe, expect, it, vi } from 'vitest';
import { runCodeEvolution } from '../../skills/code-evolution/skill';

vi.mock('../../lib/dsg/seed/seed-engine', () => ({
  seedData: vi.fn(async (input: { requiredEvidence: boolean }) => ({
    ok: true,
    data: { files: ['src/main.ts'], lineCount: 200 },
    evidenceHash: 'sha256:seed-codebase-mock',
    sourceUrl: 'internal://codebase',
    gateStatus: 'PASS',
    searchAttempted: true,
  })),
}));

vi.mock('../../lib/dsg/logic/z3-agent-gate', () => ({
  runZ3AgentGate: vi.fn(async (input: { gateAllow: boolean }) => ({
    status: input.gateAllow ? 'PASS' : 'BLOCK',
    pass: input.gateAllow,
    z3Check: input.gateAllow ? 'sat' : 'unsat',
    z3ProofHash: `sha256:mock-code-evolution-${input.gateAllow}`,
    violations: input.gateAllow
      ? []
      : [{ code: 'WRITES_CODE_WITHOUT_PLAN_APPROVAL', message: 'plan not approved' }],
    agentType: 'code-evolution',
    jobId: 'test',
  })),
}));

describe('Code Evolution Agent — Plan Approval Invariant', () => {
  it('BLOCK when planApproved=false', async () => {
    const r = await runCodeEvolution({
      jobId: 'ce-001',
      workspaceId: 'ws1',
      goal: 'add login page',
      planApproved: false,
    });
    expect(r.ok).toBe(false);
    expect(r.readyToWrite).toBe(false);
    expect(r.blockedReasons).toContain('WRITES_CODE_WITHOUT_PLAN_APPROVAL');
  });

  it('PASS when planApproved=true', async () => {
    const r = await runCodeEvolution({
      jobId: 'ce-002',
      workspaceId: 'ws1',
      goal: 'add login page',
      planApproved: true,
    });
    expect(r.ok).toBe(true);
    expect(r.readyToWrite).toBe(true);
    expect(r.blockedReasons).toHaveLength(0);
  });

  it('always returns z3ProofHash', async () => {
    const r = await runCodeEvolution({
      jobId: 'ce-003',
      workspaceId: 'ws1',
      goal: 'refactor module',
      planApproved: true,
    });
    expect(r.z3ProofHash).toMatch(/^sha256:/);
  });

  it('always returns codebaseStateHash from Seed Engine', async () => {
    const r = await runCodeEvolution({
      jobId: 'ce-004',
      workspaceId: 'ws1',
      goal: 'add tests',
      planApproved: true,
    });
    expect(r.codebaseStateHash).toMatch(/^sha256:/);
  });

  it('BLOCK destructive write without destruction proof', async () => {
    const r = await runCodeEvolution({
      jobId: 'ce-005',
      workspaceId: 'ws1',
      goal: 'delete legacy module',
      planApproved: false,
      isDestructiveWrite: true,
      destructionProof: false,
    });
    expect(r.ok).toBe(false);
    expect(r.readyToWrite).toBe(false);
  });

  it('PASS destructive write with approved plan and proof', async () => {
    const r = await runCodeEvolution({
      jobId: 'ce-006',
      workspaceId: 'ws1',
      goal: 'delete legacy module',
      planApproved: true,
      isDestructiveWrite: true,
      destructionProof: true,
    });
    expect(r.readyToWrite).toBe(true);
  });

  it('jobId is echoed in result', async () => {
    const r = await runCodeEvolution({
      jobId: 'unique-job-99',
      workspaceId: 'ws1',
      goal: 'fix bug',
      planApproved: true,
    });
    expect(r.jobId).toBe('unique-job-99');
  });

  it('BLOCK returns empty blockedReasons when no violations', async () => {
    const r = await runCodeEvolution({
      jobId: 'ce-007',
      workspaceId: 'ws1',
      goal: 'add feature',
      planApproved: true,
    });
    expect(Array.isArray(r.blockedReasons)).toBe(true);
  });
});
