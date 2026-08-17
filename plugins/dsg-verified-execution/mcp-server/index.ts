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

const DSG_API_URL = process.env.DSG_API_URL || "https://tdealer01-crypto-dsg-control-plane.vercel.app";
const DSG_API_KEY = process.env.DSG_API_KEY;

if (!DSG_API_KEY) {
  throw new Error("DSG_API_KEY environment variable is required");
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
    const dsgRequest: DsgRequest = {
      agent_id: String(args.agent_id),
      action: String(args.action),
      params: {
        tool: name,
        ...args,
      },
    };

    if (args.plan_hash) {
      dsgRequest.plan_hash = String(args.plan_hash);
    }

    if (args.evidence_request || name === "evidence_retrieve") {
      dsgRequest.evidence_request = true;
    }

    const response = await fetch(`${DSG_API_URL}/api/spine/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DSG_API_KEY}`,
      },
      body: JSON.stringify(dsgRequest),
    });

    if (!response.ok) {
      throw new Error(`DSG API error: ${response.statusText}`);
    }

    const data: DsgResponse = await response.json();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tool: name,
              decision: data.decision,
              reason: data.reason,
              proof: data.proof || null,
              evidence: data.evidence || null,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport);
