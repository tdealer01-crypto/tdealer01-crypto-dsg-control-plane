import { NextResponse } from "next/server";
import { evaluateDeterministicGate } from "../../../../../../lib/dsg/deterministic/gate-engine";
import { validateDeterministicProofRequest } from "../../../../../../lib/dsg/deterministic/request-validation";
import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from "../../../../../../lib/security/rate-limit";
import { readJsonBody } from "../../../../../../lib/security/request-json";
import {
  requireDsgAuth,
  dsgAuthError,
  logDsgApiCall,
} from "../../../../../../lib/dsg/auth/require-dsg-auth";
import {
  checkGateEntitlement,
  recordGateEvaluation,
} from "../../../../../../lib/dsg/gate-entitlement";

export const dynamic = "force-dynamic";

function validationErrorCode(details: { field: string; message: string }[]) {
  if (
    details.some(
      (detail) => detail.field === "nonce" && detail.message === "required",
    )
  ) {
    return "missing_nonce";
  }
  if (
    details.some(
      (detail) =>
        detail.field === "idempotencyKey" && detail.message === "required",
    )
  ) {
    return "missing_idempotency_key";
  }
  return "validation_failed";
}

function usageFailure(error?: string) {
  const accessMode = error?.startsWith("delivery_blocked:")
    ? error.slice("delivery_blocked:".length)
    : "billing_unavailable";
  const requiresUpgrade =
    accessMode === "quota_exceeded" || accessMode === "subscription_inactive";

  return {
    status: requiresUpgrade ? 402 : 503,
    body: {
      ok: false,
      error: "usage_evidence_unavailable",
      accessMode,
      requiresUpgrade,
      message:
        requiresUpgrade
          ? "Execution result withheld because the current subscription does not authorize this usage slot."
          : "Execution result withheld because usage evidence could not be completed safely.",
      upgradeUrl: "/pricing#dsg-gate",
    },
  };
}

export async function POST(request: Request) {
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const startMs = Date.now();

  const rateLimitResult = await applyRateLimit({
    key: getRateLimitKey(request, `dsg-gate:${caller.orgId}`),
    limit: 60,
    windowMs: 60_000,
  });
  const rateLimitHeaders = buildRateLimitHeaders(rateLimitResult, 60);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limit_exceeded" },
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

  const validated = validateDeterministicProofRequest(body.value);
  if (!validated.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: validationErrorCode(validated.details ?? []),
        details: validated.details ?? [],
      },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  const result = await evaluateDeterministicGate(validated.value, {
    orgId: caller.orgId,
    verifyFresh: false,
    recordResult: true,
  });
  const durationMs = Date.now() - startMs;

  const usage = await recordGateEvaluation(
    validated.value.idempotencyKey,
    caller.orgId,
    "gates/evaluate",
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

  const response = NextResponse.json(
    {
      ok: result.ok,
      type: "dsg-deterministic-gate-decision",
      gateStatus: result.gateStatus,
      proofStatus: result.proofStatus,
      riskLevel: result.riskLevel,
      reason: result.reason ?? null,
      proof: result.proof,
      entitlement: {
        tier: entitlement.tier,
        evalsRemaining: entitlement.evalsRemaining,
        accessMode: entitlement.accessMode,
      },
      caller: { orgId: caller.orgId, actorType: caller.actorType },
      boundary: {
        statement:
          "DSG-native deterministic gate adapter. UNSUPPORTED is never PASS. productionReadyClaim follows the passing proof evidence for this request.",
        externalSolverInvoked:
          result.proof.evidenceBoundary.externalSolverInvoked,
        productionReadyClaim:
          result.ok && result.proof.evidenceBoundary.productionReadyClaim,
      },
    },
    { headers: rateLimitHeaders },
  );

  void logDsgApiCall({
    orgId: caller.orgId,
    actorType: caller.actorType,
    apiKeyId: caller.actorType === "api_key" ? caller.apiKeyId : undefined,
    userId: caller.actorType === "user" ? caller.userId : undefined,
    route: "gates/evaluate",
    statusCode: 200,
    gateStatus: result.gateStatus,
    proofId: result.proof.proofId,
    proofSource: result.source,
    durationMs,
  });

  return response;
}
