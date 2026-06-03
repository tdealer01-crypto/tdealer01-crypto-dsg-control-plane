import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/require-org-permission";
import {
  evaluateAgentCommandGate,
  type AgentCommandGateRequest,
} from "@/lib/dsg/agent-command-gate";
import { recordAgentCommandGateDecision } from "@/lib/dsg/agent-command-gate-repository";
import { lookupPlanContract } from "@/lib/dsg/plan-contract-repository";
import { evaluatePlanAlignment } from "@/lib/dsg/plan-alignment-gate";
import type { HermesActionEvent } from "@/lib/dsg/plan-scope-contract";

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

    // When planHash is provided, verify it against the server-side plan contract store
    // and confirm the command falls within the contract's approved scope (action type,
    // target system, operation, risk level, expiry). Only then is the plan treated as
    // authorized, allowing evaluateAgentCommandGate to waive explicit evidence bindings.
    let verifiedPlanHash: string | undefined;
    let planContractVerified = false;
    let verifiedScopeHash: string | undefined;
    let planAlignmentDecision: string | null = null;
    const now = new Date();

    if (body.command.planHash) {
      const contract = await lookupPlanContract(body.command.planHash, auth.orgId);
      if (contract && contract.agentId === body.runtime.agentId) {
        // Build a minimal action event for scope-only alignment check.
        // Evidence requirement checks are intentionally zeroed out here —
        // those are enforced by evaluateAgentCommandGate once plan authorization is decided.
        const scopeEvent: HermesActionEvent = {
          eventId: body.command.commandId,
          planId: contract.planId,
          planHash: contract.planHash,
          workspaceId: auth.orgId,
          agentId: body.runtime.agentId,
          sessionId: body.runtime.sessionId,
          actionType: body.command.actionType,
          targetSystemId: body.command.targetSystemId,
          operationName: body.command.operationName,
          riskLevel: body.command.riskLevel,
          payloadHash: body.command.payloadHash,
          requestedAt: now.toISOString(),
        };

        const scopeOnlyContract = {
          ...contract,
          evidenceRequirements: { requireIdempotency: false, requireRollback: false, requireAudit: false, requireEvidence: false },
        };

        const scopeCheck = evaluatePlanAlignment(scopeOnlyContract, scopeEvent, now);
        planAlignmentDecision = scopeCheck.decision;

        if (scopeCheck.decision === "PLAN_MATCHED_ALLOW_AUDIT") {
          verifiedPlanHash = body.command.planHash;
          verifiedScopeHash = contract.scopeHash;
          planContractVerified = true;
        }
        // If scope check fails (expired, wrong action type, wrong target, etc.):
        // planHash is stripped — gate requires explicit evidence bindings
      }
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
          scopeHash: verifiedScopeHash ?? null,
          planAuthorized: planContractVerified,
          contractProvided: Boolean(body.command.planHash),
          alignmentDecision: planAlignmentDecision,
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
