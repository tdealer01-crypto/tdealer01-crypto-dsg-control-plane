import { NextResponse } from "next/server";
import { proveDeterministicPlan } from "../../../../../../lib/dsg/deterministic/proof-engine";
import type { DeterministicProofRequest } from "../../../../../../lib/dsg/deterministic/types";
import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from "../../../../../../lib/security/rate-limit";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const rateLimitResult = await applyRateLimit({
    key: getRateLimitKey(request, "dsg-proof"),
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

  const proof = proveDeterministicPlan({
    planId: body.planId,
    policyRef: body.policyRef,
    policyVersion: body.policyVersion,
    riskLevel: body.riskLevel,
    previousProofHash: body.previousProofHash,
    nonce,
    idempotencyKey,
    context: body.context,
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
