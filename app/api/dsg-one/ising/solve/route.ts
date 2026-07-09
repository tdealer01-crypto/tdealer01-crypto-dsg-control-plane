/**
 * Self-hosted Ising/QUBO solver endpoint.
 *
 * POST /api/dsg-one/ising/solve
 * Implements the request/response contract expected by
 * lib/dsg-one/ising-optimizer.ts live mode, so a deployment of this app can
 * serve as its own NVIDIA_ISING_API_URL target (or as a solver for another
 * deployment) with no extra infrastructure.
 *
 * Auth (fail closed): requires Bearer DSG_ISING_SOLVER_KEY. When the env var
 * is not configured the route returns 503 — never anonymous compute.
 *
 * GET /api/dsg-one/ising/solve
 * Lightweight health/config probe (no solve, no secrets).
 */

import { NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/security/request-json';
import { solveQubo, ISING_SOLVER_VERSION } from '@/lib/dsg-one/ising-solver-core';

export const dynamic = 'force-dynamic';

const MAX_VARIABLES = 256;
const MAX_BODY_BYTES = 2_000_000; // QUBO matrix upload: 256² numbers fits well below this

type SolveRequestBody = {
  problemId?: unknown;
  Q?: unknown;
  linear?: unknown;
  numVariables?: unknown;
  seed?: unknown;
};

function isFiniteNumberArray(value: unknown, length: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((v) => typeof v === 'number' && Number.isFinite(v))
  );
}

export async function POST(request: Request) {
  const configuredKey = process.env.DSG_ISING_SOLVER_KEY;
  if (!configuredKey) {
    return NextResponse.json(
      { error: 'solver_not_configured' },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader !== `Bearer ${configuredKey}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = await readJsonBody<SolveRequestBody>(request, {
    maxBytes: MAX_BODY_BYTES,
  });
  if (!parsed.ok || parsed.value === null) {
    return NextResponse.json(
      { error: parsed.error ?? 'invalid_body' },
      { status: parsed.status },
    );
  }

  const body = parsed.value;

  const n = body.numVariables;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > MAX_VARIABLES) {
    return NextResponse.json(
      { error: `numVariables must be an integer between 1 and ${MAX_VARIABLES}` },
      { status: 400 },
    );
  }

  const Q = body.Q;
  if (!Array.isArray(Q) || Q.length !== n || !Q.every((row) => isFiniteNumberArray(row, n))) {
    return NextResponse.json(
      { error: 'Q must be an n×n matrix of finite numbers' },
      { status: 400 },
    );
  }

  if (!isFiniteNumberArray(body.linear, n)) {
    return NextResponse.json(
      { error: 'linear must be a length-n array of finite numbers' },
      { status: 400 },
    );
  }

  const seed =
    typeof body.seed === 'number' && Number.isFinite(body.seed) ? body.seed : 0;

  const startedAt = Date.now();
  const result = solveQubo({
    Q: Q as number[][],
    linear: body.linear,
    numVariables: n,
    seed,
  });

  return NextResponse.json({
    solution: result.solution,
    energy: result.energy,
    confidence: 0.9,
    version: result.version,
    evaluations: result.evaluations,
    solveTimeMs: Date.now() - startedAt,
    problemId: typeof body.problemId === 'string' ? body.problemId : undefined,
  });
}

export async function GET() {
  return NextResponse.json({
    service: 'dsg-ising-solver',
    version: ISING_SOLVER_VERSION,
    status: process.env.DSG_ISING_SOLVER_KEY ? 'ready' : 'misconfigured',
    maxVariables: MAX_VARIABLES,
  });
}
