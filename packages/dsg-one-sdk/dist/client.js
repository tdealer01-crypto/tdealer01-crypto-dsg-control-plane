"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DsgOneError = exports.DsgOneClient = void 0;
exports.createClient = createClient;
exports.createClientFromEnv = createClientFromEnv;
const types_1 = require("./types");
const DEFAULT_BASE_URL = "https://tdealer01-crypto-dsg-control-plane.vercel.app";
const DEFAULT_TIMEOUT = 30000;
class DsgOneClient {
    baseUrl;
    apiKey;
    defaultHeaders;
    timeout;
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
        this.apiKey = config.apiKey;
        this.defaultHeaders = config.defaultHeaders || {};
        this.timeout = config.timeout || DEFAULT_TIMEOUT;
    }
    /**
     * Set or update the API key
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }
    /**
     * Get the current API key
     */
    getApiKey() {
        return this.apiKey;
    }
    /**
     * Set the base URL
     */
    setBaseUrl(baseUrl) {
        this.baseUrl = baseUrl;
    }
    /**
     * Private fetch wrapper with timeout and error handling
     */
    async fetchWithTimeout(endpoint, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const headers = {
                "Content-Type": "application/json",
                ...this.defaultHeaders,
                ...options.headers,
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
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    /**
     * Parse JSON response with error handling
     */
    async parseResponse(response) {
        const contentType = response.headers.get("content-type");
        const isJson = contentType?.includes("application/json");
        if (!response.ok) {
            let errorData = {};
            if (isJson) {
                errorData = await response.json().catch(() => ({}));
            }
            else {
                errorData.error = await response.text().catch(() => response.statusText);
            }
            throw types_1.DsgOneError.fromResponse({ error: errorData.error || response.statusText, details: errorData.details, status: response.status }, response.status);
        }
        if (isJson) {
            return response.json();
        }
        // For non-JSON responses (shouldn't happen in normal operation)
        const text = await response.text();
        return JSON.parse(text);
    }
    // =========================================================================
    // Agent Management
    // =========================================================================
    /**
     * Create a new agent
     * POST /api/agents
     */
    async createAgent(options) {
        const response = await this.fetchWithTimeout("/api/agents", {
            method: "POST",
            body: JSON.stringify({
                name: options.name,
                monthly_limit: options.monthlyLimit || 10000,
                policy_id: options.policyId,
            }),
        });
        return this.parseResponse(response);
    }
    /**
     * List all agents for the organization
     * GET /api/agents
     */
    async listAgents(params) {
        const searchParams = new URLSearchParams();
        if (params?.page)
            searchParams.set("page", String(params.page));
        if (params?.perPage)
            searchParams.set("per_page", String(params.perPage));
        if (params?.includeDisabled)
            searchParams.set("include_disabled", "true");
        const queryString = searchParams.toString();
        const endpoint = `/api/agents${queryString ? `?${queryString}` : ""}`;
        const response = await this.fetchWithTimeout(endpoint, { method: "GET" });
        return this.parseResponse(response);
    }
    /**
     * Get a single agent by ID
     * GET /api/agents/:id
     */
    async getAgent(agentId) {
        const response = await this.fetchWithTimeout(`/api/agents/${encodeURIComponent(agentId)}`, {
            method: "GET",
        });
        return this.parseResponse(response);
    }
    /**
     * Rotate an agent's API key
     * POST /api/agents/:id/rotate-key
     */
    async rotateAgentKey(agentId) {
        const response = await this.fetchWithTimeout(`/api/agents/${encodeURIComponent(agentId)}/rotate-key`, { method: "POST" });
        return this.parseResponse(response);
    }
    /**
     * Delete (disable) an agent
     * DELETE /api/agents/:id
     */
    async deleteAgent(agentId) {
        const response = await this.fetchWithTimeout(`/api/agents/${encodeURIComponent(agentId)}`, { method: "DELETE" });
        if (!response.ok) {
            await this.parseResponse(response); // Will throw
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
    async execute(input) {
        const response = await this.fetchWithTimeout("/api/execute", {
            method: "POST",
            body: JSON.stringify({
                agent_id: input.agentId,
                action: input.action,
                input: input.input,
                context: input.context,
            }),
        });
        return this.parseResponse(response);
    }
    /**
     * Execute with a pre-created intent (for approval flows)
     * POST /api/execute with canonicalRequest
     */
    async executeWithIntent(input) {
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
        return this.parseResponse(response);
    }
    // =========================================================================
    // Quota & Usage
    // =========================================================================
    /**
     * Get quota/usage information for the authenticated organization
     * GET /api/usage
     */
    async getQuota() {
        const response = await this.fetchWithTimeout("/api/usage", { method: "GET" });
        return this.parseResponse(response);
    }
    // =========================================================================
    // Utility Methods
    // =========================================================================
    /**
     * Check if the client is configured with an API key
     */
    isAuthenticated() {
        return !!this.apiKey;
    }
    /**
     * Create a new client with a different API key (useful for multi-tenant)
     */
    withApiKey(apiKey) {
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
    withBaseUrl(baseUrl) {
        return new DsgOneClient({
            baseUrl,
            apiKey: this.apiKey,
            defaultHeaders: this.defaultHeaders,
            timeout: this.timeout,
        });
    }
}
exports.DsgOneClient = DsgOneClient;
/**
 * Convenience function to create a client with minimal config
 */
function createClient(config) {
    return new DsgOneClient(config);
}
/**
 * Convenience function to create a client from environment variables
 * Reads DSG_API_KEY and DSG_BASE_URL from process.env
 */
function createClientFromEnv(env) {
    const resolvedEnv = env ?? (typeof globalThis !== "undefined" && "process" in globalThis
        ? globalThis.process.env
        : {});
    return new DsgOneClient({
        apiKey: resolvedEnv.DSG_API_KEY,
        baseUrl: resolvedEnv.DSG_BASE_URL,
    });
}
var types_2 = require("./types");
Object.defineProperty(exports, "DsgOneError", { enumerable: true, get: function () { return types_2.DsgOneError; } });
//# sourceMappingURL=client.js.map