/**
 * Tool Execution Result Types
 *
 * Defines the standardized result format returned by all tool executors.
 */

/**
 * Result from executing a delegated tool action.
 * All executors return this interface for consistency.
 */
export interface ToolExecutionResult {
  /** Whether execution was allowed and succeeded */
  ok: boolean;

  /** Reason for the decision (e.g., "Email draft created for review" or "Blocked: production deployment requires confirm") */
  reason: string;

  /** List of artifact IDs/hashes for audit trail (manifestHash, prUrl, draftId, etc.) */
  evidence: string[];

  /** Optional action required from user (e.g., "CONFIRM_DRAFT", "APPROVE_PRODUCTION") */
  actionRequired?: string;

  /** Optional redirect URL (for draft review, PR link, etc.) */
  actionUrl?: string;
}

/**
 * Error result for blocked execution.
 */
export function blockedResult(reason: string, evidence: string[] = []): ToolExecutionResult {
  return { ok: false, reason, evidence };
}

/**
 * Success result for allowed execution.
 */
export function successResult(reason: string, evidence: string[], actionRequired?: string, actionUrl?: string): ToolExecutionResult {
  return { ok: true, reason, evidence, actionRequired, actionUrl };
}

/**
 * Pending result requiring user action.
 */
export function pendingResult(reason: string, evidence: string[], actionRequired: string, actionUrl?: string): ToolExecutionResult {
  return { ok: true, reason, evidence, actionRequired, actionUrl };
}
