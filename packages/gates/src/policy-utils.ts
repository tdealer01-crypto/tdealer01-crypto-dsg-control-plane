/**
 * Policy validation and evaluation utilities
 */

import {
  GatePolicyConfig,
  GateRequest,
  PolicyValidationError,
  PolicyEvaluationResult,
  GateDecision,
  RiskLevel,
  GateError,
} from './types';
import crypto from 'crypto';

/**
 * Validate a policy configuration for correctness
 */
export function validatePolicy(policy: GatePolicyConfig): PolicyValidationError[] {
  const errors: PolicyValidationError[] = [];

  // Validate required fields
  if (!policy.id) errors.push({ path: 'id', message: 'Policy ID is required' });
  if (!policy.name) errors.push({ path: 'name', message: 'Policy name is required' });
  if (!policy.version) errors.push({ path: 'version', message: 'Policy version is required' });
  if (!Array.isArray(policy.constraints)) {
    errors.push({ path: 'constraints', message: 'Constraints must be an array' });
  }
  if (!policy.actionPatterns || !Array.isArray(policy.actionPatterns)) {
    errors.push({ path: 'actionPatterns', message: 'actionPatterns must be an array' });
  }

  // Validate constraints
  if (Array.isArray(policy.constraints)) {
    policy.constraints.forEach((constraint, index) => {
      if (!constraint.id) {
        errors.push({ path: `constraints[${index}].id`, message: 'Constraint ID is required' });
      }
      if (!['low', 'medium', 'high', 'critical'].includes(constraint.riskLevel)) {
        errors.push({
          path: `constraints[${index}].riskLevel`,
          message: 'Invalid risk level',
          value: constraint.riskLevel,
        });
      }
      // Validate regex patterns
      if (constraint.type === 'path_pattern' && constraint.value) {
        try {
          new RegExp(constraint.value as string);
        } catch {
          errors.push({
            path: `constraints[${index}].value`,
            message: 'Invalid regex pattern',
            value: constraint.value,
          });
        }
      }
    });
  }

  // Validate decision
  if (!['ALLOW', 'BLOCK', 'REVIEW', 'UNSUPPORTED'].includes(policy.defaultDecision)) {
    errors.push({
      path: 'defaultDecision',
      message: 'Invalid default decision',
      value: policy.defaultDecision,
    });
  }

  return errors;
}

/**
 * Calculate a deterministic hash of a policy for reproducibility
 */
export function policyHash(policy: GatePolicyConfig): string {
  const canonical = JSON.stringify({
    id: policy.id,
    version: policy.version,
    constraints: policy.constraints.map((c) => ({
      id: c.id,
      type: c.type,
      operator: c.operator,
      value: c.value,
    })),
    defaultDecision: policy.defaultDecision,
  });

  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Compile a policy into a decision tree for faster evaluation
 */
export function compilePolicyToDecisionTree(
  policy: GatePolicyConfig,
): {
  actionMatchers: Array<{ pattern: RegExp; decision: GateDecision }>;
  constraints: typeof policy.constraints;
  defaultDecision: GateDecision;
  policyHash: string;
} {
  // Compile action patterns to regex
  const actionMatchers = policy.actionPatterns.map((pattern) => ({
    pattern: new RegExp(pattern),
    decision: policy.defaultDecision,
  }));

  return {
    actionMatchers,
    constraints: policy.constraints,
    defaultDecision: policy.defaultDecision,
    policyHash: policyHash(policy),
  };
}

/**
 * Evaluate a gate request against a policy
 */
export function evaluatePolicy(policy: GatePolicyConfig, request: GateRequest): PolicyEvaluationResult {
  // Validate policy first
  const validationErrors = validatePolicy(policy);
  if (validationErrors.length > 0) {
    throw new GateError('INVALID_POLICY', `Invalid policy: ${validationErrors[0].message}`);
  }

  // Check if action matches any of the policy's action patterns
  const actionMatches = policy.actionPatterns.some((pattern) => {
    try {
      const regex = new RegExp(pattern);
      return regex.test(request.action);
    } catch {
      return false;
    }
  });

  if (!actionMatches) {
    // Action doesn't match any pattern - use default decision
    return {
      decision: policy.defaultDecision,
      riskScore: 0,
      riskLevel: 'low',
      constraintMatches: [],
      reason: 'No matching action patterns in policy',
    };
  }

  // Evaluate constraints
  let maxRiskScore = 0;
  let maxRiskLevel: RiskLevel = 'low';
  let blockedCount = 0;
  const constraintMatches: PolicyEvaluationResult['constraintMatches'] = [];

  for (const constraint of policy.constraints) {
    let matched = false;
    let reason = '';

    switch (constraint.type) {
      case 'role_check':
        matched = checkRoleConstraint(request, constraint.value as string[]);
        reason = matched ? 'Role authorized' : 'Role not authorized';
        break;

      case 'amount_limit':
        matched = checkAmountConstraint(request, constraint.operator, constraint.value);
        reason = matched ? 'Amount within limit' : 'Amount exceeds limit';
        break;

      case 'time_window':
        matched = checkTimeConstraint(request, constraint.value as { startHour: number; endHour: number });
        reason = matched ? 'Within allowed time window' : 'Outside allowed time window';
        break;

      case 'path_pattern':
        matched = checkPathConstraint(request, constraint.value as string);
        reason = matched ? 'Path pattern matches' : 'Path pattern does not match';
        break;

      case 'custom_predicate':
        matched = true; // Custom predicates handled elsewhere
        reason = 'Custom predicate evaluated';
        break;

      default:
        matched = false;
        reason = 'Unknown constraint type';
    }

    constraintMatches.push({
      constraintId: constraint.id,
      matched,
      reason,
    });

    // Track risk
    const riskLevels: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    const constraintRiskScore = riskLevels[constraint.riskLevel] * 25;
    if (constraintRiskScore > maxRiskScore) {
      maxRiskScore = constraintRiskScore;
      maxRiskLevel = constraint.riskLevel;
    }

    // Track blockers
    if (!matched && constraint.isBlocker) {
      blockedCount++;
    }
  }

  // Determine final decision
  let decision: GateDecision = policy.defaultDecision;
  let reason = '';

  if (blockedCount > 0) {
    decision = 'BLOCK';
    reason = `${blockedCount} blocking constraint(s) not satisfied`;
  } else if (policy.requireApproval && decision === 'ALLOW') {
    decision = 'REVIEW';
    reason = 'Approval required by policy';
  } else if (maxRiskLevel === 'critical') {
    decision = 'REVIEW';
    reason = 'Critical risk threshold exceeded, requiring approval';
  }

  return {
    decision,
    riskScore: maxRiskScore,
    riskLevel: maxRiskLevel,
    constraintMatches,
    reason,
  };
}

/**
 * Helper: Check role constraint
 */
function checkRoleConstraint(request: GateRequest, allowedRoles: string[]): boolean {
  const userRole = request.context?.metadata?.userRole as string;
  return userRole ? allowedRoles.includes(userRole) : false;
}

/**
 * Helper: Check amount constraint
 */
function checkAmountConstraint(request: GateRequest, operator: string, limit: unknown): boolean {
  const amount = request.input?.amount as number;
  if (typeof amount !== 'number' || typeof limit !== 'number') return false;

  switch (operator) {
    case 'lt':
      return amount < limit;
    case 'lte':
      return amount <= limit;
    case 'gt':
      return amount > limit;
    case 'gte':
      return amount >= limit;
    case 'eq':
      return amount === limit;
    default:
      return false;
  }
}

/**
 * Helper: Check time window constraint
 */
function checkTimeConstraint(
  request: GateRequest,
  window: { startHour: number; endHour: number },
): boolean {
  const now = new Date();
  const hour = now.getUTCHours();
  return hour >= window.startHour && hour < window.endHour;
}

/**
 * Helper: Check path pattern constraint
 */
function checkPathConstraint(request: GateRequest, pattern: string): boolean {
  const path = request.input?.path as string;
  if (!path) return false;

  try {
    const regex = new RegExp(pattern);
    return regex.test(path);
  } catch {
    return false;
  }
}
