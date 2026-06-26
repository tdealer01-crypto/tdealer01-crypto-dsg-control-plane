import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/security/request-json";
import { handleApiError } from "@/lib/security/api-error";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { StripeSubmissionOrchestrator } from "@/lib/browser-agents/stripe-submission/orchestrator";
import type { SubmissionData } from "@/lib/browser-agents/stripe-submission/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const result = await readJsonBody(request, { maxBytes: 100 * 1024 });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Invalid request body" },
        { status: result.status },
      );
    }

    const body = result.value as { submissionData: SubmissionData };
    const supabaseAdmin = getSupabaseAdmin();
    const orchestrator = new StripeSubmissionOrchestrator(supabaseAdmin);

    const submissionData: SubmissionData = body.submissionData;
    if (!submissionData || !submissionData.app_metadata) {
      return NextResponse.json(
        { error: "Invalid submission data structure" },
        { status: 400 },
      );
    }

    await orchestrator.initialize(submissionData, "browserbase-session-placeholder", null);

    return NextResponse.json({
      ok: true,
      submissionId: orchestrator.getSubmissionId(),
      message: "Stripe submission initialized. Phase 2: Browserbase integration pending.",
      firstStepNumber: 1,
      totalSteps: 20,
      startTime: new Date().toISOString(),
      status: "ready",
    });
  } catch (error: any) {
    console.error("Stripe submission start error:", error);
    return handleApiError(error, "stripe-submission-start");
  }
}
