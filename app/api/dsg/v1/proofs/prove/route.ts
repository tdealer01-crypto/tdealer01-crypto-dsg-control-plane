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

export async function POST(request: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────────
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

  // ── Entitlement check (metered billing gate) ─────────────────────────────
  const entitlement = await checkGateEntitlement(caller.orgId);
  if (!entitlement.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: entitlement.message,
        requiresUpgrade: true,
        tier: entitlement.tier,
        upgradeUrl: entitlement.upgradeUrl,
      },
      { status: 402, headers: rateLimitHeaders },
    );
  }

  const startMs = Date.now();

  const body = (await request
    .json()
    .catch(() => null)) as Partial<DeterministicProofRequest> | null;

  if (!body || !body.context || typeof body.context !== "object") {
    return NextResponse.json(
      { ok: false, error: "missing_context" },
      { status: 400 },
    );
  }

  const nonce = text(body.nonce) || text(request.headers.get("x-dsg-nonce"));
  const idempotencyKey =
    text(body.idempotencyKey) || text(request.headers.get("idempotency-key"));

  if (!nonce) {
    return NextResponse.json(
      { ok: false, error: "missing_nonce" },
      { status: 400 },
    );
  }

  if (!idempotencyKey) {
    return NextResponse.json(
      { ok: false, error: "missing_idempotency_key" },
      { status: 400 },
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

  // Usage recording for metered billing (fire-and-forget)
  void recordGateEvaluation(
    proof.proofId,
    caller.orgId,
    'proofs/prove',
    proof.status,
    Date.now() - startMs,
  );

  // Capture proof_verified event
  void captureEvent('proof_verified', {
    userId: caller.userId || 'unknown',
    organizationId: caller.orgId,
  }, {
    organization_id: caller.orgId,
    proof_status: proof.status,
    proof_hash: proof.proofHash || null,
    production_ready: proof.evidenceBoundary.productionReadyClaim,
    external_solver_invoked: proof.evidenceBoundary.externalSolverInvoked,
    verification_time_ms: Date.now() - startMs,
    verified_by_user_id: caller.userId || 'unknown',
  }).catch((error) => {
    console.error('[dsg-proof-verify] Failed to capture event:', error);
  });

  return NextResponse.json(
    {
      ok: proof.status === "PASS",
      type: "dsg-deterministic-proof",
      proof,
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
