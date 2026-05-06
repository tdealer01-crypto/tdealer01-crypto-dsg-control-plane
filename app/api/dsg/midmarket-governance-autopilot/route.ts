import { NextRequest, NextResponse } from "next/server";
import {
  MIDMARKET_AUTOPILOT_EXAMPLE,
  evaluateMidMarketGovernanceAutopilot,
  type MidMarketAutopilotRequest,
} from "@/lib/dsg/midmarket-governance-autopilot";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    feature: "DSG Mid-Market Governance Autopilot",
    description:
      "Automated governance intake for mid-market customers: existing-system connector mapping, audit evidence requirements, runtime invariant checks, rollout waves, and operator monitor configuration.",
    template: MIDMARKET_AUTOPILOT_EXAMPLE,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MidMarketAutopilotRequest;
    const result = evaluateMidMarketGovernanceAutopilot(body);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "MIDMARKET_AUTOPILOT_EVALUATION_FAILED",
        message: error instanceof Error ? error.message : "Unknown evaluation error",
      },
      { status: 400 },
    );
  }
}
