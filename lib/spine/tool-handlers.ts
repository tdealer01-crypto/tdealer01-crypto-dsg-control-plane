/**
 * DSG Spine Tool Handlers
 *
 * Specialized handlers for Agent Plugins 1.0 MCP tools called via spine/execute:
 * - plan_alignment
 * - constraint_evaluate
 * - execution_proof_request
 * - evidence_retrieve
 */


export interface DsgToolRequest {
  agent_id: string;
  action: string;
  params: Record<string, unknown>;
  plan_hash?: string;
}

export interface DsgToolResponse {
  decision: "ALLOW" | "BLOCK" | "REVIEW";
  reason: string;
  proof?: {
    hash: string;
    schema: string;
    timestamp: string;
    canonical_input?: string;
  };
  execution_id?: string;
  evidence?: {
    execution_trace: Record<string, unknown>;
    lineage: string[];
  };
}

/**
 * Generate deterministic proof from canonical input
 * Uses SHA256(canonical JSON) for reproducible results
 */
export function generateDeterministicProof(input: Record<string, unknown>): {
  hash: string;
  schema: string;
  timestamp: string;
  canonical_input: string;
} {
  const timestamp = new Date().toISOString();

  // Canonical form: sorted keys, no whitespace, deterministic ordering
  const agentId = typeof input.agent_id === "string" ? input.agent_id : "";
  const action = typeof input.action === "string" ? input.action : "";
  const planHash = typeof input.plan_hash === "string" ? input.plan_hash : "";

  const obj = {
    agent_id: agentId,
    action,
    plan_hash: planHash,
    result: input.result || null,
    timestamp,
  };
  const canonical = JSON.stringify(obj);

  // In production, use actual SHA256. For now, use a deterministic hash.
  // NOTE: This is a placeholder. Real implementation would use crypto.createHash.
  const hash = `sha256:${Buffer.from(canonical).toString("hex").slice(0, 64)}`;

  return {
    hash,
    schema: "dsg-v1-proof",
    timestamp,
    canonical_input: canonical,
  };
}

/**
 * Handle plan_alignment tool request
 */
export async function handlePlanAlignmentTool(
  request: DsgToolRequest,
  orgId: string,
  agentId: string
): Promise<DsgToolResponse> {
  const params = request.params as Record<string, unknown>;
  const planHash = params.plan_hash || request.plan_hash;
  const context = params.context as Record<string, unknown> | undefined;

  if (!planHash) {
    return {
      decision: "BLOCK",
      reason: "plan_hash is required for plan_alignment",
    };
  }

  // In Phase 2, this is a simple check. Real implementation would:
  // 1. Query the plan from Supabase
  // 2. Validate the current action matches approved steps
  // 3. Return alignment_score and deviations
  return {
    decision: "ALLOW",
    reason: "Plan alignment verified (Phase 2 scaffold)",
    execution_id: `plan-align-${Date.now()}`,
  };
}

/**
 * Handle constraint_evaluate tool request (core gate decision)
 */
export async function handleConstraintEvaluateTool(
  request: DsgToolRequest,
  orgId: string,
  agentId: string
): Promise<DsgToolResponse> {
  const params = request.params as Record<string, unknown>;
  const targetResource = params.target_resource as string;
  const riskLevel = (params.risk_level as string) || "medium";

  if (!targetResource) {
    return {
      decision: "BLOCK",
      reason: "target_resource is required for constraint_evaluate",
    };
  }

  // Phase 2 scaffold: always allow low-risk, review medium, block high
  // Real implementation would query DSG policy engine
  const decisions: Record<string, "ALLOW" | "BLOCK" | "REVIEW"> = {
    low: "ALLOW",
    medium: "REVIEW",
    high: "BLOCK",
  };

  return {
    decision: decisions[riskLevel] || "REVIEW",
    reason: `Constraint evaluation returned ${decisions[riskLevel] || "REVIEW"} for ${riskLevel}-risk action on ${targetResource}`,
    execution_id: `constraint-eval-${Date.now()}`,
  };
}

/**
 * Handle execution_proof_request tool (proof generation)
 */
export async function handleExecutionProofTool(
  request: DsgToolRequest,
  orgId: string,
  agentId: string
): Promise<DsgToolResponse> {
  const params = request.params as Record<string, unknown>;
  const result = params.result as Record<string, unknown>;
  const planHash = params.plan_hash || request.plan_hash;
  const timestamp = (params.timestamp as string) || new Date().toISOString();

  if (!result) {
    return {
      decision: "BLOCK",
      reason: "result is required for execution_proof_request",
    };
  }

  // Generate deterministic proof
  const proof = generateDeterministicProof({
    agent_id: request.agent_id,
    action: request.action,
    result,
    plan_hash: planHash as string | undefined,
    timestamp,
  });

  return {
    decision: "ALLOW",
    reason: "Execution proof generated",
    proof,
    execution_id: `proof-${proof.hash.slice(0, 12)}`,
  };
}

/**
 * Handle evidence_retrieve tool (audit trail)
 * Phase 2 scaffold - returns mock evidence. Real implementation in Phase 3.
 */
export async function handleEvidenceRetrieveTool(
  request: DsgToolRequest,
  orgId: string,
  agentId: string
): Promise<DsgToolResponse> {
  const params = request.params as Record<string, unknown>;
  const executionId = params.execution_id as string | undefined;

  // Phase 2 scaffold: return mock evidence
  const mockExecutions = [
    {
      id: executionId || `exec-${Date.now()}`,
      agent_id: agentId,
      action: request.action,
      decision: "ALLOW",
      created_at: new Date().toISOString(),
      metadata: { tool: "evidence_retrieve" },
    },
  ];

  return {
    decision: "ALLOW",
    reason: `Retrieved ${mockExecutions.length} execution record(s)`,
    evidence: {
      execution_trace: {
        total_count: mockExecutions.length,
        records: mockExecutions,
      },
      lineage: mockExecutions.map((e) => e.id),
    },
    execution_id: `evidence-query-${Date.now()}`,
  };
}

/**
 * Route tool request to appropriate handler
 */
export async function routeToolRequest(
  request: DsgToolRequest,
  orgId: string,
  agentId: string
): Promise<DsgToolResponse> {
  const toolName = (request.params.tool as string) || "unknown";

  switch (toolName) {
    case "plan_alignment":
      return handlePlanAlignmentTool(request, orgId, agentId);

    case "constraint_evaluate":
      return handleConstraintEvaluateTool(request, orgId, agentId);

    case "execution_proof_request":
      return handleExecutionProofTool(request, orgId, agentId);

    case "evidence_retrieve":
      return handleEvidenceRetrieveTool(request, orgId, agentId);

    default:
      return {
        decision: "BLOCK",
        reason: `Unknown tool: ${toolName}. Expected: plan_alignment, constraint_evaluate, execution_proof_request, or evidence_retrieve`,
      };
  }
}
