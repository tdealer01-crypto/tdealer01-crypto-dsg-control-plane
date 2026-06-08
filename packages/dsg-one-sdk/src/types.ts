/**
 * DSG ONE SDK - TypeScript type definitions
 * 
 * API Reference:
 * - POST /api/agents → Creates agent, returns { apiKey: "dsg_live_...", agentId }
 * - POST /api/execute (alias /api/spine/execute) → Executes governed action with Bearer token
 */

export interface DsgOneConfig {
  /** Base URL of the DSG ONE API (default: https://dsg-one-v1.vercel.app) */
  baseUrl?: string;
  /** API key for authentication (format: dsg_live_...) */
  apiKey?: string;
  /** Default headers to include in all requests */
  defaultHeaders?: Record<string, string>;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Response from POST /api/agents
 */
export interface CreateAgentResponse {
  agent_id: string;
  name: string;
  policy_id: string | null;
  status: "active" | "disabled";
  monthly_limit: number;
  api_key: string;
  api_key_preview: string;
}

/**
 * Minimal agent info (from GET /api/agents)
 */
export interface AgentInfo {
  agent_id: string;
  name: string;
  policy_id: string | null;
  status: "active" | "disabled";
  monthly_limit: number;
  usage_this_month: number;
  api_key_preview: string;
}

/**
 * Paginated list of agents
 */
export interface AgentListResponse {
  items: AgentInfo[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Decision types from the spine engine
 */
export type Decision = "ALLOW" | "STABILIZE" | "BLOCK";

/**
 * Proof object returned by the spine engine
 */
export interface Proof {
  proof_hash: string | null;
  proof_version: string | null;
  theorem_set_id: string | null;
  solver: string | null;
}

/**
 * Pipeline stage trace
 */
export interface PipelineStageTrace {
  plugin_id: string;
  decision: Decision;
  reason: string;
  latency_ms: number;
  proof_hash: string | null;
}

/**
 * Usage information
 */
export interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
}

/**
 * Response from POST /api/execute (spine execute)
 */
export interface ExecuteResponse {
  ok: boolean;
  request_id: string;
  audit_id: string;
  decision: Decision;
  decision_normalized: string;
  reason: string | null;
  latency_ms: number;
  policy_version: string;
  replayed: boolean;
  ledger_sequence: number;
  truth_sequence: number;
  usage: UsageInfo;
  proof: Proof;
  authoritative_plugin_id: string;
  pipeline_trace: PipelineStageTrace[];
}

/**
 * Error response from API
 */
export interface DsgApiError {
  error: string;
  status: number;
  details?: Record<string, unknown>;
}

/**
 * Input for execute call
 */
export interface ExecuteInput {
  /** Agent ID to execute against */
  agentId: string;
  /** Action name (e.g., "scan", "trade", "transfer") */
  action: string;
  /** Input parameters for the action */
  input: Record<string, unknown>;
  /** Optional context (e.g., user info, session data) */
  context?: Record<string, unknown>;
}

/**
 * Options for creating an agent
 */
export interface CreateAgentOptions {
  /** Agent name (2-80 characters) */
  name: string;
  /** Monthly execution limit (default: 10000) */
  monthlyLimit?: number;
  /** Optional policy ID to assign */
  policyId?: string;
}

/**
 * Quota information from GET /api/usage
 */
export interface QuotaInfo {
  agent_id: string;
  billing_period: string;
  executions: number;
  limit: number;
  remaining: number;
  overage_rate_usd: number;
  plan_key: string;
}

/**
 * Class for DSG ONE API errors
 */
export class DsgOneError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, status: number, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "DsgOneError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static fromResponse(error: DsgApiError, status: number): DsgOneError {
    const codeMap: Record<string, string> = {
      "Too many requests": "RATE_LIMITED",
      "Missing Bearer token": "UNAUTHENTICATED",
      "Invalid agent_id or API key": "INVALID_CREDENTIALS",
      "Agent is not active": "AGENT_INACTIVE",
      "Monthly execution quota exceeded": "QUOTA_EXCEEDED",
      "agent_id is required": "MISSING_AGENT_ID",
      "name must be between 2 and 80 characters": "INVALID_NAME",
      "monthly_limit must be between 1 and 1000000": "INVALID_LIMIT",
      "Maximum 100 agents per organization": "MAX_AGENTS_REACHED",
      "policy_id is invalid or not found": "INVALID_POLICY",
    };

    const code = codeMap[error.error] || "API_ERROR";
    return new DsgOneError(error.error, status, code, error.details);
  }
}