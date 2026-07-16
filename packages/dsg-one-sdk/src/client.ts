/**
 * DSG ONE SDK - Main client
 * 
 * A TypeScript client for the DSG ONE governed execution API.
 * 
 * Quick start:
 * ```typescript
 * import { DsgOneClient } from "dsg-one-sdk";
 * 
 * const client = new DsgOneClient({ apiKey: "dsg_live_..." });
 * const result = await client.execute({ agentId, action: "scan", input: { ... } });
 * ```
 */

import type {
  DsgOneConfig,
  CreateAgentResponse,
  AgentInfo,
  AgentListResponse,
  ExecuteInput,
  ExecuteResponse,
  CreateAgentOptions,
  QuotaInfo,
} from "./types";
import { DsgOneError } from "./types";

const DEFAULT_BASE_URL = "https://tdealer01-crypto-dsg-control-plane.vercel.app";
const DEFAULT_TIMEOUT = 30000;

export class DsgOneClient {
  private baseUrl: string;
  private apiKey: string | undefined;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(config: DsgOneConfig = {}) {
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.apiKey = config.apiKey;
    this.defaultHeaders = config.defaultHeaders || {};
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
  }

  /**
   * Set or update the API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Get the current API key
   */
  getApiKey(): string | undefined {
    return this.apiKey;
  }

  /**
   * Set the base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  /**
   * Private fetch wrapper with timeout and error handling
   */
  private async fetchWithTimeout(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...this.defaultHeaders,
        ...(options.headers as Record<string, string>),
      };

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse JSON response with error handling
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    if (!response.ok) {
      let errorData: { error?: string; details?: Record<string, unknown> } = {};
      if (isJson) {
        errorData = await response.json().catch(() => ({}));
      } else {
        errorData.error = await response.text().catch(() => response.statusText);
      }
      throw DsgOneError.fromResponse(
        { error: errorData.error || response.statusText, details: errorData.details, status: response.status },
        response.status
      );
    }

    if (isJson) {
      return response.json();
    }

    // For non-JSON responses (shouldn't happen in normal operation)
    const text = await response.text();
    return JSON.parse(text) as T;
  }

  // =========================================================================
  // Agent Management
  // =========================================================================

  /**
   * Create a new agent
   * POST /api/agents
   */
  async createAgent(options: CreateAgentOptions): Promise<CreateAgentResponse> {
    const response = await this.fetchWithTimeout("/api/agents", {
      method: "POST",
      body: JSON.stringify({
        name: options.name,
        monthly_limit: options.monthlyLimit || 10000,
        policy_id: options.policyId,
      }),
    });

    return this.parseResponse<CreateAgentResponse>(response);
  }

  /**
   * List all agents for the organization
   * GET /api/agents
   */
  async listAgents(params?: {
    page?: number;
    perPage?: number;
    includeDisabled?: boolean;
  }): Promise<AgentListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.perPage) searchParams.set("per_page", String(params.perPage));
    if (params?.includeDisabled) searchParams.set("include_disabled", "true");

    const queryString = searchParams.toString();
    const endpoint = `/api/agents${queryString ? `?${queryString}` : ""}`;

    const response = await this.fetchWithTimeout(endpoint, { method: "GET" });
    return this.parseResponse<AgentListResponse>(response);
  }

  /**
   * Get a single agent by ID
   * GET /api/agents/:id
   */
  async getAgent(agentId: string): Promise<AgentInfo> {
    const response = await this.fetchWithTimeout(`/api/agents/${encodeURIComponent(agentId)}`, {
      method: "GET",
    });
    return this.parseResponse<AgentInfo>(response);
  }

  /**
   * Rotate an agent's API key
   * POST /api/agents/:id/rotate-key
   */
  async rotateAgentKey(agentId: string): Promise<{ api_key: string; api_key_preview: string }> {
    const response = await this.fetchWithTimeout(
      `/api/agents/${encodeURIComponent(agentId)}/rotate-key`,
      { method: "POST" }
    );
    return this.parseResponse(response);
  }

  /**
   * Delete (disable) an agent
   * DELETE /api/agents/:id
   */
  async deleteAgent(agentId: string): Promise<void> {
    const response = await this.fetchWithTimeout(
      `/api/agents/${encodeURIComponent(agentId)}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      await this.parseResponse<never>(response); // Will throw
    }
  }

  // =========================================================================
  // Execution (Spine)
  // =========================================================================

  /**
   * Execute a governed action via the spine engine
   * POST /api/execute (alias /api/spine/execute)
   * 
   * @param input - Execution input including agentId, action, input, and optional context
   * @returns ExecuteResponse with decision, proof, audit trail, and usage info
   * 
   * @example
   * ```typescript
   * const result = await client.execute({
   *   agentId: "agent_123",
   *   action: "scan",
   *   input: { token: "ETH", amount: 100 },
   *   context: { userId: "user_456", sessionId: "sess_789" }
   * });
   * 
   * if (result.decision === "ALLOW") {
   *   // Proceed with the action
   * } else {
   *   // Handle BLOCK or STABILIZE
   * }
   * ```
   */
  async execute(input: ExecuteInput): Promise<ExecuteResponse> {
    const response = await this.fetchWithTimeout("/api/execute", {
      method: "POST",
      body: JSON.stringify({
        agent_id: input.agentId,
        action: input.action,
        input: input.input,
        context: input.context,
      }),
    });

    return this.parseResponse<ExecuteResponse>(response);
  }

  /**
   * Execute with a pre-created intent (for approval flows)
   * POST /api/execute with canonicalRequest
   */
  async executeWithIntent(input: ExecuteInput & { canonicalRequest: ExecuteInput }): Promise<ExecuteResponse> {
    const response = await this.fetchWithTimeout("/api/execute", {
      method: "POST",
      body: JSON.stringify({
        agent_id: input.agentId,
        action: input.action,
        input: input.input,
        context: input.context,
        intent: {
          agent_id: input.canonicalRequest.agentId,
          action: input.canonicalRequest.action,
          input: input.canonicalRequest.input,
          context: input.canonicalRequest.context,
        },
      }),
    });

    return this.parseResponse<ExecuteResponse>(response);
  }

  // =========================================================================
  // Quota & Usage
  // =========================================================================

  /**
   * Get quota/usage information for the authenticated organization
   * GET /api/usage
   */
  async getQuota(): Promise<QuotaInfo[]> {
    const response = await this.fetchWithTimeout("/api/usage", { method: "GET" });
    return this.parseResponse<QuotaInfo[]>(response);
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  /**
   * Check if the client is configured with an API key
   */
  isAuthenticated(): boolean {
    return !!this.apiKey;
  }

  /**
   * Create a new client with a different API key (useful for multi-tenant)
   */
  withApiKey(apiKey: string): DsgOneClient {
    return new DsgOneClient({
      baseUrl: this.baseUrl,
      apiKey,
      defaultHeaders: this.defaultHeaders,
      timeout: this.timeout,
    });
  }

  /**
   * Create a new client with a different base URL (useful for staging/local)
   */
  withBaseUrl(baseUrl: string): DsgOneClient {
    return new DsgOneClient({
      baseUrl,
      apiKey: this.apiKey,
      defaultHeaders: this.defaultHeaders,
      timeout: this.timeout,
    });
  }
}

/**
 * Convenience function to create a client with minimal config
 */
export function createClient(config: DsgOneConfig): DsgOneClient {
  return new DsgOneClient(config);
}

/**
 * Convenience function to create a client from environment variables
 * Reads DSG_API_KEY and DSG_BASE_URL from process.env
 */
export function createClientFromEnv(env?: Record<string, string | undefined>): DsgOneClient {
  const resolvedEnv = env ?? (typeof globalThis !== "undefined" && "process" in globalThis 
    ? (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env 
    : {});
  return new DsgOneClient({
    apiKey: resolvedEnv.DSG_API_KEY,
    baseUrl: resolvedEnv.DSG_BASE_URL,
  });
}

export { DsgOneError } from "./types";
export type {
  DsgOneConfig,
  CreateAgentResponse,
  AgentInfo,
  AgentListResponse,
  ExecuteInput,
  ExecuteResponse,
  CreateAgentOptions,
  QuotaInfo,
  Decision,
  Proof,
  PipelineStageTrace,
  UsageInfo,
} from "./types";