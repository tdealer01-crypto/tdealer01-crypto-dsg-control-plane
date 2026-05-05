import { NextRequest, NextResponse } from "next/server";
import {
  evaluateAgentCommandGate,
  type AgentCommandGateRequest,
} from "@/lib/dsg/agent-command-gate";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AgentCommandGateRequest;
    const result = evaluateAgentCommandGate(body);
    const status = result.canAgentExecute ? 200 : 409;

    return NextResponse.json(
      {
        ok: result.canAgentExecute,
        result,
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
