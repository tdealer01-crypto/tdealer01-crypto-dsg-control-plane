import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/require-org-permission";
import {
  evaluateAgentCommandGate,
  type AgentCommandGateRequest,
} from "@/lib/dsg/agent-command-gate";
import { recordAgentCommandGateDecision } from "@/lib/dsg/agent-command-gate-repository";
import type { HermesPlanScopeContract } from "@/lib/dsg/plan-scope-contract";

export const dynamic = "force-dynamic";

type DeniedAuth = { ok: false; error: string; status: 401 | 403 };

type AgentCommandGateBody = AgentCommandGateRequest & {
  planScopeContract?: HermesPlanScopeContract;
};

export async function POST(request: NextRequest) {
  const auth = await requireOrgPermission("org.execute");

  if (auth.ok === false) {
    const denied = auth as DeniedAuth;
    return NextResponse.json({ ok: false, error: denied.error }, { status: denied.status });
  }

  try {
    const body = (await request.json()) as AgentCommandGateBody;

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

    // When planHash is provided, it must be backed by a planScopeContract.
    // The contract is verified at this trust boundary — gate itself is stateless.
    // Without contract verification, planHash is stripped so the gate enforces
    // explicit idempotency/rollback/audit/evidence bindings instead.
    let verifiedPlanHash: string | undefined;
    let planContractVerified = false;

    if (body.command.planHash) {
      const contract = body.planScopeContract;
      if (
        contract &&
        contract.workspaceId === auth.orgId &&
        contract.planHash === body.command.planHash &&
        contract.agentId === body.runtime.agentId
      ) {
        verifiedPlanHash = body.command.planHash;
        planContractVerified = true;
      }
      // If contract absent or mismatched: planHash is stripped — gate falls back to explicit bindings
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
          contractProvided: Boolean(body.planScopeContract),
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
