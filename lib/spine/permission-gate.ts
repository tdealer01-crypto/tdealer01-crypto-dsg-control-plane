/**
 * Permission Gate for Spine Execute
 *
 * Evaluates whether an agent work step is allowed under a delegation contract.
 * Implements delegation-based permission model with risk-based decision logic.
 */

import type {
  DelegationContract,
  AgentWorkStep,
  GateDecision,
  PermissionCheckContext,
} from '../delegation/types';
import { isDelegationValid } from '../delegation/delegation-service';

/**
 * Map risk levels to required confirmation steps.
 *
 * LOW: Auto-allowed if action is in allowedActions
 * MEDIUM: Requires audit trail; can proceed with logging
 * HIGH: Requires user confirmation
 * CRITICAL: Always requires user confirmation; may need escalation
 */
const RISK_CONFIRMATION_LEVELS: Record<string, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

/**
 * Evaluate whether a work step is permitted under a delegation contract.
 *
 * Decision logic:
 * 1. Check delegation validity (not expired, valid schema)
 * 2. Check action is not in blockedActions → BLOCK
 * 3. Check action is in allowedActions or is generic-allowed → ALLOW/REVIEW/BLOCK based on risk
 * 4. Check risk level:
 *    - LOW: ALLOW (if allowed)
 *    - MEDIUM: REVIEW (audit required, but can proceed)
 *    - HIGH: requires explicit user confirmation
 *    - CRITICAL: always requires confirmation, may escalate
 * 5. Return decision with reason and evidence requirements
 *
 * @param delegation - The delegation contract
 * @param step - The work step to evaluate
 * @param context - Optional context for the permission check
 * @returns Gate decision
 */
export function checkDelegationPermission(
  delegation: DelegationContract | null,
  step: AgentWorkStep,
  context?: PermissionCheckContext
): GateDecision {
  // Step 1: Check delegation exists
  if (!delegation) {
    return {
      decision: 'BLOCK',
      reason: 'NO_DELEGATION',
    };
  }

  // Step 2: Validate delegation
  if (!isDelegationValid(delegation)) {
    return {
      decision: 'BLOCK',
      reason: 'DELEGATION_INVALID_OR_EXPIRED',
      evidence: { delegationPresent: true },
    };
  }

  // Step 3: Check if action is explicitly blocked
  if (delegation.blockedActions.includes(step.action)) {
    return {
      decision: 'BLOCK',
      reason: 'ACTION_BLOCKED_BY_DELEGATION',
      evidence: {
        action: step.action,
        tool: step.tool,
        blockedActions: delegation.blockedActions,
      },
    };
  }

  // Step 4: Check if action is allowed
  const isActionAllowedByDelegation = delegation.allowedActions.includes(step.action) ||
    delegation.allowedActions.includes('*') || // wildcard allow
    delegation.allowedActions.some((a) => a === `${step.tool}:*`); // tool wildcard

  if (!isActionAllowedByDelegation) {
    return {
      decision: 'BLOCK',
      reason: 'ACTION_NOT_IN_ALLOWED_LIST',
      evidence: {
        action: step.action,
        tool: step.tool,
        allowedActions: delegation.allowedActions,
      },
    };
  }

  // Step 5: Check if action requires confirmation
  const requiresConfirm =
    delegation.requiresUserConfirm.includes(step.action) ||
    delegation.requiresUserConfirm.includes(`${step.tool}:*`) ||
    step.requiresConfirmation;

  // Step 6: Apply risk-based logic
  const riskLevel = RISK_CONFIRMATION_LEVELS[step.risk] ?? 0;

  // LOW risk: auto-allow
  if (step.risk === 'LOW' && !requiresConfirm) {
    return {
      decision: 'ALLOW',
      reason: 'LOW_RISK_ACTION_ALLOWED',
      evidence: {
        risk: step.risk,
        action: step.action,
        requiresConfirm: false,
      },
    };
  }

  // MEDIUM risk: review (audit trail required, but can proceed)
  if (step.risk === 'MEDIUM' && !requiresConfirm) {
    return {
      decision: 'REVIEW',
      reason: 'MEDIUM_RISK_REQUIRES_AUDIT_TRAIL',
      evidence: {
        risk: step.risk,
        action: step.action,
        auditRequired: true,
      },
      evidenceRequired: ['audit_log', 'action_trace'],
    };
  }

  // HIGH risk or CRITICAL risk: requires confirmation
  if (step.risk === 'HIGH' || step.risk === 'CRITICAL' || requiresConfirm) {
    return {
      decision: 'REVIEW',
      reason: `${step.risk}_RISK_REQUIRES_CONFIRMATION`,
      evidence: {
        risk: step.risk,
        action: step.action,
        userPresent: context?.userPresent ?? false,
        requiresUserConfirm: delegation.requiresUserConfirm,
      },
      evidenceRequired: ['user_confirmation'],
    };
  }

  // Default to review for safety
  return {
    decision: 'REVIEW',
    reason: 'GATE_DEFAULT_REVIEW',
    evidence: {
      risk: step.risk,
      action: step.action,
    },
  };
}

/**
 * Quick helper: is an action explicitly blocked?
 *
 * @param delegation - The delegation contract
 * @param action - The action to check
 * @returns true if action is blocked
 */
export function isActionBlocked(delegation: DelegationContract | null, action: string): boolean {
  if (!delegation) {
    return true;
  }
  return delegation.blockedActions.includes(action);
}

/**
 * Quick helper: is an action allowed?
 *
 * @param delegation - The delegation contract
 * @param action - The action to check
 * @returns true if action is allowed and not blocked
 */
export function isActionAllowed(delegation: DelegationContract | null, action: string): boolean {
  if (!delegation) {
    return false;
  }

  // First check if blocked
  if (delegation.blockedActions.includes(action)) {
    return false;
  }

  return (
    delegation.allowedActions.includes(action) ||
    delegation.allowedActions.includes('*') ||
    delegation.allowedActions.some((a) => a.endsWith(':*'))
  );
}

/**
 * Quick helper: does an action require user confirmation?
 *
 * @param delegation - The delegation contract
 * @param action - The action to check
 * @returns true if action requires confirmation
 */
export function requiresConfirmation(
  delegation: DelegationContract | null,
  action: string
): boolean {
  if (!delegation) {
    return true;
  }
  return delegation.requiresUserConfirm.includes(action);
}
