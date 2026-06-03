import { NextResponse } from "next/server";
import {
  evaluateBreachSignal,
  type BreachSignalInput,
} from "../../../../../lib/dsg/breach-signal/policy";
import { readJsonBody } from "../../../../../lib/security/request-json";
import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from "../../../../../lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rateLimitResult = await applyRateLimit({
    key: getRateLimitKey(request, "dsg-breach-signal"),
    limit: 30,
    windowMs: 60_000,
  });
  const rlHeaders = buildRateLimitHeaders(rateLimitResult, 30);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limit_exceeded" },
      { status: 429, headers: rlHeaders },
    );
  }

  const body = await readJsonBody<BreachSignalInput>(request, { maxBytes: 8_000 });
  if (!body.ok) {
    return NextResponse.json(
      { ok: false, error: body.error },
      { status: body.status, headers: rlHeaders },
    );
  }

  const input = body.value;
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return NextResponse.json(
      { ok: false, error: "body_must_be_object" },
      { status: 400, headers: rlHeaders },
    );
  }

  const evaluation = evaluateBreachSignal(input);

  return NextResponse.json(
    {
      ok: true,
      type: "dsg-breach-signal-evaluation",
      decision: evaluation.decision,
      evidenceLevel: evaluation.evidenceLevel,
      severity: evaluation.severity,
      reasons: evaluation.reasons,
      allowedActions: evaluation.allowedActions,
      blockedActions: evaluation.blockedActions,
      rawDataStored: evaluation.rawDataStored,
      boundary: {
        statement:
          "DSG breach-signal policy gate. No raw stolen data is stored. BLOCK is enforced for missing owner scope, missing legal purpose, raw data, full dumps, autonomous agent access, and Tor autonomous access.",
        darkWebCrawlingEnabled: false,
        torAutomationEnabled: false,
        rawDataStorageEnabled: false,
      },
    },
    { status: 200, headers: rlHeaders },
  );
}
