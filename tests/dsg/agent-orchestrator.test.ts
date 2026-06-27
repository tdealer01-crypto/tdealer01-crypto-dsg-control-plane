import { describe, expect, it } from 'vitest';
import { runOrchestrator } from '../../skills/orchestrator/skill';

// Mock executeAgent to avoid actual HTTP calls in tests
vi.mock('../../lib/dsg/agents/executor', () => ({
  executeAgent: vi.fn().mockResolvedValue({
    ok: true,
    jobId: 'mock-job',
    agentType: 'code-evolution',
    status: 'pass',
    evidenceHash: 'sha256:mock',
  }),
}));

// Mock Z3 gate to avoid Python dependency in unit tests
vi.mock('../../lib/dsg/logic/z3-agent-gate', () => ({
  runZ3AgentGate: vi.fn().mockResolvedValue({
    status: 'PASS',
    pass: true,
    z3Check: 'sat',
    z3ProofHash: 'sha256:mock-orchestrator',
    violations: [],
    agentType: 'orchestrator',
    jobId: 'test-job',
  }),
  isZ3Pass: (r: { pass: boolean }) => r.pass,
}));

import { vi } from 'vitest';

describe('Orchestrator Agent — Goal Lock Invariant', () => {
  it('blocks dispatch when goalLocked=false', async () => {
    const result = await runOrchestrator({
      jobId: 'job-001',
      workspaceId: 'ws-001',
      goal: 'test goal',
      goalLocked: false,
      subGoals: [{ agentType: 'code-evolution', goal: 'write code' }],
    });
    expect(result.ok).toBe(false);
    expect(result.blocked[0].reason).toContain('ORCHESTRATOR_NO_GOAL_LOCK');
  });

  it('dispatches when goalLocked=true', async () => {
    const result = await runOrchestrator({
      jobId: 'job-002',
      workspaceId: 'ws-001',
      goal: 'test goal',
      goalLocked: true,
      subGoals: [{ agentType: 'code-evolution', goal: 'write code' }],
    });
    expect(result.ok).toBe(true);
    expect(result.dispatched).toHaveLength(1);
    expect(result.blocked).toHaveLength(0);
  });

  it('returns z3ProofHash in all responses', async () => {
    const result = await runOrchestrator({
      jobId: 'job-003',
      workspaceId: 'ws-001',
      goal: 'test',
      goalLocked: false,
      subGoals: [],
    });
    expect(result.z3ProofHash).toMatch(/^sha256:/);
  });

  it('handles empty subGoals gracefully', async () => {
    const result = await runOrchestrator({
      jobId: 'job-004',
      workspaceId: 'ws-001',
      goal: 'no tasks',
      goalLocked: true,
      subGoals: [],
    });
    expect(result.ok).toBe(true);
    expect(result.dispatched).toHaveLength(0);
  });

  it('blocks all sub-goals when goalLocked=false', async () => {
    const result = await runOrchestrator({
      jobId: 'job-005',
      workspaceId: 'ws-001',
      goal: 'multi dispatch',
      goalLocked: false,
      subGoals: [
        { agentType: 'code-evolution', goal: 'write' },
        { agentType: 'test-coverage', goal: 'test' },
      ],
    });
    expect(result.blocked).toHaveLength(2);
    expect(result.dispatched).toHaveLength(0);
  });
});
