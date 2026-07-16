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
import type { DsgOneConfig, CreateAgentResponse, AgentInfo, AgentListResponse, ExecuteInput, ExecuteResponse, CreateAgentOptions, QuotaInfo } from "./types";
export declare class DsgOneClient {
    private baseUrl;
    private apiKey;
    private defaultHeaders;
    private timeout;
    constructor(config?: DsgOneConfig);
    /**
     * Set or update the API key
     */
    setApiKey(apiKey: string): void;
    /**
     * Get the current API key
     */
    getApiKey(): string | undefined;
    /**
     * Set the base URL
     */
    setBaseUrl(baseUrl: string): void;
    /**
     * Private fetch wrapper with timeout and error handling
     */
    private fetchWithTimeout;
    /**
     * Parse JSON response with error handling
     */
    private parseResponse;
    /**
     * Create a new agent
     * POST /api/agents
     */
    createAgent(options: CreateAgentOptions): Promise<CreateAgentResponse>;
    /**
     * List all agents for the organization
     * GET /api/agents
     */
    listAgents(params?: {
        page?: number;
        perPage?: number;
        includeDisabled?: boolean;
    }): Promise<AgentListResponse>;
    /**
     * Get a single agent by ID
     * GET /api/agents/:id
     */
    getAgent(agentId: string): Promise<AgentInfo>;
    /**
     * Rotate an agent's API key
     * POST /api/agents/:id/rotate-key
     */
    rotateAgentKey(agentId: string): Promise<{
        api_key: string;
        api_key_preview: string;
    }>;
    /**
     * Delete (disable) an agent
     * DELETE /api/agents/:id
     */
    deleteAgent(agentId: string): Promise<void>;
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
    execute(input: ExecuteInput): Promise<ExecuteResponse>;
    /**
     * Execute with a pre-created intent (for approval flows)
     * POST /api/execute with canonicalRequest
     */
    executeWithIntent(input: ExecuteInput & {
        canonicalRequest: ExecuteInput;
    }): Promise<ExecuteResponse>;
    /**
     * Get quota/usage information for the authenticated organization
     * GET /api/usage
     */
    getQuota(): Promise<QuotaInfo[]>;
    /**
     * Check if the client is configured with an API key
     */
    isAuthenticated(): boolean;
    /**
     * Create a new client with a different API key (useful for multi-tenant)
     */
    withApiKey(apiKey: string): DsgOneClient;
    /**
     * Create a new client with a different base URL (useful for staging/local)
     */
    withBaseUrl(baseUrl: string): DsgOneClient;
}
/**
 * Convenience function to create a client with minimal config
 */
export declare function createClient(config: DsgOneConfig): DsgOneClient;
/**
 * Convenience function to create a client from environment variables
 * Reads DSG_API_KEY and DSG_BASE_URL from process.env
 */
export declare function createClientFromEnv(env?: Record<string, string | undefined>): DsgOneClient;
export { DsgOneError } from "./types";
export type { DsgOneConfig, CreateAgentResponse, AgentInfo, AgentListResponse, ExecuteInput, ExecuteResponse, CreateAgentOptions, QuotaInfo, Decision, Proof, PipelineStageTrace, UsageInfo, } from "./types";
//# sourceMappingURL=client.d.ts.map