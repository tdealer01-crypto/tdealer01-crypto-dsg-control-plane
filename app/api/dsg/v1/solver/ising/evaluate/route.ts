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

function usageFailure(error?: string) {
  const accessMode = error?.startsWith('delivery_blocked:')
    ? error.slice('delivery_blocked:'.length)
    : 'billing_unavailable';
  const requiresUpgrade =
    accessMode === 'quota_exceeded' || accessMode === 'subscription_inactive';

  return {
    status: requiresUpgrade ? 402 : 503,
    body: {
      ok: false,
      error: 'usage_evidence_unavailable',
      accessMode,
      requiresUpgrade,
      message:
        requiresUpgrade
          ? 'Solver result withheld because the current subscription does not authorize this usage slot.'
          : 'Solver result withheld because usage evidence could not be completed safely.',
      upgradeUrl: '/pricing#dsg-gate',
    },
  };
}

export async function POST(request: Request) {
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const startMs = Date.now();

  const rateLimitResult = await applyRateLimit({
    key: getRateLimitKey(request, `dsg-ising:${caller.orgId}`),
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

  const entitlement = await checkGateEntitlement(caller.orgId);
  if (!entitlement.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: entitlement.message,
        requiresUpgrade: entitlement.requiresPayment,
        tier: entitlement.tier,
        accessMode: entitlement.accessMode,
        upgradeUrl: entitlement.upgradeUrl,
      },
      {
        status: entitlement.requiresPayment ? 402 : 503,
        headers: rateLimitHeaders,
      },
    );
  }

  const body = await readJsonBody(request, { maxBytes: 16_000 });
  if (!body.ok) {
    return NextResponse.json(
      { ok: false, error: body.error },
      { status: body.status, headers: rateLimitHeaders },
    );
  }

  const req = body.value as IsingEvaluateRequest;
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
    const manifest = getDeterministicPolicyManifest();
    const context = req.context ?? {};
    const constraints = manifest.constraints.map((constraint) => ({
      ...constraint,
      passed: context[constraint.evidenceKey] === true,
    }));

    const proofRequest: DeterministicProofRequest = {
      planId: req.planId,
      riskLevel: req.riskLevel ?? 'medium',
      context: req.context ?? {},
      nonce: req.nonce,
      idempotencyKey: req.idempotencyKey,
    };

    const result = await evaluateGateWithIsingSolver(
      constraints,
      proofRequest,
      req.solverConfig,
    );
    const durationMs = Date.now() - startMs;

    const usage = await recordGateEvaluation(
      req.idempotencyKey.trim(),
      caller.orgId,
      'gates/evaluate',
      result.gateStatus,
      durationMs,
    );

    if (!usage.recorded) {
      const failure = usageFailure(usage.error);
      return NextResponse.json(failure.body, {
        status: failure.status,
        headers: rateLimitHeaders,
      });
    }

    const response = NextResponse.json({
      ok: result.ok,
      gateStatus: result.gateStatus,
      proofStatus: result.proofStatus,
      riskLevel: req.riskLevel ?? 'medium',
      reason: result.reason,
      proof: result.proof,
      solver: 'ising-sa',
      entitlement: {
        tier: entitlement.tier,
        evalsRemaining: entitlement.evalsRemaining,
        accessMode: entitlement.accessMode,
      },
      timestamp: new Date().toISOString(),
      responseTime_ms: durationMs,
    });

    response.headers.set('X-Solver', 'ising-sa');
    response.headers.set('X-Response-Time', String(durationMs));
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
      },
      { status: 500, headers: rateLimitHeaders },
    );
  }
}
