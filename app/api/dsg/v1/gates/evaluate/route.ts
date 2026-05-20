import { NextResponse } from 'next/server';
import { evaluateDeterministicGate } from '../../../../../../lib/dsg/deterministic/gate-engine';
import { validateDeterministicProofRequest } from '../../../../../../lib/dsg/deterministic/request-validation';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../../../lib/security/rate-limit';
import { readJsonBody } from '../../../../../../lib/security/request-json';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rateLimitResult = await applyRateLimit({
    key: getRateLimitKey(request, 'dsg-gate'),
    limit: 60,
    windowMs: 60_000,
  });
  const rateLimitHeaders = buildRateLimitHeaders(rateLimitResult, 60);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limit_exceeded' },
      { status: 429, headers: rateLimitHeaders },
    );
  }

  const body = await readJsonBody(request, { maxBytes: 16_000 });
  if (!body.ok) {
    return NextResponse.json(
      { ok: false, error: body.error },
      { status: body.status, headers: rateLimitHeaders },
    );
  }

  const validated = validateDeterministicProofRequest(body.value);
  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, error: validated.error, details: validated.details ?? [] },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  const result = evaluateDeterministicGate(validated.value);

  return NextResponse.json(
    {
      ok: result.ok,
      type: 'dsg-deterministic-gate-decision',
      gateStatus: result.gateStatus,
      proofStatus: result.proofStatus,
      riskLevel: result.riskLevel,
      reason: result.reason ?? null,
      proof: result.proof,
      boundary: {
        statement: 'DSG-native deterministic gate adapter. UNSUPPORTED is never PASS. External Z3 solver is not invoked by this route.',
        externalSolverInvoked: false,
        productionReadyClaim: false,
      },
    },
    { headers: rateLimitHeaders },
  );
}
