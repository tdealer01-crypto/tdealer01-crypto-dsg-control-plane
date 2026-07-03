/**
 * DSG Brain Execution API Route
 *
 * POST /api/dsg/brain/execute — Execute a plan through the Hermes Controlled Executor
 * GET /api/dsg/brain/execute — Health check
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createHermesPlugin,
  buildDsgBrainModelConfig,
  buildPlanAttempt,
  sha256Hash,
  checkConformance,
  PlanAttemptInput,
} from "@/lib/dsg/brain";
import { createShellExecutor } from "@/lib/dsg/brain/shell-executor";
import { evaluateAction } from "@/lib/dsg/evaluate-action";
import { describeModelConfig } from "@/lib/dsg/brain/model-config";
import { DSG_HERMES_TOOLS } from "@/lib/dsg/brain/hermes-nous-provider";
import { callHermesAPIResilient, formatHermesError } from "@/lib/dsg/brain/hermes-api-resilient";

interface ExecuteRequest {
  input: string;
  allowedCommands?: string[];
  allowedPaths?: string[];
}

interface ExecuteResponse {
  success: boolean;
  planHash: string;
  violations: Array<{
    rule: string;
    expected: unknown;
    actual: unknown;
    message: string;
  }>;
  result?: {
    success: boolean;
    planHash: string;
    executedCommands: Array<{ command: string; args: string[] }>;
    fileChanges: Array<{ path: string; operation: string }>;
    evidence: Array<{ type: string; id: string; hash: string; timestamp: number }>;
  };
  message: string;
}

/**
 * Call LLM API to generate a plan from input.
 * Supports Anthropic and OpenRouter (with resilient retry + fallback to free models).
 */
async function generatePlanWithLLM(
  input: string,
  model: string,
  provider: string
): Promise<string> {
  // Provider: Anthropic
  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are a planning agent. Generate a concise, actionable plan for the following request. Return only the plan text, no explanation.\n\nRequest: ${input}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${err}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    const content = data.content?.[0];
    if (content?.type === "text" && content.text) {
      return content.text;
    }

    throw new Error("No text content in Anthropic response");
  }

  // Provider: OpenRouter with Hermes (resilient with retry + fallback)
  if (provider === 'nous-hermes') {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    const systemPrompt = `You are a planning agent for deterministic governance.
Generate a concise, actionable execution plan.
Return only the plan text, no explanation.
Format as:
Step 1: [command] - [reason]
Step 2: [command] - [reason]
...`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `Generate plan for: ${input}` },
    ];

    const headers = {
      'HTTP-Referer': 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
      'X-Title': 'DSG ONE ProofGate',
    };

    try {
      // Use resilient caller with retry + fallback to free models
      const response = await callHermesAPIResilient(
        'https://openrouter.ai/api/v1',
        `Bearer ${apiKey}`,
        messages,
        [], // No tools for simple planning
        model,
        1024,
        headers,
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          enableFallback: true, // Enable automatic fallback to free models
        }
      );

      const choice = response.choices?.[0];
      if (choice?.message?.content) {
        return choice.message.content;
      }

      throw new Error("No content in OpenRouter response");
    } catch (err) {
      const formatted = formatHermesError(err);
      throw new Error(`OpenRouter API error: ${formatted}`);
    }
  }

  throw new Error(`Unknown provider: ${provider}`);
}

/**
 * POST /api/dsg/brain/execute
 *
 * Request body:
 * {
 *   input: string;           // User request / task description
 *   allowedCommands?: string[]; // Whitelist of allowed commands
 *   allowedPaths?: string[];    // Whitelist of allowed paths
 * }
 *
 * Response: ExecuteResponse with result and any conformance violations
 */
export async function POST(req: NextRequest): Promise<NextResponse<ExecuteResponse>> {
  // 1. Check server-side configuration
  const config = buildDsgBrainModelConfig();
  if (!config.configured) {
    return NextResponse.json(
      {
        success: false,
        planHash: "",
        violations: [],
        message: "DSG Brain not configured. Set ANTHROPIC_API_KEY environment variable.",
      } as ExecuteResponse,
      { status: 503 }
    );
  }

  try {
    const body = (await req.json()) as ExecuteRequest;
    const { input, allowedCommands, allowedPaths } = body;

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        {
          success: false,
          planHash: "",
          violations: [],
          message: "Missing or invalid 'input' field",
        } as ExecuteResponse,
        { status: 400 }
      );
    }

    // 2. Initialize Hermes Plugin
    const hermes = createHermesPlugin();

    // 3. Generate plan using configured LLM (Anthropic or NousResearch Hermes with resilience)
    let canonicalPlan: string;
    try {
      canonicalPlan = await generatePlanWithLLM(input, config.model, config.provider);
    } catch (err) {
      return NextResponse.json(
        {
          success: false,
          planHash: "",
          violations: [],
          message: `Plan generation failed: ${(err as Error).message}`,
        } as ExecuteResponse,
        { status: 500 }
      );
    }

    // 4. Build plan from input
    const planInput: PlanAttemptInput = {
      inputHash: sha256Hash({ input, timestamp: Date.now() }),
      attemptNo: 1,
      canonicalPlan,
      policyVersion: process.env.DSG_POLICY_VERSION || "v1.0.0",
      invariantVersion: process.env.DSG_INVARIANT_VERSION || "v1.0.0",
      toolManifestHash: sha256Hash(allowedCommands || []),
    };

    const proposal = await hermes.proposePlan(planInput);

    // 5. Build execution context with whitelists
    const ctx = hermes.buildExecutionContext(proposal.plan, { leases: [], unavailable: [] }, {
      allowedCommands: allowedCommands || ["echo", "cat", "ls"],
      allowedPaths: allowedPaths || ["/tmp/dsg"],
    });

    // 6. DSG Gate: inspect plan before execution.
    // Gate is the safety inspector — not a blocker of normal work.
    // Read/observe commands pass immediately. Risky/dangerous actions may BLOCK.
    const commandSummary = allowedCommands?.join(',') ?? 'default';
    const gateResult = evaluateAction({
      workspaceId: process.env.DSG_WORKSPACE_ID ?? 'dsg-brain-default',
      agentId: 'hermes',
      sessionId: planInput.inputHash.slice(0, 16),
      action: 'brain.execute',
      actionType: 'write',
      targetSystemId: 'shell',
      riskLevel: 'medium',
      actorId: 'hermes-runtime',
      actorRole: 'operator',
      payload: { input, commandSummary },
      idempotencyKey: planInput.inputHash,
      rollbackPlanId: proposal.plan.planHash,
    });

    if (gateResult.decision === 'BLOCK') {
      return NextResponse.json(
        {
          success: false,
          planHash: proposal.plan.planHash,
          violations: [],
          gateDecision: gateResult.decision,
          gateReasons: gateResult.reasons,
          message: `DSG Gate blocked execution: ${gateResult.reasons.join('; ')}`,
        } as ExecuteResponse & { gateDecision: string; gateReasons: string[] },
        { status: 409 },
      );
    }

    // Execute with the real shell executor
    const shellExecutor = createShellExecutor();
    const { result, report } = await hermes.executePlan(ctx, shellExecutor);

    // 7. Validate conformance
    const conformanceReport = checkConformance(ctx, result);

    // 8. Return result
    return NextResponse.json({
      success: conformanceReport.approved,
      planHash: proposal.plan.planHash,
      violations: conformanceReport.violations,
      result: conformanceReport.approved ? result : undefined,
      gateDecision: gateResult.decision,
      gateDecisionHash: gateResult.decisionHash,
      message: conformanceReport.approved
        ? "Execution completed within constraints"
        : `Blocked: ${conformanceReport.violations.map((v) => v.message).join("; ")}`,
    });
  } catch (error) {
    console.error("DSG Brain execution error:", error);
    // Never expose API keys or raw secrets in error output
    const errorMsg = (error as Error).message || "Internal execution error";
    const sanitized = errorMsg.replace(/sk-ant-[^\s]*/g, "[REDACTED]");
    return NextResponse.json(
      {
        success: false,
        planHash: "",
        violations: [],
        message: sanitized,
      } as ExecuteResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/dsg/brain/execute
 * Health check endpoint for DSG Brain configuration
 */
export async function GET(): Promise<NextResponse> {
  const config = buildDsgBrainModelConfig();
  return NextResponse.json({
    configured: config.configured,
    provider: config.provider,
    model: config.model,
    hosting: config.nousHosting ?? null,
    description: describeModelConfig(config),
    status: config.configured ? "ready" : "not-configured",
    tools: config.provider === "nous-hermes" ? DSG_HERMES_TOOLS.map((t) => t.function.name) : null,
    note: "Production status: NO-GO until live health/readiness evidence verified.",
  });
}
