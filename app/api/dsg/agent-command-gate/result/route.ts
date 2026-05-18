import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/require-org-permission";
import {
  buildAgentActionResultReceipt,
  type AgentActionResultRequest,
} from "@/lib/dsg/agent-command-gate";
import { recordAgentActionResultReceipt } from "@/lib/dsg/agent-command-gate-repository";

export const dynamic = "force-dynamic";

type DeniedAuth = { ok: false; error: string; status: 401 | 403 };

export async function POST(request: NextRequest) {
  const auth = await requireOrgPermission("org.execute");

  if (auth.ok === false) {
    const denied = auth as DeniedAuth;
    return NextResponse.json({ ok: false, error: denied.error }, { status: denied.status });
  }

  try {
    const body = (await request.json()) as AgentActionResultRequest;

    if (body.workspaceId !== auth.orgId) {
      return NextResponse.json(
        {
          ok: false,
          error: "DSG_AGENT_ACTION_RESULT_ORG_SCOPE_MISMATCH",
          message: "workspaceId must match the authenticated organization scope",
        },
        { status: 403 },
      );
    }

    const receipt = buildAgentActionResultReceipt(body);

    await recordAgentActionResultReceipt({
      actor: {
        orgId: auth.orgId,
        actorId: auth.userId,
        actorRole: auth.role,
      },
      request: body,
      receipt,
    });

    const status = receipt.accepted ? 200 : 422;

    return NextResponse.json(
      {
        ok: receipt.accepted,
        persisted: true,
        receipt,
        actor: {
          userId: auth.userId,
          role: auth.role,
        },
        boundary: {
          statement: "DSG recorded this agent result receipt as internal runtime evidence. This is not a third-party certification claim.",
          certificationClaim: false,
        },
      },
      { status },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "DSG_AGENT_ACTION_RESULT_RECORD_FAILED",
        message: error instanceof Error ? 'Internal server error' : "Unknown agent action result recording error",
      },
      { status: 400 },
    );
  }
}
