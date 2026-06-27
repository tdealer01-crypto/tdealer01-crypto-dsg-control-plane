import { NextResponse } from "next/server";
import {
  DSG_CURRENT_RUNTIME_EVIDENCE,
  buildDsgCurrentStatusText,
} from "@/lib/dsg/current-runtime-evidence";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    evidence: DSG_CURRENT_RUNTIME_EVIDENCE,
    assistantContext: buildDsgCurrentStatusText(),
    boundary: {
      certificationClaim: false,
      statement:
        "This endpoint exposes internal DSG runtime evidence. It is not a third-party certification or compliance certification claim.",
    },
  });
}
