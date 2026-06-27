import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Supported models from various providers
const MODELS = {
  anthropic: [
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20250219",
    "claude-3-5-haiku-20241022",
    "claude-3-5-sonnet-20241022",
  ],
  openrouter: [
    "openai/gpt-4-turbo",
    "openai/gpt-4o",
    "anthropic/claude-3-opus",
    "anthropic/claude-3-sonnet",
  ],
  openai: [
    "gpt-4-turbo",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-3.5-turbo",
  ],
};

export async function GET() {
  try {
    const currentModel = process.env.DSG_AI_MODEL || "claude-3-5-sonnet-20241022";
    const provider = process.env.AI_PROVIDER || "anthropic";

    // Build available models list
    const supportedModels = [
      ...MODELS.anthropic,
      ...(process.env.OPENROUTER_API_KEY ? MODELS.openrouter : []),
      ...(process.env.OPENAI_API_KEY ? MODELS.openai : []),
    ];

    // Remove duplicates
    const uniqueModels = [...new Set(supportedModels)];

    return NextResponse.json({
      provider,
      model: currentModel,
      supportedModels: uniqueModels,
      config: {
        context_window: getContextWindow(currentModel),
        temperature: 0.7,
        max_tokens: 4096,
      },
    });
  } catch (error) {
    console.error("Model info error:", error);
    return NextResponse.json(
      { error: "Failed to fetch model information" },
      { status: 500 }
    );
  }
}

function getContextWindow(model: string): number {
  if (model.includes("opus")) return 200000;
  if (model.includes("sonnet")) return 200000;
  if (model.includes("haiku")) return 200000;
  if (model.includes("gpt-4")) return 128000;
  if (model.includes("gpt-3.5")) return 16000;
  return 8192;
}
