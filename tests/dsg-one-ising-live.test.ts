/**
 * Live Ising solver mode tests (mocked fetch — no real network).
 *
 * Verifies:
 * 1. Mode selection: mock default, env opt-in, explicit useMock=false
 * 2. Live call contract: URL, auth header, payload shape
 * 3. Response normalization + validation (array and object forms)
 * 4. Local energy recomputation (remote energy is never trusted)
 * 5. Fallback to deterministic mock on transient failures
 * 6. IsingConfigError / IsingSolverError behavior
 * 7. Real SHA-256 proof hashes
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildQUBOMatrix, calculateQUBOEnergy } from '@/lib/dsg-one/qubo-builder';
import {
  optimizeWithIsing,
  resolveIsingLiveConfig,
  IsingConfigError,
  IsingSolverError,
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Live Ising solver mode', () => {
  describe('mode selection', () => {
    it('defaults to mock when useMock is unset and no env opt-in', async () => {
      const qubo = await buildQubo();
      const result = await optimizeWithIsing({ problemId: 'p1', quboMatrix: qubo });

      expect(result.mode).toBe('mock');
      expect(result.solverVersion).toBe('ising-mock-v1');
    });

    it('stays mock when NVIDIA_ISING_MODE=live but endpoint is not configured', async () => {
      vi.stubEnv('NVIDIA_ISING_MODE', 'live');
      const qubo = await buildQubo();
      const result = await optimizeWithIsing({ problemId: 'p1', quboMatrix: qubo });

      expect(result.mode).toBe('mock');
    });

    it('uses live solver when NVIDIA_ISING_MODE=live and endpoint configured', async () => {
      vi.stubEnv('NVIDIA_ISING_MODE', 'live');
      vi.stubEnv('NVIDIA_ISING_API_URL', 'https://solver.example.test/solve');
      const qubo = await buildQubo();
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ solution: Array(qubo.numVariables).fill(0), version: 'v9' }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const result = await optimizeWithIsing({ problemId: 'p1', quboMatrix: qubo });

      expect(result.mode).toBe('live');
      expect(result.solverVersion).toBe('ising-live-v9');
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('useMock=true always wins over env opt-in', async () => {
      vi.stubEnv('NVIDIA_ISING_MODE', 'live');
      vi.stubEnv('NVIDIA_ISING_API_URL', 'https://solver.example.test/solve');
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const qubo = await buildQubo();
      const result = await optimizeWithIsing({
        problemId: 'p1',
        quboMatrix: qubo,
        useMock: true,
      });

      expect(result.mode).toBe('mock');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws IsingConfigError when useMock=false without endpoint', async () => {
      const qubo = await buildQubo();
      await expect(
        optimizeWithIsing({ problemId: 'p1', quboMatrix: qubo, useMock: false }),
      ).rejects.toBeInstanceOf(IsingConfigError);
    });
  });

  describe('live call contract', () => {
    it('POSTs QUBO payload with bearer auth to the configured URL', async () => {
      vi.stubEnv('NVIDIA_ISING_API_URL', 'https://solver.example.test/solve');
      vi.stubEnv('NVIDIA_ISING_API_KEY', 'test-key-not-real');
      const qubo = await buildQubo();
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ solution: Array(qubo.numVariables).fill(1) }),
      );
      vi.stubGlobal('fetch', fetchMock);

      await optimizeWithIsing({
        problemId: 'p-contract',
        quboMatrix: qubo,
        useMock: false,
        seed: 42,
        timeout: 1234,
      });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://solver.example.test/solve');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer test-key-not-real');
      const body = JSON.parse(init.body);
      expect(body.problemId).toBe('p-contract');
      expect(body.numVariables).toBe(qubo.numVariables);
      expect(body.seed).toBe(42);
      expect(body.timeoutMs).toBe(1234);
      expect(body.Q).toEqual(qubo.Q);
      expect(body.linear).toEqual(qubo.linear);
    });

    it('omits Authorization header when no API key is set', async () => {
      vi.stubEnv('NVIDIA_ISING_API_URL', 'https://solver.example.test/solve');
      const qubo = await buildQubo();
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ solution: Array(qubo.numVariables).fill(0) }),
      );
      vi.stubGlobal('fetch', fetchMock);

      await optimizeWithIsing({ problemId: 'p1', quboMatrix: qubo, useMock: false });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers.Authorization).toBeUndefined();
    });
  });

  describe('response normalization', () => {
    it('accepts object-form solutions and coerces booleans to 0/1', async () => {
      vi.stubEnv('NVIDIA_ISING_API_URL', 'https://solver.example.test/solve');
      const qubo = await buildQubo();
      const objectSolution: Record<string, boolean> = {};
      for (const v of qubo.variables) objectSolution[v.id] = true;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ solution: objectSolution })),
      );

      const result = await optimizeWithIsing({
        problemId: 'p1',
        quboMatrix: qubo,
        useMock: false,
      });

      for (const v of qubo.variables) {
        expect(result.solution[v.id]).toBe(1);
      }
    });

    it('recomputes energy locally and ignores remote energy', async () => {
      vi.stubEnv('NVIDIA_ISING_API_URL', 'https://solver.example.test/solve');
      const qubo = await buildQubo();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          jsonResponse({
            solution: Array(qubo.numVariables).fill(0),
            energy: -999999, // hostile/misreported value must be ignored
          }),
        ),
      );

      const result = await optimizeWithIsing({
        problemId: 'p1',
        quboMatrix: qubo,
        useMock: false,
      });

      const expected = calculateQUBOEnergy(qubo, result.solution);
      expect(result.energy).toBe(expected);
      expect(result.energy).not.toBe(-999999);
    });

    it('produces a real sha256 solution hash (64 hex chars)', async () => {
      vi.stubEnv('NVIDIA_ISING_API_URL', 'https://solver.example.test/solve');
      const qubo = await buildQubo();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          jsonResponse({ solution: Array(qubo.numVariables).fill(0) }),
        ),
      );

      const result = await optimizeWithIsing({
        problemId: 'p1',
        quboMatrix: qubo,
        useMock: false,
      });

      expect(result.proofData.solutionHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('failure handling', () => {
    it('falls back to deterministic mock on HTTP error by default', async () => {
      vi.stubEnv('NVIDIA_ISING_API_URL', 'https://solver.example.test/solve');
      const qubo = await buildQubo();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ error: 'boom' }, 503)),
      );

      const live = await optimizeWithIsing({
        problemId: 'p1',
        quboMatrix: qubo,
        useMock: false,
      });
      const mock = await optimizeWithIsing({
        problemId: 'p1',
        quboMatrix: qubo,
        useMock: true,
      });

      expect(live.mode).toBe('live-fallback-mock');
      expect(live.fallbackReason).toContain('503');
      expect(live.solution).toEqual(mock.solution);
      expect(live.proofData.solutionHash).toBe(mock.proofData.solutionHash);
    });

    it('falls back when solver returns wrong variable count', async () => {
      vi.stubEnv('NVIDIA_ISING_API_URL', 'https://solver.example.test/solve');
      const qubo = await buildQubo();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ solution: [0] })),
      );

      const result = await optimizeWithIsing({
        problemId: 'p1',
        quboMatrix: qubo,
        useMock: false,
      });

      expect(result.mode).toBe('live-fallback-mock');
      expect(result.fallbackReason).toContain('variables');
    });

    it('falls back when solver returns non-binary values', async () => {
      vi.stubEnv('NVIDIA_ISING_API_URL', 'https://solver.example.test/solve');
      const qubo = await buildQubo();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          jsonResponse({ solution: Array(qubo.numVariables).fill(0.5) }),
        ),
      );

      const result = await optimizeWithIsing({
        problemId: 'p1',
        quboMatrix: qubo,
        useMock: false,
      });

      expect(result.mode).toBe('live-fallback-mock');
      expect(result.fallbackReason).toContain('non-binary');
    });

    it('throws IsingSolverError when fallbackToMock=false', async () => {
      vi.stubEnv('NVIDIA_ISING_API_URL', 'https://solver.example.test/solve');
      const qubo = await buildQubo();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ error: 'boom' }, 500)),
      );

      await expect(
        optimizeWithIsing({
          problemId: 'p1',
          quboMatrix: qubo,
          useMock: false,
          fallbackToMock: false,
        }),
      ).rejects.toBeInstanceOf(IsingSolverError);
    });

    it('falls back on network failure', async () => {
      vi.stubEnv('NVIDIA_ISING_API_URL', 'https://solver.example.test/solve');
      const qubo = await buildQubo();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new TypeError('fetch failed')),
      );

      const result = await optimizeWithIsing({
        problemId: 'p1',
        quboMatrix: qubo,
        useMock: false,
      });

      expect(result.mode).toBe('live-fallback-mock');
      expect(result.fallbackReason).toContain('fetch failed');
    });
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
