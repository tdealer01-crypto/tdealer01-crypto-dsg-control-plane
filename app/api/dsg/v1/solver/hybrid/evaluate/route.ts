import { NextResponse } from 'next/server';
import { solveHybrid, analyzeProblemDebug } from '../../../../../../../lib/ising/hybrid-solver';
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
 * Hybrid Solver Gate Evaluation Endpoint
 *
 * POST /api/dsg/v1/solver/hybrid/evaluate
 *
 * Intelligently selects between Z3 and Ising solvers based on problem characteristics:
 * - Z3: Complex logic, exact proofs, small problems
 * - Ising: Many variables, fast decision, soft constraints
 * - Parallel: Both solvers racing, fastest wins
 *
 * Query params:
 * - forceParallel=true: Always use both solvers in parallel
 * - debug=true: Include problem analysis in response
 */

interface HybridEvaluateRequest {
  planId?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  context?: Record<string, unknown>;
  nonce: string;
  idempotencyKey: string;
}

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const startMs = Date.now();

  // ── Query params ──────────────────────────────────────────────────────────
  const url = new URL(request.url);
  const forceParallel = url.searchParams.get('forceParallel') === 'true';
  const debug = url.searchParams.get('debug') === 'true';

  // ── Rate limit ────────────────────────────────────────────────────────────
  const rateLimitResult = await applyRateLimit({
    key: getRateLimitKey(request, `dsg-hybrid:${caller.orgId}`),
    limit: 100,
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

  const req = body.value as HybridEvaluateRequest;

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
    // ── Build proof request with required fields ────────────────────────────
    const proofRequest: DeterministicProofRequest = {
      planId: req.planId,
      riskLevel: req.riskLevel ?? 'medium',
      context: req.context ?? {},
      nonce: req.nonce,
      idempotencyKey: req.idempotencyKey,
    };

    // ── Analyze problem ───────────────────────────────────────────────────
    const problemAnalysis = debug ? await analyzeProblemDebug(proofRequest) : null;

    // ── Solve with hybrid strategy ────────────────────────────────────────
    const result = await solveHybrid(proofRequest, forceParallel);

    // ── Record usage ──────────────────────────────────────────────────────
    await recordGateEvaluation(caller.orgId, {
      solver: result.selected === 'z3' ? 'hybrid-z3' : 'hybrid-ising',
      decision: result.decision.gateStatus,
      riskLevel: req.riskLevel ?? 'medium',
    });

    // ── Response ──────────────────────────────────────────────────────────
    const responseBody: any = {
      ok: result.decision.ok,
      gateStatus: result.decision.gateStatus,
      riskLevel: req.riskLevel ?? 'medium',
      reason: result.decision.reason,
      solver_selected: result.selected,
      solver_strategy: result.solver,
      timestamp: new Date().toISOString(),
      responseTime_ms: Date.now() - startMs,
    };

    // Include solver results if available
    if (result.z3_result) {
      responseBody.z3 = {
        ok: result.z3_result.ok,
        gateStatus: result.z3_result.gateStatus,
        time_ms: result.z3_result.time_ms,
        error: result.z3_result.error,
      };
    }

    if (result.ising_result) {
      responseBody.ising = {
        ok: result.ising_result.ok,
        gateStatus: result.ising_result.gateStatus,
        time_ms: result.ising_result.time_ms,
        error: result.ising_result.error,
      };
    }

    // Include problem analysis if debug requested
    if (problemAnalysis) {
      responseBody.analysis = {
        variables: problemAnalysis.characteristics.numVariables,
        constraints: problemAnalysis.characteristics.numConstraints,
        hard_constraint_ratio: problemAnalysis.characteristics.hardConstraintRatio,
        criticality_ratio: problemAnalysis.characteristics.criticalityRatio,
        avg_constraint_arity: problemAnalysis.characteristics.avgConstraintArity,
        has_complex_logic: problemAnalysis.characteristics.hasComplexLogic,
        recommended_solver: problemAnalysis.recommendedSolver,
        reasoning: problemAnalysis.reasoning,
      };
    }

    const response = NextResponse.json(responseBody);

    response.headers.set('X-Solver-Strategy', result.solver);
    response.headers.set('X-Solver-Selected', result.selected);
    response.headers.set('X-Response-Time', String(Date.now() - startMs));
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error('Hybrid solver error:', error);
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
