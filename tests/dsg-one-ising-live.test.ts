/**
 * Ising solver mode tests.
 *
 * Runtime has no synthetic/mock solver path. The deterministic in-process
 * solver is the default real solver; the live path is explicit and fails
 * closed unless the caller explicitly permits fallback to local.
 *
 * The real HTTP live path is exercised in dsg-one-ising-live-endpoint.test.ts.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildQUBOMatrix, calculateQUBOEnergy } from '@/lib/dsg-one/qubo-builder';
import {
  optimizeWithIsing,
  resolveIsingLiveConfig,
  IsingConfigError,
} from '@/lib/dsg-one/ising-optimizer';
import type { Task, AgentCapacity } from '@/lib/dsg/multi-agent/types';

const tasks: Task[] = [
  {
    id: 'task-1',
    name: 'Payment',
    domain: 'financial',
    operation: 'transfer',
    target: 'acct-1',
    dataSensitivity: 'high',
    externalEffect: true,
    reversibility: 'reversible',
    userAuthorized: true,
    planAllowed: true,
    hasFreshEvidence: true,
    hasRollback: true,
  },
  {
    id: 'task-2',
    name: 'Audit',
    domain: 'compliance',
    operation: 'write',
    target: 'log',
    dataSensitivity: 'medium',
    externalEffect: false,
    reversibility: 'irreversible',
    userAuthorized: true,
    planAllowed: true,
    hasFreshEvidence: true,
    hasRollback: false,
  },
];

const agents: AgentCapacity[] = [
  { agentId: 1, maxConcurrentTasks: 2, maxTotalTasks: 2, resourceAvailable: { cpu: 4, memory: 8 } },
];

async function buildQubo() {
  const result = await buildQUBOMatrix({ tasks, agentCapacities: agents });
  return result.qubo;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Ising solver mode', () => {
  it('defaults to the deterministic local solver', async () => {
    const qubo = await buildQubo();
    const result = await optimizeWithIsing({ problemId: 'p1', quboMatrix: qubo });

    expect(result.mode).toBe('local');
    expect(result.solverVersion).toBe('dsg-anneal-v1');
    expect(result.proofData.quboHash).toBe(qubo.problemHash);
    expect(result.proofData.solutionHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('does not select live mode from environment alone', async () => {
    vi.stubEnv('NVIDIA_ISING_MODE', 'live');
    vi.stubEnv('NVIDIA_ISING_API_URL', 'https://solver.example.invalid/solve');
    const qubo = await buildQubo();

    const result = await optimizeWithIsing({ problemId: 'p1', quboMatrix: qubo });
    expect(result.mode).toBe('local');
  });

  it('requires a configured endpoint for explicit live mode', async () => {
    const qubo = await buildQubo();
    await expect(
      optimizeWithIsing({ problemId: 'p1', quboMatrix: qubo, solverMode: 'live' }),
    ).rejects.toBeInstanceOf(IsingConfigError);
  });

  it('local mode is deterministic for the same QUBO and seed', async () => {
    const qubo = await buildQubo();
    const first = await optimizeWithIsing({
      problemId: 'deterministic-local',
      quboMatrix: qubo,
      solverMode: 'local',
      seed: 42,
    });
    const second = await optimizeWithIsing({
      problemId: 'deterministic-local',
      quboMatrix: qubo,
      solverMode: 'local',
      seed: 42,
    });

    expect(second.solution).toEqual(first.solution);
    expect(second.energy).toBe(first.energy);
    expect(second.proofData.solutionHash).toBe(first.proofData.solutionHash);
    expect(second.energy).toBe(calculateQUBOEnergy(qubo, second.solution));
    for (const value of Object.values(second.solution)) expect([0, 1]).toContain(value);
  });

  describe('config resolution', () => {
    it('returns null when NVIDIA_ISING_API_URL is unset or blank', () => {
      expect(resolveIsingLiveConfig()).toBeNull();
      vi.stubEnv('NVIDIA_ISING_API_URL', '   ');
      expect(resolveIsingLiveConfig()).toBeNull();
    });

    it('returns url and optional key when configured', () => {
      vi.stubEnv('NVIDIA_ISING_API_URL', 'https://solver.example.test/solve');
      expect(resolveIsingLiveConfig()).toEqual({
        url: 'https://solver.example.test/solve',
        apiKey: undefined,
      });

      vi.stubEnv('NVIDIA_ISING_API_KEY', 'k');
      expect(resolveIsingLiveConfig()).toEqual({
        url: 'https://solver.example.test/solve',
        apiKey: 'k',
      });
    });
  });
});
