/**
 * Live end-to-end Ising solve over real HTTP (no mocked fetch/API response).
 *
 * A node:http server bridges requests to the actual Next.js route handler:
 * optimizeWithIsing → fetch → HTTP → auth/validation → solveQubo → Z3.
 * The server is loopback-only so CI remains hermetic while exercising the real
 * network/API contract used by the configured live solver path.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { buildQUBOMatrix, calculateQUBOEnergy, extractAssignmentFromQUBO } from '@/lib/dsg-one/qubo-builder';
import { optimizeWithIsing, IsingSolverError } from '@/lib/dsg-one/ising-optimizer';
import { verifyIsingWithZ3 } from '@/lib/dsg-one/ising-to-z3-verifier';
import { solveQubo } from '@/lib/dsg-one/ising-solver-core';
import { POST, GET } from '@/app/api/dsg-one/ising/solve/route';
import type { Task, AgentCapacity } from '@/lib/dsg/multi-agent/types';

const SOLVER_KEY = 'test-solver-key-not-a-real-secret';

const tasks: Task[] = [
  {
    id: 'task-1', name: 'Payment', domain: 'financial', operation: 'transfer', target: 'acct-1',
    dataSensitivity: 'high', externalEffect: true, reversibility: 'reversible',
    userAuthorized: true, planAllowed: true, hasFreshEvidence: true, hasRollback: true,
  },
  {
    id: 'task-2', name: 'Audit', domain: 'compliance', operation: 'write', target: 'log',
    dataSensitivity: 'medium', externalEffect: false, reversibility: 'irreversible',
    userAuthorized: true, planAllowed: true, hasFreshEvidence: true, hasRollback: false,
  },
  {
    id: 'task-3', name: 'Policy', domain: 'policy', operation: 'update', target: 'policy-engine',
    dataSensitivity: 'high', externalEffect: true, reversibility: 'reversible',
    userAuthorized: true, planAllowed: true, hasFreshEvidence: true, hasRollback: true,
  },
];

const agents: AgentCapacity[] = [
  { agentId: 1, maxConcurrentTasks: 2, maxTotalTasks: 2, resourceAvailable: { cpu: 4, memory: 8 } },
  { agentId: 2, maxConcurrentTasks: 2, maxTotalTasks: 1, resourceAvailable: { cpu: 2, memory: 4 } },
];

function startSolverServer(): Promise<{ server: Server; url: string }> {
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks);
        const request = new Request(`http://127.0.0.1${req.url ?? '/'}`, {
          method: req.method ?? 'GET',
          headers: Object.entries(req.headers).flatMap(([key, value]) =>
            typeof value === 'string' ? [[key, value] as [string, string]] : [],
          ),
          body: req.method === 'POST' ? body : undefined,
        });
        const response = req.method === 'POST' ? await POST(request) : await GET();
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : String(error));
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}/api/dsg-one/ising/solve` });
    });
  });
}

describe('Live Ising solve over real HTTP', () => {
  let server: Server;
  let solverUrl: string;

  beforeAll(async () => {
    ({ server, url: solverUrl } = await startSolverServer());
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  afterEach(() => vi.unstubAllEnvs());

  function stubLiveEnv(apiKey = SOLVER_KEY) {
    vi.stubEnv('DSG_ISING_SOLVER_KEY', SOLVER_KEY);
    vi.stubEnv('NVIDIA_ISING_API_URL', solverUrl);
    vi.stubEnv('NVIDIA_ISING_API_KEY', apiKey);
  }

  it('completes a real HTTP solve and passes Z3 verification', async () => {
    stubLiveEnv();
    const { qubo } = await buildQUBOMatrix({ tasks, agentCapacities: agents });

    const result = await optimizeWithIsing({
      problemId: 'live-e2e-1',
      quboMatrix: qubo,
      solverMode: 'live',
      fallbackToLocal: false,
      seed: 7,
    });

    expect(result.mode).toBe('live');
    expect(result.solverVersion).toBe('ising-live-dsg-anneal-v1');
    expect(result.proofData.quboHash).toBe(qubo.problemHash);
    expect(result.proofData.solutionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.energy).toBe(calculateQUBOEnergy(qubo, result.solution));

    const assignment = extractAssignmentFromQUBO(qubo, result.solution);
    expect(Object.keys(assignment).sort()).toEqual(tasks.map((task) => task.id).sort());

    const verification = await verifyIsingWithZ3({
      isingAssignment: result.solution,
      quboMatrix: qubo,
      tasks,
      agentCapacities: agents,
    });
    expect(verification.isValid).toBe(true);
    expect(verification.isSAT).toBe('sat');
  });

  it('same QUBO and seed gives the same result through real HTTP', async () => {
    stubLiveEnv();
    const { qubo } = await buildQUBOMatrix({ tasks, agentCapacities: agents });
    const request = {
      problemId: 'live-det',
      quboMatrix: qubo,
      solverMode: 'live' as const,
      fallbackToLocal: false,
      seed: 42,
    };

    const first = await optimizeWithIsing(request);
    const second = await optimizeWithIsing(request);
    expect(second.solution).toEqual(first.solution);
    expect(second.energy).toBe(first.energy);
    expect(second.proofData.solutionHash).toBe(first.proofData.solutionHash);
  });

  it('wrong bearer key fails closed by default', async () => {
    stubLiveEnv('wrong-key');
    const { qubo } = await buildQUBOMatrix({ tasks, agentCapacities: agents });

    await expect(optimizeWithIsing({
      problemId: 'live-auth-fail',
      quboMatrix: qubo,
      solverMode: 'live',
    })).rejects.toBeInstanceOf(IsingSolverError);
  });

  it('explicit fallback uses the real deterministic local solver and records it', async () => {
    stubLiveEnv('wrong-key');
    const { qubo } = await buildQUBOMatrix({ tasks, agentCapacities: agents });

    const result = await optimizeWithIsing({
      problemId: 'live-auth-fallback',
      quboMatrix: qubo,
      solverMode: 'live',
      fallbackToLocal: true,
      seed: 9,
    });
    const local = await optimizeWithIsing({
      problemId: 'local-reference',
      quboMatrix: qubo,
      solverMode: 'local',
      seed: 9,
    });

    expect(result.mode).toBe('live-fallback-local');
    expect(result.fallbackReason).toContain('401');
    expect(result.solution).toEqual(local.solution);
    expect(result.proofData.solutionHash).toBe(local.proofData.solutionHash);
  });
});

describe('/api/dsg-one/ising/solve route handler', () => {
  afterEach(() => vi.unstubAllEnvs());

  function solveRequest(body: unknown, key?: string): Request {
    return new Request('http://localhost/api/dsg-one/ising/solve', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key ? { authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  it('fails closed when the solver key is not configured', async () => {
    expect((await POST(solveRequest({}, 'any'))).status).toBe(503);
  });

  it('rejects missing or wrong bearer credentials', async () => {
    vi.stubEnv('DSG_ISING_SOLVER_KEY', SOLVER_KEY);
    expect((await POST(solveRequest({ numVariables: 1 }))).status).toBe(401);
    expect((await POST(solveRequest({ numVariables: 1 }, 'wrong'))).status).toBe(401);
  });

  it('solves a real trivial QUBO', async () => {
    vi.stubEnv('DSG_ISING_SOLVER_KEY', SOLVER_KEY);
    const response = await POST(solveRequest(
      { numVariables: 2, Q: [[0, 0], [0, 0]], linear: [-2, 1], seed: 3 },
      SOLVER_KEY,
    ));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.solution).toEqual([1, 0]);
    expect(body.energy).toBe(-2);
    expect(body.version).toBe('dsg-anneal-v1');
  });

  it('health probe exposes readiness but not the configured secret', async () => {
    let response = await GET();
    let body = await response.json();
    expect(body.status).toBe('misconfigured');

    vi.stubEnv('DSG_ISING_SOLVER_KEY', SOLVER_KEY);
    response = await GET();
    body = await response.json();
    expect(body.status).toBe('ready');
    expect(JSON.stringify(body)).not.toContain(SOLVER_KEY);
  });
});

describe('ising-solver-core determinism', () => {
  it('is a pure function of QUBO plus seed', () => {
    const input = {
      Q: [[2, -1, 0], [-1, 2, -1], [0, -1, 2]],
      linear: [-1, -1, -1],
      numVariables: 3,
      seed: 99,
    };
    const first = solveQubo(input);
    const second = solveQubo(input);
    expect(second.solution).toEqual(first.solution);
    expect(second.energy).toBe(first.energy);
    expect(second.evaluations).toBe(first.evaluations);
  });
});
