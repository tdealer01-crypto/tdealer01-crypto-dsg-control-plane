import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/require-org-permission";
import {
  evaluateAgentCommandGate,
  type AgentCommandGateRequest,
} from "@/lib/dsg/agent-command-gate";
import { recordAgentCommandGateDecision } from "@/lib/dsg/agent-command-gate-repository";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireOrgPermission("org.execute");

  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as AgentCommandGateRequest;

    if (body.workspaceId !== auth.orgId) {
      return NextResponse.json(
        {
          ok: false,
          error: "DSG_AGENT_COMMAND_GATE_ORG_SCOPE_MISMATCH",
          message: "workspaceId must match the authenticated organization scope",
        },
        { status: 403 },
      );
    }

    const result = evaluateAgentCommandGate(body);

    await recordAgentCommandGateDecision({
      actor: {
        orgId: auth.orgId,
        actorId: auth.userId,
        actorRole: auth.role,
      },
      request: body,
      result,
    });

    const status = result.canAgentExecute ? 200 : 409;

    return NextResponse.json(
      {
        ok: result.canAgentExecute,
        persisted: true,
        result,
        actor: {
          userId: auth.userId,
          role: auth.role,
        },
        boundary: {
          statement: "DSG recorded this gate decision as internal runtime evidence. This is not a third-party certification claim.",
          certificationClaim: false,
        },
      },
      { status },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "DSG_AGENT_COMMAND_GATE_FAILED",
        message: error instanceof Error ? error.message : "Unknown agent command gate error",
      },
      { status: 400 },
    );
  }
}
