import { NextResponse } from "next/server";
import { proveDeterministicPlan } from "../../../../../../lib/dsg/deterministic/proof-engine";
import type { DeterministicProofRequest } from "../../../../../../lib/dsg/deterministic/types";
import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from "../../../../../../lib/security/rate-limit";
import { requireDsgAuth, dsgAuthError } from "../../../../../../lib/dsg/auth/require-dsg-auth";
import {
  checkGateEntitlement,
  recordGateEvaluation,
} from "../../../../../../lib/dsg/gate-entitlement";
import { captureEvent } from "../../../../../../lib/telemetry/capture-event";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
          ? "Proof withheld because the current subscription does not authorize this usage slot."
          : "Proof withheld because usage evidence could not be completed safely.",
      upgradeUrl: "/pricing#dsg-gate",
    },
  };
}

export async function POST(request: Request) {
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const rateLimitResult = await applyRateLimit({
    key: getRateLimitKey(request, `dsg-proof:${caller.orgId}`),
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

  const startMs = Date.now();

  const body = (await request
    .json()
    .catch(() => null)) as Partial<DeterministicProofRequest> | null;

  if (!body || !body.context || typeof body.context !== "object") {
    return NextResponse.json(
      { ok: false, error: "missing_context" },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  const nonce = text(body.nonce) || text(request.headers.get("x-dsg-nonce"));
  const idempotencyKey =
    text(body.idempotencyKey) || text(request.headers.get("idempotency-key"));

  if (!nonce) {
    return NextResponse.json(
      { ok: false, error: "missing_nonce" },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  if (!idempotencyKey) {
    return NextResponse.json(
      { ok: false, error: "missing_idempotency_key" },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  const proof = await proveDeterministicPlan({
    planId: body.planId,
    policyRef: body.policyRef,
    policyVersion: body.policyVersion,
    riskLevel: body.riskLevel,
    previousProofHash: body.previousProofHash,
    nonce,
    idempotencyKey,
    context: body.context,
  });
  const durationMs = Date.now() - startMs;

  const usage = await recordGateEvaluation(
    idempotencyKey,
    caller.orgId,
    "proofs/prove",
    proof.status,
    durationMs,
  );

  if (!usage.recorded) {
    const failure = usageFailure(usage.error);
    return NextResponse.json(failure.body, {
      status: failure.status,
      headers: rateLimitHeaders,
    });
  }

  void captureEvent(
    "proof_verified",
    {
      userId: caller.userId || "unknown",
      organizationId: caller.orgId,
    },
    {
      organization_id: caller.orgId,
      proof_status: proof.status,
      proof_hash: proof.proofHash || null,
      production_ready: proof.evidenceBoundary.productionReadyClaim,
      external_solver_invoked: proof.evidenceBoundary.externalSolverInvoked,
      verification_time_ms: durationMs,
      verified_by_user_id: caller.userId || "unknown",
    },
  ).catch((error) => {
    console.error("[dsg-proof-verify] Failed to capture event:", error);
  });

  return NextResponse.json(
    {
      ok: proof.status === "PASS",
      type: "dsg-deterministic-proof",
      proof,
      entitlement: {
        tier: entitlement.tier,
        evalsRemaining: entitlement.evalsRemaining,
        accessMode: entitlement.accessMode,
      },
      boundary: {
        statement:
          "DSG-native deterministic proof adapter. productionReadyClaim is true only when all policy constraints pass and replay-protection evidence is present for this request.",
        externalSolverInvoked: proof.evidenceBoundary.externalSolverInvoked,
        productionReadyClaim: proof.evidenceBoundary.productionReadyClaim,
      },
    },
    { headers: rateLimitHeaders },
  );
}
