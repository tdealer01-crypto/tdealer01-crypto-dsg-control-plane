import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { model?: string };
    const model = body.model;

    if (!model) {
      return NextResponse.json(
        { error: "model parameter is required" },
        { status: 400 }
      );
    }

    // Validate model format
    if (typeof model !== "string" || !model.includes("-")) {
      return NextResponse.json(
        { error: "Invalid model format" },
        { status: 400 }
      );
    }

    // In a real app, you would:
    // 1. Persist to database/config file
    // 2. Validate against available models
    // 3. Update environment variable
    // 4. Restart/reload services if needed

    return NextResponse.json({
      success: true,
      model,
      message: `Model updated to ${model}`,
      note: "In production, this would persist to your configuration storage",
    });
  } catch (error) {
    console.error("Set model error:", error);
    return NextResponse.json(
      { error: "Failed to set model" },
      { status: 500 }
    );
  }
}
