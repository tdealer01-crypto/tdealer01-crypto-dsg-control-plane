import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/security/request-body-safe";
import { handleApiError, internalErrorMessage } from "@/lib/security/api-error";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { StripeSubmissionOrchestrator } from "@/lib/browser-agents/stripe-submission/orchestrator";
import type { SubmissionData } from "@/lib/browser-agents/stripe-submission/types";
import { createStagehand, closeStagehand } from "@dsg/browserbase-automation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request, 100 * 1024);

    const supabaseAdmin = getSupabaseAdmin();
    const orchestrator = new StripeSubmissionOrchestrator(supabaseAdmin);

    const submissionData: SubmissionData = body.submissionData;
    if (!submissionData || !submissionData.app_metadata) {
      return NextResponse.json(
        { error: "Invalid submission data structure" },
        { status: 400 },
      );
    }

    const { stagehand, page, session } = await createStagehand({
      viewport: { width: 1280, height: 720 },
    });

    if (!session || !session.id) {
      await closeStagehand(stagehand);
      return NextResponse.json(
        { error: "Failed to create Browserbase session" },
        { status: 500 },
      );
    }

    await orchestrator.initialize(submissionData, session.id, page);

    return NextResponse.json({
      ok: true,
      submissionId: orchestrator.getSubmissionId(),
      browserbaseSessionId: session.id,
      firstStepNumber: 1,
      totalSteps: 20,
      startTime: new Date().toISOString(),
      recordingUrl: `https://browserbase.com/sessions/${session.id}`,
    });
  } catch (error: any) {
    console.error("Stripe submission start error:", error);
    return handleApiError(error, "stripe-submission-start");
  }
}
