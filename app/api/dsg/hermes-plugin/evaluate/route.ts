import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/require-org-permission";
import {
  evaluateHermesPluginRequest,
  type HermesPluginRequest,
} from "@/lib/dsg/hermes-plugin";

export const dynamic = "force-dynamic";

type DeniedAuth = { ok: false; error: string; status: 401 | 403 };

const ROLE_PERMISSIONS: Record<string, string[]> = {
  viewer: ["tool:execute_low"],
  operator: ["tool:execute_low", "tool:execute_medium"],
  approver: ["tool:execute_low", "tool:execute_medium", "tool:execute_high"],
  admin: ["tool:execute_low", "tool:execute_medium", "tool:execute_high", "tool:execute_critical"],
  owner: ["tool:execute_low", "tool:execute_medium", "tool:execute_high", "tool:execute_critical"],
};

export async function POST(request: NextRequest) {
  const auth = await requireOrgPermission("org.execute");

  if (auth.ok === false) {
    const denied = auth as DeniedAuth;
    return NextResponse.json({ ok: false, error: denied.error }, { status: denied.status });
  }

  try {
    const body = (await request.json()) as Partial<HermesPluginRequest>;

    if (!body.mode) {
      return NextResponse.json(
        { ok: false, error: "DSG_HERMES_PLUGIN_MODE_REQUIRED" },
        { status: 400 },
      );
    }

    const role = String(auth.role ?? "viewer");
    const permissions = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.viewer;

    const evaluation = evaluateHermesPluginRequest({
      ...body,
      mode: body.mode,
      context: {
        workspaceId: auth.orgId,
        actorId: auth.userId,
        role: role as HermesPluginRequest["context"]["role"],
        permissions,
        customerName: body.context?.customerName,
        approvalRequestId: body.context?.approvalRequestId,
        approvalDecision: body.context?.approvalDecision,
        approvedBy: body.context?.approvedBy,
        approvedAt: body.context?.approvedAt,
        proof: body.context?.proof,
      },
    } as HermesPluginRequest);

    return NextResponse.json(
      {
        ok: evaluation.canExecute,
        evaluation,
        boundary: {
          statement:
            "DSG Hermes Plugin evaluates whether Hermes may execute. REVIEW/BLOCK means Hermes must not execute.",
          certificationClaim: false,
        },
      },
      { status: evaluation.canExecute ? 200 : 409 },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "DSG_HERMES_PLUGIN_EVALUATION_FAILED",
        message: "Internal server error",
      },
      { status: 400 },
    );
  }
}
