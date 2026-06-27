/**
 * Delegation Contract Types
 *
 * Defines the permission model for delegation-based execution,
 * including delegation contracts, work steps, and gate decisions.
 */

/**
 * DelegationContract represents a delegation of authority from a user
 * to an agent to perform actions within a specific scope.
 */
export interface DelegationContract {
  /** Unique identifier for this delegation */
  delegationId: string;

  /** Organization ID this delegation belongs to */
  orgId: string;

  /** User ID who is delegating authority */
  userId: string;

  /** High-level goal for the delegation (e.g., "Complete Stripe onboarding") */
  goal: string;

  /** Scope constraint (e.g., "browser.stripe_marketplace", "repo.deploy_staging") */
  scope: string;

  /** Actions explicitly allowed by this delegation */
  allowedActions: string[];

  /** Actions explicitly blocked by this delegation */
  blockedActions: string[];

  /** Actions that require user confirmation before execution */
  requiresUserConfirm: string[];

  /** When this delegation expires (ISO8601 format) */
  expiresAt: string;

  /** When this delegation was created (ISO8601 format) */
  createdAt?: string;

  /** When this delegation was last updated (ISO8601 format) */
  updatedAt?: string;
}

/**
 * AgentWorkStep represents a single action an agent wants to perform
 * as part of executing a delegated goal.
 */
export interface AgentWorkStep {
  /** Unique identifier for this step */
  stepId: string;

  /** Tool/system being used: 'browser' | 'repo' | 'email' | 'calendar' | 'deploy' | etc. */
  tool: string;

  /** Specific action on that tool (e.g., "fill_form", "submit_button", "commit_push") */
  action: string;

  /** Optional target for the action (e.g., URL, file path, email recipient) */
  target?: string;

  /** Risk level of this action */
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Whether this step requires explicit user confirmation */
  requiresConfirmation: boolean;

  /** Reason why confirmation is required (if applicable) */
  confirmationReason?: string;
}

/**
 * GateDecision represents the outcome of checking a work step against
 * a delegation contract via the permission gate.
 */
export interface GateDecision {
  /** The decision: ALLOW | REVIEW | BLOCK */
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';

  /** Reason for the decision */
  reason: string;

  /** Additional evidence or context */
  evidence?: Record<string, unknown>;

  /** List of evidence types that should be collected to upgrade the decision */
  evidenceRequired?: string[];
}

/**
 * DelegationValidationResult represents the result of validating
 * a delegation contract.
 */
export interface DelegationValidationResult {
  /** Whether the delegation is valid */
  valid: boolean;

  /** List of validation errors (empty if valid) */
  errors: string[];

  /** List of validation warnings (non-fatal issues) */
  warnings: string[];
}

/**
 * PermissionCheckContext provides additional context for permission checks.
 */
export interface PermissionCheckContext {
  /** The agent performing the action */
  agentId?: string;

  /** Request ID for tracing */
  requestId?: string;

  /** Whether user is currently present/monitoring */
  userPresent?: boolean;

  /** Additional context data */
  metadata?: Record<string, unknown>;
}
