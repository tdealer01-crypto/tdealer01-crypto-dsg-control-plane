/**
 * POST /api/dsg/hermes/action
 *
 * Hermes sends a HermesActionEvent before executing any action.
 * DSG evaluates plan alignment and returns a decision:
 *
 *   PLAN_MATCHED_ALLOW_AUDIT  → proceed, executor may run
 *   PLAN_RELATED_REPLAN       → submit a revised plan first
 *   OUT_OF_PLAN_DENY          → action is outside user-approved plan
 *   CLAIM_EVIDENCE_DENY       → action allowed but claim is blocked (missing evidence binding)
 *
 * DSG must not block plan-authorized execution.
 * DSG only denies out-of-plan actions or unsupported claims.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/require-org-permission";
import { lookupPlanContract } from "@/lib/dsg/plan-contract-repository";
import { evaluatePlanAlignment } from "@/lib/dsg/plan-alignment-gate";
import type { HermesActionEvent } from "@/lib/dsg/plan-scope-contract";

export const dynamic = "force-dynamic";

type DeniedAuth = { ok: false; error: string; status: 401 | 403 };

export async function POST(req: NextRequest) {
  const auth = await requireOrgPermission("org.execute");
  if (auth.ok === false) {
    const d = auth as DeniedAuth;
    return NextResponse.json({ ok: false, error: d.error }, { status: d.status });
  }

  let event: HermesActionEvent;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!event.planHash || !event.eventId) {
    return NextResponse.json({ ok: false, error: "planHash and eventId are required" }, { status: 400 });
  }

  // Scope check — workspaceId must match authenticated org
  if (event.workspaceId !== auth.orgId) {
    return NextResponse.json(
      { ok: false, error: "workspaceId must match authenticated org scope" },
      { status: 403 },
    );
  }

  // Look up the locked plan contract
  const contract = await lookupPlanContract(event.planHash, auth.orgId);

  // If no contract found, this is an unlocked plan — deny out-of-plan
  if (!contract) {
    return NextResponse.json(
      {
        ok: false,
        decision: "OUT_OF_PLAN_DENY",
        canProceed: false,
        reasons: ["plan_contract_not_found:submit_plan_first"],
        requiresReplan: true,
        claimAllowed: false,
        mustReturnEvidence: false,
        receiptEndpoint: "/api/dsg/hermes/evidence",
        decidedAt: new Date().toISOString(),
      },
      { status: 404 },
    );
  }

  // Evaluate plan alignment
  const result = evaluatePlanAlignment(contract, event);

  return NextResponse.json({
    ok: true,
    decision: result.decision,
    canProceed: result.canProceed,
    planId: result.planId,
    planHash: result.planHash,
    scopeHash: result.scopeHash,
    eventId: result.eventId,
    reasons: result.reasons,
    requiresReplan: result.requiresReplan,
    claimAllowed: result.claimAllowed,
    decisionHash: result.decisionHash,
    mustReturnEvidence: true,
    receiptEndpoint: "/api/dsg/hermes/evidence",
    decidedAt: result.decidedAt,
  });
}
