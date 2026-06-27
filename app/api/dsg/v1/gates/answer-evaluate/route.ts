import { NextResponse } from "next/server";
import { evaluateAnswerGate } from "../../../../../../lib/dsg/answer-gate";
import { readJsonBody } from "../../../../../../lib/security/request-json";
import { requireDsgAuth, dsgAuthError } from "../../../../../../lib/dsg/auth/require-dsg-auth";

import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from "../../../../../../lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const rateLimitResult = await applyRateLimit({
    key: getRateLimitKey(request, "dsg-answer-gate"),
    limit: 60,
    windowMs: 60_000,
  });
  const rlHeaders = buildRateLimitHeaders(rateLimitResult, 60);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limit_exceeded" },
      { status: 429, headers: rlHeaders }
    );
  }

  const body = await readJsonBody(request, { maxBytes: 8_000 });
  if (!body.ok) {
    return NextResponse.json(
      { ok: false, error: body.error },
      { status: body.status, headers: rlHeaders }
    );
  }

  const facts = body.value;
  if (typeof facts !== "object" || facts === null || Array.isArray(facts)) {
    return NextResponse.json(
      { ok: false, error: "body must be a facts object" },
      { status: 400, headers: rlHeaders }
    );
  }

  const result = evaluateAnswerGate(facts as Record<string, unknown>);

  return NextResponse.json(
    {
      ok: result.allowed,
      type: "dsg-answer-gate-decision",
      final_decision: result.final_decision,
      allowed: result.allowed,
      decisions: result.decisions,
      facts: result.facts,
      boundary: {
        statement:
          "DSG Answer Gate: blocks AI responses that assert unverified claims. BLOCK_UNSUPPORTED_CLAIM is never allowed.",
        solverType: "deterministic-typescript",
        externalSolverInvoked: false,
      },
    },
    { headers: rlHeaders }
  );
}
