import type { ActionDescriptor, PolicyResult } from './types';

export function evaluateActionPolicy(action: ActionDescriptor): PolicyResult {
  if (!action.planAllowed) {
    return {
      decision: 'BLOCK',
      risk: 'HIGH',
      reason: 'ACTION_OUT_OF_PLAN',
      requiredEvidence: ['plan_hash', 'allowed_action_set'],
      requiredApproval: false,
      safeAlternative: 'Create a proposal and request plan update.',
    };
  }

  if (!action.userAuthorized) {
    return {
      decision: 'BLOCK',
      risk: 'HIGH',
      reason: 'USER_NOT_AUTHORIZED',
      requiredEvidence: ['actor_role', 'permission_check'],
      requiredApproval: false,
    };
  }

  if (action.dataSensitivity === 'credential') {
    return {
      decision: 'BLOCK',
      risk: 'CRITICAL',
      reason: 'CREDENTIAL_OR_SECRET_BLOCKED',
      requiredEvidence: ['secret_redaction_proof'],
      requiredApproval: false,
      safeAlternative: 'Ask the user to enter the secret manually in a secure field.',
    };
  }

  const highImpact =
    action.operation === 'delete' ||
    action.operation === 'deploy' ||
    action.operation === 'pay' ||
    action.operation === 'change_permission';

  if (highImpact) {
    const requiredEvidence = ['fresh_evidence', 'audit_hash'];

    if (action.reversibility !== 'reversible') {
      requiredEvidence.push('rollback_or_backup_proof');
    }

    if (!action.hasFreshEvidence || !action.hasRollback) {
      return {
        decision: 'SAFE_ALTERNATIVE',
        risk: 'HIGH',
        reason: 'HIGH_IMPACT_ACTION_NEEDS_EVIDENCE_AND_ROLLBACK',
        requiredEvidence,
        requiredApproval: true,
        safeAlternative: 'Prepare evidence pack, preview impact, request approval, then execute.',
      };
    }

    return {
      decision: 'REVIEW',
      risk: 'HIGH',
      reason: 'HIGH_IMPACT_ACTION_REQUIRES_HUMAN_APPROVAL',
      requiredEvidence,
      requiredApproval: true,
    };
  }

  if (action.operation === 'submit' || action.operation === 'send') {
    if (
      action.dataSensitivity === 'pii' ||
      action.dataSensitivity === 'financial' ||
      action.dataSensitivity === 'legal'
    ) {
      return {
        decision: 'REVIEW',
        risk: 'MEDIUM',
        reason: 'SENSITIVE_EXTERNAL_SUBMISSION_REQUIRES_REVIEW',
        requiredEvidence: ['preview_payload', 'recipient_or_destination'],
        requiredApproval: true,
      };
    }

    return {
      decision: 'ALLOW',
      risk: 'LOW',
      reason: 'STANDARD_EXTERNAL_ACTION_ALLOWED',
      requiredEvidence: ['audit_hash'],
      requiredApproval: false,
    };
  }

  if (
    action.operation === 'read' ||
    action.operation === 'open' ||
    action.operation === 'fill' ||
    action.operation === 'click'
  ) {
    return {
      decision: 'ALLOW',
      risk: 'LOW',
      reason: 'LOW_RISK_INTERACTION_ALLOWED',
      requiredEvidence: ['audit_hash'],
      requiredApproval: false,
    };
  }

  return {
    decision: 'REVIEW',
    risk: 'MEDIUM',
    reason: 'UNKNOWN_ACTION_REQUIRES_REVIEW',
    requiredEvidence: ['action_descriptor'],
    requiredApproval: true,
  };
}
