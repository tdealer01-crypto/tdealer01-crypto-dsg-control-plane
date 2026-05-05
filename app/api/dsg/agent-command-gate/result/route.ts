import { NextRequest, NextResponse } from "next/server";
import {
  buildAgentActionResultReceipt,
  type AgentActionResultRequest,
} from "@/lib/dsg/agent-command-gate";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AgentActionResultRequest;
    const receipt = buildAgentActionResultReceipt(body);
    const status = receipt.accepted ? 200 : 422;

    return NextResponse.json(
      {
        ok: receipt.accepted,
        receipt,
      },
      { status },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "DSG_AGENT_ACTION_RESULT_RECORD_FAILED",
        message: error instanceof Error ? error.message : "Unknown agent action result recording error",
      },
      { status: 400 },
    );
  }
}
