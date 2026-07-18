import { NextResponse } from 'next/server';
import { evaluateGateWithIsingSolver } from '../../../../../../../lib/ising/gate-adapter';
import { getDeterministicPolicyManifest } from '../../../../../../../lib/dsg/deterministic/policy-manifest';
import type { DeterministicProofRequest } from '../../../../../../../lib/dsg/deterministic/types';
import { readJsonBody } from '../../../../../../../lib/security/request-json';
import {
  requireDsgAuth,
  dsgAuthError,
} from '../../../../../../../lib/dsg/auth/require-dsg-auth';
import {
  checkGateEntitlement,
  recordGateEvaluation,
} from '../../../../../../../lib/dsg/gate-entitlement';
import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from '../../../../../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Ising Solver Gate Evaluation Endpoint
 *
 * POST /api/dsg/v1/solver/ising/evaluate
 *
 * Evaluates deterministic gates using Ising model (Simulated Annealing)
 * instead of Z3 SMT solver. Useful for:
 * - Fast probabilistic constraint satisfaction
 * - Optimization problems on binary variables
 * - Resource-constrained environments
 *
 * Request:
 * {
 *   "planId": "string",
 *   "riskLevel": "low|medium|high",
 *   "context": { ... },
 *   "nonce": "string",
 *   "idempotencyKey": "string",
 *   "solverConfig": {
 *     "maxIterations": number,
 *     "initialTemperature": number,
 *     "coolingRate": number,
 *     "timeout_ms": number
 *   }
 * }
 */

interface IsingEvaluateRequest {
  planId?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  context?: Record<string, unknown>;
  nonce: string;
  idempotencyKey: string;
  solverConfig?: {
    maxIterations?: number;
    initialTemperature?: number;
    coolingRate?: number;
    timeout_ms?: number;
  };
}

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const startMs = Date.now();

  // ── Rate limit ────────────────────────────────────────────────────────────
  const rateLimitResult = await applyRateLimit({
    key: getRateLimitKey(request, `dsg-ising:${caller.orgId}`),
    limit: 100, // Higher limit for Ising (faster than Z3)
    windowMs: 60_000,
  });
  const rateLimitHeaders = buildRateLimitHeaders(rateLimitResult, 100);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limit_exceeded' },
      { status: 429, headers: rateLimitHeaders },
    );
  }

  // ── Entitlement ───────────────────────────────────────────────────────────
  const entitlement = await checkGateEntitlement(caller.orgId);
  if (!entitlement.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: entitlement.message,
        requiresUpgrade: true,
      },
      { status: 402, headers: rateLimitHeaders },
    );
  }

  // ── Parse request body ────────────────────────────────────────────────────
  const body = await readJsonBody(request, { maxBytes: 16_000 });
  if (!body.ok) {
    return NextResponse.json(
      { ok: false, error: body.error },
      { status: body.status, headers: rateLimitHeaders },
    );
  }

  const req = body.value as IsingEvaluateRequest;

  // ── Validation ────────────────────────────────────────────────────────────
  const errors: string[] = [];

  if (!req.nonce || typeof req.nonce !== 'string' || !req.nonce.trim()) {
    errors.push('nonce is required and must be a non-empty string');
  }

  if (
    !req.idempotencyKey ||
    typeof req.idempotencyKey !== 'string' ||
    !req.idempotencyKey.trim()
  ) {
    errors.push('idempotencyKey is required and must be a non-empty string');
  }

  if (errors.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: 'validation_failed',
        details: errors.map((msg) => ({ message: msg })),
      },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  try {
    // ── Get policy manifest and extract constraints ────────────────────────
    const manifest = getDeterministicPolicyManifest();
    const context = req.context ?? {};

    // Build constraints from manifest
    const constraints = manifest.constraints.map((constraint) => ({
      ...constraint,
      passed: context[constraint.evidenceKey] === true,
    }));

    // ── Build proof request with required fields ────────────────────────────
    const proofRequest: DeterministicProofRequest = {
      planId: req.planId,
      riskLevel: req.riskLevel ?? 'medium',
      context: req.context ?? {},
      nonce: req.nonce,
      idempotencyKey: req.idempotencyKey,
    };

    // ── Evaluate with Ising solver ────────────────────────────────────────
    const result = await evaluateGateWithIsingSolver(constraints, proofRequest, req.solverConfig);

    // ── Record usage ──────────────────────────────────────────────────────
    const evalId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    await recordGateEvaluation(
      evalId,
      caller.orgId,
      'gates/evaluate',
      result.gateStatus,
      Date.now() - startMs,
    );

    // ── Response ──────────────────────────────────────────────────────────
    const response = NextResponse.json({
      ok: result.ok,
      gateStatus: result.gateStatus,
      proofStatus: result.proofStatus,
      riskLevel: req.riskLevel ?? 'medium',
      reason: result.reason,
      proof: result.proof,
      solver: 'ising-sa',
      timestamp: new Date().toISOString(),
      responseTime_ms: Date.now() - startMs,
    });

    response.headers.set('X-Solver', 'ising-sa');
    response.headers.set('X-Response-Time', String(Date.now() - startMs));
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error('Ising solver error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'solver_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: rateLimitHeaders },
    );
  }
}
