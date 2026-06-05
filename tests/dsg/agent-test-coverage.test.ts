import { describe, expect, it, vi } from 'vitest';
import { runTestCoverage } from '../../skills/test-coverage/skill';

vi.mock('../../lib/dsg/agent-runtime/external-context-tools', () => ({
  loadExternalAgentContext: vi.fn().mockResolvedValue({ items: [], promptText: '' }),
}));

vi.mock('../../lib/dsg/logic/z3-agent-gate', () => ({
  runZ3AgentGate: vi.fn(async (input: { gateAllow: boolean }) => ({
    status: input.gateAllow ? 'PASS' : 'BLOCK',
    pass: input.gateAllow,
    z3ProofHash: `sha256:mock-coverage-${input.gateAllow}`,
    violations: input.gateAllow ? [] : [{ code: 'COVERAGE_DECREASED', message: 'decreased' }],
  })),
}));

describe('Test Coverage Agent — Monotonic Invariant', () => {
  it('PASS when coverage increases', async () => {
    const r = await runTestCoverage({ jobId: 'j1', workspaceId: 'ws1', previousCoveragePct: 60, currentCoveragePct: 65 });
    expect(r.ok).toBe(true);
    expect(r.coverageIncreased).toBe(true);
    expect(r.blockedReasons).toHaveLength(0);
  });

  it('PASS when coverage stays the same', async () => {
    const r = await runTestCoverage({ jobId: 'j2', workspaceId: 'ws1', previousCoveragePct: 70, currentCoveragePct: 70 });
    expect(r.coverageIncreased).toBe(true);
  });

  it('BLOCK when coverage decreases', async () => {
    const r = await runTestCoverage({ jobId: 'j3', workspaceId: 'ws1', previousCoveragePct: 80, currentCoveragePct: 75 });
    expect(r.ok).toBe(false);
    expect(r.coverageIncreased).toBe(false);
    expect(r.blockedReasons).toContain('COVERAGE_DECREASED');
  });

  it('reports needsMoreTests when below threshold', async () => {
    const r = await runTestCoverage({ jobId: 'j4', workspaceId: 'ws1', previousCoveragePct: 50, currentCoveragePct: 55, threshold: 80 });
    expect(r.needsMoreTests).toBe(true);
  });

  it('does not needMoreTests when at or above threshold', async () => {
    const r = await runTestCoverage({ jobId: 'j5', workspaceId: 'ws1', previousCoveragePct: 80, currentCoveragePct: 85, threshold: 80 });
    expect(r.needsMoreTests).toBe(false);
  });

  it('always returns z3ProofHash', async () => {
    const r = await runTestCoverage({ jobId: 'j6', workspaceId: 'ws1', previousCoveragePct: 50, currentCoveragePct: 55 });
    expect(r.z3ProofHash).toMatch(/^sha256:/);
  });
});
