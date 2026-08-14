/**
 * CCVS Evidence Generation Tests
 *
 * Moved from lib/dsg/multi-agent-ccvs/__tests__/evidence.test.ts (2026-08-03).
 * That location was outside vitest.config.ts's `include: ['tests/**']` glob,
 * so it never actually ran under `npm run test` / `npm run test:unit` / CI —
 * it only executed if someone manually ran `npx tsx` against it. Moving it
 * here makes it real, CI-enforced coverage for MultiAgentOrchestrator's
 * simulation-mode evidence generation across CCVS levels L1-L5.
 *
 * All assertions run in simulationFirst mode — no live GitHub, diffusion
 * endpoint, or network access is required or performed.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { MultiAgentOrchestrator } from '@/lib/dsg/multi-agent-ccvs/orchestrator/multi-agent-orchestrator';

describe('MultiAgentOrchestrator CCVS evidence generation', () => {
  beforeAll(() => {
    process.env.GITHUB_TOKEN = '***';
    process.env.DIFFUSION_ENDPOINT = 'http://localhost:8000/v1/completions';
    process.env.GITHUB_REPO_OWNER = 'tdealer01-crypto';
    process.env.GITHUB_REPO_NAME = 'tdealer01-crypto-dsg-control-plane';
  });

  it('creates an orchestrator with default config', () => {
    const orch = new MultiAgentOrchestrator({
      simulationFirst: true,
      githubToken: 'test-token',
      repoOwner: 'test-owner',
      repoName: 'test-repo',
    });
    expect(orch).toBeTruthy();
  });

  it('runs full orchestration in simulation mode and converges L1-L5', async () => {
    const orch = new MultiAgentOrchestrator({
      simulationFirst: true,
      createPR: false,
      maxTotalIterations: 4,
      convergenceThreshold: 0.9,
      githubToken: 'test-token',
      repoOwner: 'test-owner',
      repoName: 'test-repo',
    });

    const result = await orch.orchestrate('test-commit', 'CCVS L1-L5 test evidence');

    expect(result.success).toBe(true);

    const levels = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
    for (const level of levels) {
      const levelResult = result.levels.find((l) => l.level === level);
      expect(levelResult, `Level ${level} not found`).toBeDefined();
      expect(levelResult!.converged, `Level ${level} did not converge`).toBe(true);
      expect(levelResult!.score, `Level ${level} score below threshold`).toBeGreaterThanOrEqual(0.9);
    }

    expect(result.totalEvidence.length).toBeGreaterThanOrEqual(50);

    for (const levelResult of result.levels) {
      for (const agent of levelResult.agents) {
        expect(agent.success, `Agent ${agent.agentId} failed: ${agent.errors.join(', ')}`).toBe(true);
        expect(agent.errors, `Agent ${agent.agentId} has errors`).toHaveLength(0);
      }
    }
  });

  it('generates evidence for all L1-L5 levels', async () => {
    const orch = new MultiAgentOrchestrator({
      simulationFirst: true,
      githubToken: 'test-token',
      repoOwner: 'test-owner',
      repoName: 'test-repo',
    });
    const result = await orch.orchestrate('test', 'test');

    const levels = result.levels.map((l) => l.level).sort();
    expect(levels).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
  });

  it('has valid evidence structure', async () => {
    const orch = new MultiAgentOrchestrator({
      simulationFirst: true,
      githubToken: 'test-token',
      repoOwner: 'test-owner',
      repoName: 'test-repo',
    });
    const result = await orch.orchestrate('test', 'test');

    for (const evidence of result.totalEvidence) {
      expect(evidence.id, 'Evidence missing id').toBeTruthy();
      expect(['test', 'proof', 'artifact', 'attestation', 'report']).toContain(evidence.type);
      expect(['L1', 'L2', 'L3', 'L4', 'L5']).toContain(evidence.level);
      expect(evidence.name, 'Evidence missing name').toBeTruthy();
      expect(evidence.description, 'Evidence missing description').toBeTruthy();
      if (evidence.verification) {
        expect(typeof evidence.verification).toBe('object');
      }
    }
  });

  it('has a diffusion trace for each agent', async () => {
    const orch = new MultiAgentOrchestrator({
      simulationFirst: true,
      githubToken: 'test-token',
      repoOwner: 'test-owner',
      repoName: 'test-repo',
    });
    const result = await orch.orchestrate('test', 'test');

    expect(result.diffusionTrace.length).toBeGreaterThan(0);
    for (const trace of result.diffusionTrace) {
      expect(trace.agent, 'Trace missing agent').toBeTruthy();
      expect(['L1', 'L2', 'L3', 'L4', 'L5']).toContain(trace.level);
      expect(Array.isArray(trace.diffusionSteps), 'Missing diffusionSteps').toBe(true);
    }
  });
});
