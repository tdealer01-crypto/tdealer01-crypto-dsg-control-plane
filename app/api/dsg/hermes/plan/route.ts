/**
 * POST /api/dsg/hermes/plan
 *
 * Hermes submits a user-approved plan to DSG for lock-in.
 * Returns planHash + scopeHash that must be attached to every subsequent action event.
 *
 * GET /api/dsg/hermes/plan?planHash=…  — Look up a locked plan contract.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/require-org-permission";
import {
  buildPlanHash,
  buildPlanScopeHash,
} from "@/lib/dsg/plan-scope-contract";
import type { HermesPlanScopeContract } from "@/lib/dsg/plan-scope-contract";
import {
  storePlanContract,
  lookupPlanContract,
} from "@/lib/dsg/plan-contract-repository";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

type DeniedAuth = { ok: false; error: string; status: 401 | 403 };

// ──────────────────────────────────────────────────────────────────────────────
// POST — lock a new plan
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireOrgPermission("org.execute");
  if (auth.ok === false) {
    const d = auth as DeniedAuth;
    return NextResponse.json({ ok: false, error: d.error }, { status: d.status });
  }

  let body: {
    userGoal: string;
    summary?: string;
    agentId: string;
    allowedActionTypes?: HermesPlanScopeContract["allowedActionTypes"];
    allowedTargetSystems?: string[];
    allowedOperations?: string[];
    maxRiskLevel?: HermesPlanScopeContract["maxRiskLevel"];
    evidenceRequirements?: HermesPlanScopeContract["evidenceRequirements"];
    expiresInMs?: number;
    claimBoundary?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.userGoal || !body.agentId) {
    return NextResponse.json({ ok: false, error: "userGoal and agentId are required" }, { status: 400 });
  }

  const now = new Date();
  const planId = randomUUID();

  const contractWithoutHashes = {
    planId,
    workspaceId: auth.orgId,
    agentId: body.agentId,
    approvedBy: auth.userId ?? "operator",
    approvedAt: now.toISOString(),
    expiresAt: body.expiresInMs ? new Date(now.getTime() + body.expiresInMs).toISOString() : undefined,
    allowedActionTypes: body.allowedActionTypes ?? (["read", "write", "command", "api_call", "browse"] as HermesPlanScopeContract["allowedActionTypes"]),
    allowedTargetSystems: body.allowedTargetSystems ?? ["repo", "shell", "external_api", "browser", "web"],
    allowedOperations: body.allowedOperations ?? [],
    maxRiskLevel: body.maxRiskLevel ?? ("medium" as const),
    evidenceRequirements: body.evidenceRequirements ?? {
      requireIdempotency: false,
      requireRollback: false,
      requireAudit: false,
      requireEvidence: false,
    },
    claimBoundary: body.claimBoundary ?? `Plan: ${body.summary ?? body.userGoal.slice(0, 100)}`,
  };

  const scopeHash = buildPlanScopeHash(contractWithoutHashes);
  const withScope = { ...contractWithoutHashes, scopeHash };
  const planHash = buildPlanHash(withScope);

  const contract: HermesPlanScopeContract = { ...withScope, planHash };

  const stored = await storePlanContract(contract);
  if (!stored.ok) {
    // Table may not exist yet — return the plan without persistence (best-effort).
    // Execution will still work; plan alignment checks may be looser.
    return NextResponse.json({
      ok: true,
      planId,
      planHash,
      scopeHash,
      persisted: false,
      warning: stored.error ?? "Plan stored in-memory only — dsg_plan_contracts table not available",
    });
  }

  return NextResponse.json({ ok: true, planId, planHash, scopeHash, persisted: true });
}

// ──────────────────────────────────────────────────────────────────────────────
// GET — look up a locked plan contract
// ──────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireOrgPermission("org.view_reports");
  if (auth.ok === false) {
    const d = auth as DeniedAuth;
    return NextResponse.json({ ok: false, error: d.error }, { status: d.status });
  }

  const planHash = req.nextUrl.searchParams.get("planHash");
  if (!planHash) {
    return NextResponse.json({ ok: false, error: "planHash query param required" }, { status: 400 });
  }

  const contract = await lookupPlanContract(planHash, auth.orgId);
  if (!contract) {
    return NextResponse.json({ ok: false, error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, contract });
}
