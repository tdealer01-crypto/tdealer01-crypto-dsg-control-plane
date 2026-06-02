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

interface ExecuteRequest {
  input: string;
  allowedCommands?: string[];
  allowedPaths?: string[];
  /** Optional: inline code to write to /tmp/dsg-code/<filename> before execution */
  code?: string;
  filename?: string;
  runtime?: 'node' | 'python3' | 'bash';
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
    stdout?: string;
  };
  message: string;
  stdout?: string;
}

/**
 * Call Anthropic API to generate a plan from input.
 * Uses server-side ANTHROPIC_API_KEY only (never exposed).
 */
async function generatePlanWithLLM(
  input: string,
  model: string
): Promise<string> {
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
    const { input, allowedCommands, allowedPaths, code, filename, runtime } = body;

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

    // 3. If inline code provided, write to sandbox first and build a run plan
    let canonicalPlan: string;
    if (code && typeof code === 'string') {
      const { mkdirSync, writeFileSync } = await import('fs');
      const { resolve } = await import('path');
      const ext = runtime === 'python3' ? '.py' : runtime === 'bash' ? '.sh' : '.js';
      const fname = typeof filename === 'string' && filename ? filename : `task-${Date.now()}${ext}`;
      const sandboxPath = '/tmp/dsg-code';
      mkdirSync(sandboxPath, { recursive: true });
      const filePath = resolve(sandboxPath, fname);
      writeFileSync(filePath, code, { encoding: 'utf-8', mode: 0o644 });
      const bin = runtime === 'python3' ? 'python3' : runtime === 'bash' ? 'bash' : 'node';
      canonicalPlan = JSON.stringify({
        steps: [{ command: bin, args: [filePath], reason: `Run ${fname}` }],
      });
    } else {
      // 3b. Generate plan using Anthropic API
      try {
        canonicalPlan = await generatePlanWithLLM(input, config.model);
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
      allowedCommands: allowedCommands || ["echo", "cat", "ls", "find", "grep", "node", "python3", "bash", "printf", "mkdir", "touch", "wc", "head", "tail", "sort", "uniq", "date", "pwd"],
      allowedPaths: allowedPaths || ["/tmp/dsg", "/tmp/dsg-code"],
    });

    // 6. Execute with the real shell executor
    const shellExecutor = createShellExecutor();
    const { result } = await hermes.executePlan(ctx, shellExecutor);
    const extResult = result as typeof result & { stdout?: string };

    // 7. Validate conformance
    const conformanceReport = checkConformance(ctx, result);

    // 8. Return result with stdout surfaced
    return NextResponse.json({
      success: conformanceReport.approved,
      planHash: proposal.plan.planHash,
      violations: conformanceReport.violations,
      stdout: extResult.stdout,
      result: conformanceReport.approved
        ? { ...result, stdout: extResult.stdout }
        : undefined,
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
    status: config.configured ? "ready" : "not-configured",
    note: "Production status: NO-GO until live health/readiness evidence verified.",
  });
}
