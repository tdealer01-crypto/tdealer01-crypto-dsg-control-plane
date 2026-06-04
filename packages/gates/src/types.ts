/**
 * DSG Gates - Policy Gate TypeScript Types
 * Core types for gate evaluation and policy configuration
 */

/**
 * Gate decision outcomes
 */
export type GateDecision = 'ALLOW' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED';

/**
 * Risk severity levels for gate evaluation
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Gate request - what the agent/user is trying to do
 */
export interface GateRequest {
  /** Unique execution ID */
  executionId: string;

  /** Agent ID making the request */
  agentId: string;

  /** Organization ID */
  orgId: string;

  /** Action being requested (e.g., "send email", "deploy code", "transfer funds") */
  action: string;

  /** Input parameters for the action */
  input?: Record<string, unknown>;

  /** Additional context (user info, environment, etc.) */
  context?: {
    userId?: string;
    sessionId?: string;
    timestamp?: string;
    source?: 'api' | 'cli' | 'web' | 'agent';
    metadata?: Record<string, unknown>;
  };

  /** Policy to evaluate against (optional - can use org default) */
  policy?: GatePolicyConfig;
}

/**
 * Gate response - decision and reasoning
 */
export interface GateResponse {
  /** Gate decision */
  decision: GateDecision;

  /** Reasoning for the decision */
  reason: string;

  /** Risk score (0-100) */
  riskScore: number;

  /** Risk level */
  riskLevel: RiskLevel;

  /** Execution ID for tracking */
  executionId: string;

  /** Policy version used */
  policyVersion: string;

  /** Policy hash for reproducibility */
  policyHash: string;

  /** Proof/evidence of the decision */
  proof: {
    timestamp: string;
    requestHash: string;
    decisionHash: string;
    lineage?: string[];
  };

  /** Cost/token usage */
  cost?: {
    tokens: number;
    estimatedCost?: number;
  };

  /** Required approvals (if REVIEW decision) */
  approvalsRequired?: number;

  /** Approved by user IDs (if ALLOW decision) */
  approvedBy?: string[];

  /** Approval deadline (if REVIEW decision) */
  approvalDeadline?: string;

  /** Suggested next steps */
  suggestedAction?: string;
}

/**
 * Policy constraint - individual rule
 */
export interface PolicyConstraint {
  /** Constraint ID */
  id: string;

  /** Constraint type */
  type: 'role_check' | 'amount_limit' | 'time_window' | 'path_pattern' | 'custom_predicate';

  /** Constraint operator */
  operator: 'eq' | 'lt' | 'gt' | 'lte' | 'gte' | 'contains' | 'matches' | 'in' | 'custom';

  /** Expected value */
  value?: unknown;

  /** Human-readable description */
  description: string;

  /** Risk level if violated */
  riskLevel: RiskLevel;

  /** Whether this constraint blocks execution */
  isBlocker: boolean;
}

/**
 * Policy config - defines what's allowed
 */
export interface GatePolicyConfig {
  /** Policy ID */
  id: string;

  /** Policy version (semver) */
  version: string;

  /** Policy name */
  name: string;

  /** Policy description */
  description: string;

  /** List of constraints to evaluate */
  constraints: PolicyConstraint[];

  /** Default decision if no constraints match */
  defaultDecision: GateDecision;

  /** Require approval for ALLOW decisions */
  requireApproval: boolean;

  /** Approval timeout (minutes) */
  approvalTimeoutMinutes?: number;

  /** Roles that can auto-approve */
  autoApproveRoles?: string[];

  /** Actions this policy applies to (regex patterns) */
  actionPatterns: string[];

  /** Created at timestamp */
  createdAt: string;

  /** Updated at timestamp */
  updatedAt: string;

  /** Created by user ID */
  createdBy?: string;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Policy evaluation result (internal)
 */
export interface PolicyEvaluationResult {
  decision: GateDecision;
  riskScore: number;
  riskLevel: RiskLevel;
  constraintMatches: {
    constraintId: string;
    matched: boolean;
    reason: string;
  }[];
  reason: string;
}

/**
 * Gate error
 */
export class GateError extends Error {
  constructor(
    public code: 'POLICY_NOT_FOUND' | 'INVALID_POLICY' | 'VALIDATION_FAILED' | 'EVALUATION_ERROR' | 'NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'GateError';
  }
}

/**
 * Policy validation error
 */
export interface PolicyValidationError {
  path: string;
  message: string;
  value?: unknown;
}
