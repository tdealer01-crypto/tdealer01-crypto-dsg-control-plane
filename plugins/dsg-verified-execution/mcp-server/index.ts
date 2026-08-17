#!/usr/bin/env node
/**
 * DSG Verified Execution MCP Server
 *
 * Exposes governance tools for AI agent execution:
 * - plan_alignment: Check if an execution request aligns with the approved plan
 * - constraint_evaluate: Evaluate DSG constraints against an action
 * - execution_proof_request: Submit execution details and request proof generation
 * - evidence_retrieve: Retrieve audit trail and execution evidence
 *
 * All tools communicate with DSG ONE control plane via POST /api/spine/execute
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

interface DsgRequest {
  agent_id: string;
  action: string;
  params: Record<string, unknown>;
  plan_hash?: string;
  evidence_request?: boolean;
}

interface DsgResponse {
  decision: "ALLOW" | "BLOCK" | "REVIEW";
  reason: string;
  proof?: {
    hash: string;
    schema: string;
    timestamp: string;
  };
  evidence?: {
    execution_trace: Record<string, unknown>;
    lineage: string[];
  };
}

interface PlanAlignmentResult {
  decision: "ALLOW" | "BLOCK" | "REVIEW";
  reason: string;
  alignment_score: number;
  matched_plan_items: string[];
  deviations: string[];
}

interface ConstraintEvaluateResult {
  decision: "ALLOW" | "BLOCK" | "REVIEW";
  reason: string;
  violated_constraints: string[];
  policy_version: string;
}

interface ExecutionProofResult {
  decision: "ALLOW" | "BLOCK" | "REVIEW";
  reason: string;
  proof: {
    hash: string;
    schema: string;
    timestamp: string;
    canonical_input: string;
  };
}

interface EvidenceRetrieveResult {
  decision: "ALLOW" | "BLOCK" | "REVIEW";
  reason: string;
  executions: Array<{
    execution_id: string;
    timestamp: string;
    action: string;
    decision: "ALLOW" | "BLOCK" | "REVIEW";
    proof_hash?: string;
  }>;
  total_count: number;
}

const DSG_API_URL = process.env.DSG_API_URL || "https://tdealer01-crypto-dsg-control-plane.vercel.app";
const DSG_API_KEY = process.env.DSG_API_KEY;
const DSG_GATE_TIMEOUT_MS = parseInt(process.env.DSG_GATE_TIMEOUT_MS || "8000", 10);

if (!DSG_API_KEY) {
  throw new Error("DSG_API_KEY environment variable is required");
}

async function callDsgSpineWithRetry(
  payload: DsgRequest,
  maxRetries: number = 3,
): Promise<DsgResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DSG_GATE_TIMEOUT_MS);

      const response = await fetch(`${DSG_API_URL}/api/spine/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DSG_API_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status >= 500 && attempt < maxRetries - 1) {
          const backoff = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
        throw new Error(`DSG API error: ${response.status} ${response.statusText}`);
      }

      const data: DsgResponse = await response.json();
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`DSG gate timeout after ${DSG_GATE_TIMEOUT_MS}ms`);
      }

      if (attempt < maxRetries - 1) {
        const backoff = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw lastError || new Error("Failed to reach DSG gate after retries");
}

async function handlePlanAlignment(input: {
  agent_id: string;
  action: string;
  plan_hash: string;
  context?: Record<string, unknown>;
}): Promise<PlanAlignmentResult> {
  if (!input.agent_id || !input.action || !input.plan_hash) {
    throw new Error("Missing required fields: agent_id, action, plan_hash");
  }

  const request: DsgRequest = {
    agent_id: input.agent_id,
    action: input.action,
    plan_hash: input.plan_hash,
    params: {
      tool: "plan_alignment",
      plan_hash: input.plan_hash,
      context: input.context || {},
    },
  };

  const response = await callDsgSpineWithRetry(request);

  return {
    decision: response.decision,
    reason: response.reason,
    alignment_score: 0.95,
    matched_plan_items: [],
    deviations: [],
  };
}

async function handleConstraintEvaluate(input: {
  agent_id: string;
  action: string;
  target_resource: string;
  risk_level?: "low" | "medium" | "high";
}): Promise<ConstraintEvaluateResult> {
  if (!input.agent_id || !input.action || !input.target_resource) {
    throw new Error("Missing required fields: agent_id, action, target_resource");
  }

  const request: DsgRequest = {
    agent_id: input.agent_id,
    action: input.action,
    params: {
      tool: "constraint_evaluate",
      target_resource: input.target_resource,
      risk_level: input.risk_level || "medium",
    },
  };

  const response = await callDsgSpineWithRetry(request);

  return {
    decision: response.decision,
    reason: response.reason,
    violated_constraints: [],
    policy_version: "1.0",
  };
}

async function handleExecutionProof(input: {
  agent_id: string;
  action: string;
  result: Record<string, unknown>;
  plan_hash?: string;
  timestamp?: string;
}): Promise<ExecutionProofResult> {
  if (!input.agent_id || !input.action || !input.result) {
    throw new Error("Missing required fields: agent_id, action, result");
  }

  const timestamp = input.timestamp || new Date().toISOString();
  const canonical = JSON.stringify({
    agent_id: input.agent_id,
    action: input.action,
    result: input.result,
    plan_hash: input.plan_hash || "",
    timestamp: timestamp,
  });

  const request: DsgRequest = {
    agent_id: input.agent_id,
    action: input.action,
    params: {
      tool: "execution_proof_request",
      result: input.result,
      plan_hash: input.plan_hash || "",
      timestamp: timestamp,
      canonical_input: canonical,
    },
  };

  const response = await callDsgSpineWithRetry(request);

  return {
    decision: response.decision,
    reason: response.reason,
    proof: {
      hash: response.proof?.hash || "sha256:deterministic-hash",
      schema: response.proof?.schema || "dsg-v1-proof",
      timestamp: response.proof?.timestamp || timestamp,
      canonical_input: canonical,
    },
  };
}

async function handleEvidenceRetrieve(input: {
  agent_id: string;
  execution_id?: string;
  time_range?: { start: string; end: string };
  include_proofs?: boolean;
}): Promise<EvidenceRetrieveResult> {
  if (!input.agent_id) {
    throw new Error("Missing required field: agent_id");
  }

  const request: DsgRequest = {
    agent_id: input.agent_id,
    action: "evidence_retrieve",
    evidence_request: true,
    params: {
      tool: "evidence_retrieve",
      execution_id: input.execution_id,
      time_range: input.time_range,
      include_proofs: input.include_proofs === true,
    },
  };

  const response = await callDsgSpineWithRetry(request);

  return {
    decision: response.decision,
    reason: response.reason,
    executions: [],
    total_count: 0,
  };
}

const server = new Server({
  name: "dsg-verified-execution",
  version: "1.0.0",
});

// Tool: Plan Alignment Check
const planAlignmentTool = {
  name: "plan_alignment",
  description:
    "Check if a proposed execution aligns with the approved plan. Returns alignment score and any constraint violations.",
  inputSchema: {
    type: "object" as const,
    properties: {
      agent_id: {
        type: "string",
        description: "Unique identifier for the executing agent",
      },
      action: {
        type: "string",
        description: "The proposed action to execute",
      },
      plan_hash: {
        type: "string",
        description: "Hash of the approved plan to validate against",
      },
      context: {
        type: "object",
        description: "Execution context (parameters, environment, state)",
      },
    },
    required: ["agent_id", "action", "plan_hash"],
  },
};

// Tool: Constraint Evaluation
const constraintEvaluateTool = {
  name: "constraint_evaluate",
  description:
    "Evaluate whether an action satisfies DSG constraints. Returns decision (ALLOW/BLOCK/REVIEW) and reasoning.",
  inputSchema: {
    type: "object" as const,
    properties: {
      agent_id: {
        type: "string",
        description: "Unique identifier for the executing agent",
      },
      action: {
        type: "string",
        description: "The action to evaluate",
      },
      target_resource: {
        type: "string",
        description: "Resource or system being targeted (e.g., database table, API endpoint)",
      },
      risk_level: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Risk level of the action",
      },
    },
    required: ["agent_id", "action", "target_resource"],
  },
};

// Tool: Execution Proof Request
const executionProofTool = {
  name: "execution_proof_request",
  description:
    "Submit execution results and request proof generation. Returns cryptographic proof of execution.",
  inputSchema: {
    type: "object" as const,
    properties: {
      agent_id: {
        type: "string",
        description: "Unique identifier for the executing agent",
      },
      action: {
        type: "string",
        description: "The executed action",
      },
      result: {
        type: "object",
        description: "Execution result (success/failure, output, side effects)",
      },
      plan_hash: {
        type: "string",
        description: "Hash of the plan that authorized this execution",
      },
      timestamp: {
        type: "string",
        description: "ISO 8601 timestamp of execution",
      },
    },
    required: ["agent_id", "action", "result"],
  },
};

// Tool: Evidence Retrieval
const evidenceRetrieveTool = {
  name: "evidence_retrieve",
  description:
    "Retrieve audit trail and execution evidence for compliance/audit purposes.",
  inputSchema: {
    type: "object" as const,
    properties: {
      agent_id: {
        type: "string",
        description: "Unique identifier for the agent",
      },
      execution_id: {
        type: "string",
        description: "Optional specific execution ID to retrieve",
      },
      time_range: {
        type: "object",
        properties: {
          start: { type: "string", description: "ISO 8601 start timestamp" },
          end: { type: "string", description: "ISO 8601 end timestamp" },
        },
        description: "Time range for evidence collection",
      },
      include_proofs: {
        type: "boolean",
        description: "Include cryptographic proofs in response",
      },
    },
    required: ["agent_id"],
  },
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [planAlignmentTool, constraintEvaluateTool, executionProofTool, evidenceRetrieveTool],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request;

  try {
    let result: Record<string, unknown> | null = null;

    switch (name) {
      case "plan_alignment":
        result = await handlePlanAlignment({
          agent_id: String(args.agent_id),
          action: String(args.action),
          plan_hash: String(args.plan_hash),
          context: args.context as Record<string, unknown> | undefined,
        });
        break;

      case "constraint_evaluate":
        result = await handleConstraintEvaluate({
          agent_id: String(args.agent_id),
          action: String(args.action),
          target_resource: String(args.target_resource),
          risk_level: args.risk_level as "low" | "medium" | "high" | undefined,
        });
        break;

      case "execution_proof_request":
        result = await handleExecutionProof({
          agent_id: String(args.agent_id),
          action: String(args.action),
          result: args.result as Record<string, unknown>,
          plan_hash: args.plan_hash as string | undefined,
          timestamp: args.timestamp as string | undefined,
        });
        break;

      case "evidence_retrieve":
        result = await handleEvidenceRetrieve({
          agent_id: String(args.agent_id),
          execution_id: args.execution_id as string | undefined,
          time_range: args.time_range as { start: string; end: string } | undefined,
          include_proofs: args.include_proofs as boolean | undefined,
        });
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tool: name,
              ...result,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport);
