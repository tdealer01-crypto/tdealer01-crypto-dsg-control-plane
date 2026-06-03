import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/require-org-permission";
import {
  evaluateAgentCommandGate,
  type AgentCommandGateRequest,
} from "@/lib/dsg/agent-command-gate";
import { recordAgentCommandGateDecision } from "@/lib/dsg/agent-command-gate-repository";
import { lookupPlanContract } from "@/lib/dsg/plan-contract-repository";

export const dynamic = "force-dynamic";

type DeniedAuth = { ok: false; error: string; status: 401 | 403 };

export async function POST(request: NextRequest) {
  const auth = await requireOrgPermission("org.execute");

  if (auth.ok === false) {
    const denied = auth as DeniedAuth;
    return NextResponse.json({ ok: false, error: denied.error }, { status: denied.status });
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

    // When planHash is provided, verify it against the server-side plan contract store.
    // A client-supplied contract is never trusted — the record must exist in DB,
    // and its stored hash fields must match the contract's recomputed values.
    let verifiedPlanHash: string | undefined;
    let planContractVerified = false;

    if (body.command.planHash) {
      const contract = await lookupPlanContract(body.command.planHash, auth.orgId);
      if (contract && contract.agentId === body.runtime.agentId) {
        verifiedPlanHash = body.command.planHash;
        planContractVerified = true;
      }
      // If plan not found or agent mismatch: planHash is stripped — gate requires explicit bindings
    }

    const gateRequest: AgentCommandGateRequest = {
      ...body,
      command: { ...body.command, planHash: verifiedPlanHash },
    };

    const result = evaluateAgentCommandGate(gateRequest);

    await recordAgentCommandGateDecision({
      actor: {
        orgId: auth.orgId,
        actorId: auth.userId,
        actorRole: auth.role,
      },
      request: gateRequest,
      result,
    });

    const status = result.canAgentExecute ? 200 : 409;

    return NextResponse.json(
      {
        ok: result.canAgentExecute,
        persisted: true,
        result,
        planScope: {
          planHash: verifiedPlanHash ?? null,
          scopeHash: body.command.scopeHash ?? null,
          planAuthorized: planContractVerified,
          contractProvided: Boolean(body.command.planHash),
        },
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
        message: error instanceof Error ? 'Internal server error' : "Unknown agent command gate error",
      },
      { status: 400 },
    );
  }
}
