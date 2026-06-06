"use strict";
/**
 * DSG ONE SDK - TypeScript type definitions
 *
 * API Reference:
 * - POST /api/agents → Creates agent, returns { apiKey: "dsg_live_...", agentId }
 * - POST /api/execute (alias /api/spine/execute) → Executes governed action with Bearer token
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DsgOneError = void 0;
/**
 * Class for DSG ONE API errors
 */
class DsgOneError extends Error {
    status;
    code;
    details;
    constructor(message, status, code, details) {
        super(message);
        this.name = "DsgOneError";
        this.status = status;
        this.code = code;
        this.details = details;
    }
    static fromResponse(error, status) {
        const codeMap = {
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
exports.DsgOneError = DsgOneError;
//# sourceMappingURL=types.js.map