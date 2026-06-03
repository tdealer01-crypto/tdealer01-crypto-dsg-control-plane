/**
 * POST /api/dsg/hermes/evidence
 *
 * Hermes submits evidence receipts after executing each action.
 * Every plan-authorized execution must be followed by an evidence receipt.
 *
 * The receipt must include at least one evidence item hash.
 * "Evidence is what decides what can be claimed."
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/require-org-permission";
import { lookupPlanContract } from "@/lib/dsg/plan-contract-repository";
import type { HermesEvidenceReceipt } from "@/lib/dsg/plan-scope-contract";

export const dynamic = "force-dynamic";

type DeniedAuth = { ok: false; error: string; status: 401 | 403 };

export async function POST(req: NextRequest) {
  const auth = await requireOrgPermission("org.execute");
  if (auth.ok === false) {
    const d = auth as DeniedAuth;
    return NextResponse.json({ ok: false, error: d.error }, { status: d.status });
  }

  let receipt: HermesEvidenceReceipt;
  try {
    receipt = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!receipt.planHash || !receipt.receiptId || !receipt.receiptHash) {
    return NextResponse.json({ ok: false, error: "planHash, receiptId, receiptHash are required" }, { status: 400 });
  }

  // Verify plan scope (best-effort — contract may not exist if plan was unlocked)
  const contract = await lookupPlanContract(receipt.planHash, auth.orgId).catch(() => null);

  // At least one evidence item is required before accepting a receipt
  if (!receipt.evidenceItemIds || receipt.evidenceItemIds.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Evidence receipt must include at least one evidence item",
        hint: "No evidence → no claim allowed",
      },
      { status: 422 },
    );
  }

  // In production: persist the receipt to dsg_evidence_receipts table.
  // For now: acknowledge receipt and return audit binding.
  const auditBinding = {
    receiptId: receipt.receiptId,
    planHash: receipt.planHash,
    scopeHash: receipt.scopeHash,
    receiptHash: receipt.receiptHash,
    decision: receipt.decision,
    actionStatus: receipt.actionStatus,
    claimVerified: receipt.claimVerified,
    claimBoundary: receipt.claimBoundary ?? contract?.claimBoundary ?? "evidence-based claim only",
    evidenceItemCount: receipt.evidenceItemIds.length,
    recordedAt: receipt.recordedAt,
    acknowledgedAt: new Date().toISOString(),
  };

  return NextResponse.json({ ok: true, auditBinding });
}

// GET — list receipts for a plan (stub — real implementation queries Supabase)
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

  return NextResponse.json({
    ok: true,
    planHash,
    note: "Evidence receipt persistence via Supabase dsg_evidence_receipts — pending migration",
    receipts: [],
  });
}
