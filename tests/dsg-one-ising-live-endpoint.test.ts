/**
 * Live end-to-end Ising solve over real HTTP (no mocked fetch).
 *
 * A real node:http server bridges incoming requests to the actual
 * /api/dsg-one/ising/solve route handler, and optimizeWithIsing (live mode)
 * calls it through the network stack. This exercises the full path:
 *
 *   optimizeWithIsing → fetch → HTTP → route auth/validation → solveQubo
 *
 * plus Z3 verification of the live result. Hermetic: 127.0.0.1 only.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { buildQUBOMatrix, calculateQUBOEnergy, extractAssignmentFromQUBO } from '@/lib/dsg-one/qubo-builder';
import { optimizeWithIsing } from '@/lib/dsg-one/ising-optimizer';
import { verifyIsingWithZ3 } from '@/lib/dsg-one/ising-to-z3-verifier';
import { solveQubo } from '@/lib/dsg-one/ising-solver-core';
import { POST, GET } from '@/app/api/dsg-one/ising/solve/route';
import type { Task, AgentCapacity } from '@/lib/dsg/multi-agent/types';

const SOLVER_KEY = 'test-solver-key-not-a-real-secret';

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
  {
    id: 'task-3',
    name: 'Policy',
    domain: 'policy',
    operation: 'update',
    target: 'policy-engine',
    dataSensitivity: 'high',
    externalEffect: true,
    reversibility: 'reversible',
    userAuthorized: true,
    planAllowed: true,
    hasFreshEvidence: true,
    hasRollback: true,
  },
];

// Capacities sum to exactly the task count (2 + 1 = 3 tasks) so the fully
// feasible assignment is the unique QUBO optimum (total penalty 0). With
// slack capacity the capacity term μ(Σ−cap)² makes some infeasible states
// tie with feasible ones — that degeneracy is what the Z3 verification
// layer exists to catch, but for this happy-path E2E we want a problem the
// solver can provably win.
const agents: AgentCapacity[] = [
  { agentId: 1, maxConcurrentTasks: 2, maxTotalTasks: 2, resourceAvailable: { cpu: 4, memory: 8 } },
  { agentId: 2, maxConcurrentTasks: 2, maxTotalTasks: 1, resourceAvailable: { cpu: 2, memory: 4 } },
];

/** Bridge a node:http request to the actual Next.js route handler. */
function startSolverServer(): Promise<{ server: Server; url: string }> {
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      const body = Buffer.concat(chunks);
      const request = new Request(`http://127.0.0.1${req.url ?? '/'}`, {
        method: req.method ?? 'GET',
        headers: Object.entries(req.headers).flatMap(([k, v]) =>
          typeof v === 'string' ? [[k, v] as [string, string]] : [],
        ),
        body: req.method === 'POST' ? body : undefined,
      });
      const response = req.method === 'POST' ? await POST(request) : await GET();
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await response.arrayBuffer()));
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

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function stubLiveEnv() {
    vi.stubEnv('DSG_ISING_SOLVER_KEY', SOLVER_KEY);
    vi.stubEnv('NVIDIA_ISING_API_URL', solverUrl);
    vi.stubEnv('NVIDIA_ISING_API_KEY', SOLVER_KEY);
  }

  it('completes a real live solve end-to-end and passes Z3 verification', async () => {
    stubLiveEnv();
    const { qubo } = await buildQUBOMatrix({ tasks, agentCapacities: agents });

    const result = await optimizeWithIsing({
      problemId: 'live-e2e-1',
      quboMatrix: qubo,
      useMock: false,
      fallbackToMock: false, // a real failure must fail the test, not hide in fallback
      seed: 7,
    });

    expect(result.mode).toBe('live');
    expect(result.solverVersion).toBe('ising-live-dsg-anneal-v1');
    expect(result.proofData.quboHash).toBe(qubo.problemHash);
    expect(result.proofData.solutionHash).toMatch(/^[a-f0-9]{64}$/);

    // Solution must be a feasible task assignment (each task → exactly 1 agent).
    const assignment = extractAssignmentFromQUBO(qubo, result.solution);
    expect(Object.keys(assignment).sort()).toEqual(tasks.map((t) => t.id).sort());

    // Z3-verify the live result, same as the governed pipeline would.
    const verification = await verifyIsingWithZ3({
      isingAssignment: result.solution,
      quboMatrix: qubo,
      tasks,
      agentCapacities: agents,
    });
    expect(verification.isValid).toBe(true);
    expect(verification.isSAT).toBe('sat');
  });

  it('live solve is deterministic: same QUBO + seed → same solution hash', async () => {
    stubLiveEnv();
    const { qubo } = await buildQUBOMatrix({ tasks, agentCapacities: agents });

    const r1 = await optimizeWithIsing({
      problemId: 'live-det',
      quboMatrix: qubo,
      useMock: false,
      fallbackToMock: false,
      seed: 42,
    });
    const r2 = await optimizeWithIsing({
      problemId: 'live-det',
      quboMatrix: qubo,
      useMock: false,
      fallbackToMock: false,
      seed: 42,
    });

    expect(r1.solution).toEqual(r2.solution);
    expect(r1.energy).toBe(r2.energy);
    expect(r1.proofData.solutionHash).toBe(r2.proofData.solutionHash);
  });

  it('live solve energy is never worse than the greedy mock', async () => {
    stubLiveEnv();
    const { qubo } = await buildQUBOMatrix({ tasks, agentCapacities: agents });

    const live = await optimizeWithIsing({
      problemId: 'live-vs-mock',
      quboMatrix: qubo,
      useMock: false,
      fallbackToMock: false,
      seed: 1,
    });
    const mock = await optimizeWithIsing({
      problemId: 'live-vs-mock',
      quboMatrix: qubo,
      useMock: true,
    });

    expect(live.energy).toBeLessThanOrEqual(mock.energy);
  });

  it('wrong bearer key falls back to mock (fail-safe) and flags the fallback', async () => {
    vi.stubEnv('DSG_ISING_SOLVER_KEY', SOLVER_KEY);
    vi.stubEnv('NVIDIA_ISING_API_URL', solverUrl);
    vi.stubEnv('NVIDIA_ISING_API_KEY', 'wrong-key');
    const { qubo } = await buildQUBOMatrix({ tasks, agentCapacities: agents });

    const result = await optimizeWithIsing({
      problemId: 'live-auth-fail',
      quboMatrix: qubo,
      useMock: false,
    });

    expect(result.mode).toBe('live-fallback-mock');
    expect(result.fallbackReason).toContain('401');
  });
});

describe('/api/dsg-one/ising/solve route handler', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  it('fails closed with 503 when DSG_ISING_SOLVER_KEY is not configured', async () => {
    const res = await POST(solveRequest({}, 'any'));
    expect(res.status).toBe(503);
  });

  it('rejects missing/wrong bearer token with 401', async () => {
    vi.stubEnv('DSG_ISING_SOLVER_KEY', SOLVER_KEY);
    expect((await POST(solveRequest({ numVariables: 1 }))).status).toBe(401);
    expect((await POST(solveRequest({ numVariables: 1 }, 'wrong'))).status).toBe(401);
  });

  it('validates numVariables bounds and matrix shape', async () => {
    vi.stubEnv('DSG_ISING_SOLVER_KEY', SOLVER_KEY);

    expect((await POST(solveRequest({ numVariables: 0 }, SOLVER_KEY))).status).toBe(400);
    expect((await POST(solveRequest({ numVariables: 257 }, SOLVER_KEY))).status).toBe(400);
    expect(
      (
        await POST(
          solveRequest({ numVariables: 2, Q: [[0, 0]], linear: [0, 0] }, SOLVER_KEY),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          solveRequest(
            { numVariables: 2, Q: [[0, 0], [0, 0]], linear: [0, 'x'] },
            SOLVER_KEY,
          ),
        )
      ).status,
    ).toBe(400);
  });

  it('solves a trivial QUBO correctly', async () => {
    vi.stubEnv('DSG_ISING_SOLVER_KEY', SOLVER_KEY);
    // E = -2·x0 + 1·x1 → optimum x = [1, 0], energy -2
    const res = await POST(
      solveRequest(
        { numVariables: 2, Q: [[0, 0], [0, 0]], linear: [-2, 1], seed: 3 },
        SOLVER_KEY,
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.solution).toEqual([1, 0]);
    expect(body.energy).toBe(-2);
    expect(body.version).toBe('dsg-anneal-v1');
  });

  it('GET health probe reports ready/misconfigured without secrets', async () => {
    let res = await GET();
    let body = await res.json();
    expect(body.service).toBe('dsg-ising-solver');
    expect(body.status).toBe('misconfigured');

    vi.stubEnv('DSG_ISING_SOLVER_KEY', SOLVER_KEY);
    res = await GET();
    body = await res.json();
    expect(body.status).toBe('ready');
    expect(JSON.stringify(body)).not.toContain(SOLVER_KEY);
  });
});

describe('ising-solver-core determinism and quality', () => {
  it('is a pure function of (Q, linear, seed)', () => {
    const input = {
      Q: [
        [2, -1, 0],
        [-1, 2, -1],
        [0, -1, 2],
      ],
      linear: [-1, -1, -1],
      numVariables: 3,
      seed: 99,
    };
    const a = solveQubo(input);
    const b = solveQubo(input);
    expect(a.solution).toEqual(b.solution);
    expect(a.energy).toBe(b.energy);
    expect(a.evaluations).toBe(b.evaluations);
  });

  it('reaches the optimum on a QUBO the greedy mock solves suboptimally', async () => {
    // Greedy sequential sets x0=1 first (linear -1), blocking the better
    // pair {x1, x2}: E(x0)= -1, E(x1,x2) = -3 -3 + 2·2 = -2 with coupling +2·2?
    // Construct: linear = [-1, -3, -3], Q[1][2]=Q[2][1]=1, Q[0][1]=Q[1][0]=5,
    // Q[0][2]=Q[2][0]=5 → optimum is x=[0,1,1] with E=-3-3+2=-4.
    const input = {
      Q: [
        [0, 5, 5],
        [5, 0, 1],
        [5, 1, 0],
      ],
      linear: [-1, -3, -3],
      numVariables: 3,
      seed: 0,
    };
    const result = solveQubo(input);
    expect(result.solution).toEqual([0, 1, 1]);
    expect(result.energy).toBe(-4);
  });

  it('produces feasible assignments verified against local energy recomputation', async () => {
    const { qubo } = await buildQUBOMatrix({ tasks, agentCapacities: agents });
    const result = solveQubo({
      Q: qubo.Q,
      linear: qubo.linear,
      numVariables: qubo.numVariables,
      seed: 5,
    });

    const solution: Record<string, number> = {};
    qubo.variables.forEach((v, i) => {
      solution[v.id] = result.solution[i];
    });

    // Core reports energy without the constant term; add it for comparison.
    expect(result.energy + qubo.constant).toBeCloseTo(
      calculateQUBOEnergy(qubo, solution),
      8,
    );
  });
});
