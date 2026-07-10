import { NextResponse } from "next/server";
import {
  evaluateBreachSignal,
  type BreachSignalInput,
} from "../../../../../lib/dsg/breach-signal/policy";
import { detectFlagsFromUrl } from "../../../../../lib/dsg/breach-signal/url-detect";
import { checkHibpDomain } from "../../../../../lib/dsg/breach-signal/hibp";
import { readJsonBody } from "../../../../../lib/security/request-json";
import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from "../../../../../lib/security/rate-limit";
import type { Json } from "../../../../../lib/database.types";

export const dynamic = "force-dynamic";

type RequestBody = BreachSignalInput & { sourceUrl?: string };

async function persistEvaluation(params: {
  sourceUrl?: string;
  owner?: string;
  legalPurpose?: string;
  decision: string;
  evidenceLevel: string;
  severity: string;
  reasons: string[];
  allowedActions: string[];
  blockedActions: string[];
  hibpChecked: boolean;
  hibpBreachCount?: number;
  hibpBreaches?: Json;
  hibpElevatedEvidence: boolean;
}) {
  try {
    const { getSupabaseAdmin } = await import("../../../../../lib/supabase-server");
    const admin = getSupabaseAdmin();
    await admin.from("breach_signal_evaluations").insert({
      source_url: params.sourceUrl ?? null,
      owner: params.owner ?? null,
      legal_purpose: params.legalPurpose ?? null,
      decision: params.decision,
      evidence_level: params.evidenceLevel,
      severity: params.severity,
      reasons: params.reasons,
      allowed_actions: params.allowedActions,
      blocked_actions: params.blockedActions,
      hibp_checked: params.hibpChecked,
      hibp_breach_count: params.hibpBreachCount ?? null,
      hibp_breaches: params.hibpBreaches ?? null,
      hibp_elevated_evidence: params.hibpElevatedEvidence,
      raw_data_stored: false,
    });
  } catch {
    // DB write is best-effort — evaluation response is not blocked by a DB failure.
  }
}

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

  const body = await readJsonBody<RequestBody>(request, { maxBytes: 8_000 });
  if (!body.ok) {
    return NextResponse.json(
      { ok: false, error: body.error },
      { status: body.status, headers: rlHeaders },
    );
  }

  const raw = body.value;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return NextResponse.json(
      { ok: false, error: "body_must_be_object" },
      { status: 400, headers: rlHeaders },
    );
  }

  const { sourceUrl, ...signalInput } = raw;

  // Auto-detect flags from URL when provided.
  const urlFlags = sourceUrl ? detectFlagsFromUrl(sourceUrl) : null;
  const detectedDomain = urlFlags?.detectedDomain ?? null;

  const mergedInput: BreachSignalInput = {
    ...signalInput,
    networkRoute: signalInput.networkRoute ?? urlFlags?.networkRoute ?? "unknown",
    requiresLogin: signalInput.requiresLogin ?? urlFlags?.requiresLogin ?? false,
    requiresDownload: signalInput.requiresDownload ?? urlFlags?.requiresDownload ?? false,
  };

  // Resolve domain for HIBP from URL detection or owner field.
  const hibpDomain = detectedDomain ?? mergedInput.owner?.trim() ?? null;

  // Run HIBP check in parallel with evaluation when domain is available.
  const [hibpResult] = await Promise.all([
    hibpDomain ? checkHibpDomain(hibpDomain) : Promise.resolve(null),
  ]);

  // If HIBP confirms the domain has verified breaches, treat as provider-confirmed.
  const finalInput: BreachSignalInput =
    hibpResult?.elevatesEvidence && !mergedInput.providerConfirmed
      ? { ...mergedInput, providerConfirmed: true }
      : mergedInput;

  const evaluation = evaluateBreachSignal(finalInput);

  // Persist audit record — fire and forget, does not block response.
  void persistEvaluation({
    sourceUrl,
    owner: mergedInput.owner,
    legalPurpose: mergedInput.legalPurpose,
    decision: evaluation.decision,
    evidenceLevel: evaluation.evidenceLevel,
    severity: evaluation.severity,
    reasons: evaluation.reasons,
    allowedActions: evaluation.allowedActions,
    blockedActions: evaluation.blockedActions,
    hibpChecked: hibpResult?.checked ?? false,
    hibpBreachCount: hibpResult?.breachCount,
    hibpBreaches: hibpResult?.breaches,
    hibpElevatedEvidence: hibpResult?.elevatesEvidence ?? false,
  });

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
      sourceUrl: sourceUrl ?? null,
      urlFlags: urlFlags
        ? {
            detectedDomain,
            networkRoute: urlFlags.networkRoute,
            requiresLogin: urlFlags.requiresLogin,
            requiresDownload: urlFlags.requiresDownload,
          }
        : null,
      hibp: hibpResult
        ? {
            checked: hibpResult.checked,
            breachCount: hibpResult.breachCount,
            elevatedEvidence: hibpResult.elevatesEvidence,
            skipReason: hibpResult.skipReason ?? null,
            breaches: hibpResult.breaches.map((b) => ({
              name: b.Name,
              title: b.Title,
              domain: b.Domain,
              breachDate: b.BreachDate,
              dataClasses: b.DataClasses,
              isVerified: b.IsVerified,
            })),
          }
        : null,
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
