import type { DeterministicRiskLevel } from './types';
import { buildConstraintSetHash } from './proof-hash';

export type DeterministicPolicyConstraint = {
  constraintId: string;
  name: string;
  severity: DeterministicRiskLevel;
  evidenceKey: string;
  message: string;
};

export const DETERMINISTIC_POLICY_REF = 'dsg.deterministic.default';
export const DETERMINISTIC_POLICY_VERSION = '1.0';

export const DETERMINISTIC_POLICY_CONSTRAINTS: DeterministicPolicyConstraint[] = [
  {
    constraintId: 'requirement_clear',
    name: 'Requirement must be clear',
    severity: 'high',
    evidenceKey: 'requirement_clear',
    message: 'Requirement is missing or ambiguous.',
  },
  {
    constraintId: 'tool_available',
    name: 'Tool must be available',
    severity: 'critical',
    evidenceKey: 'tool_available',
    message: 'Requested tool is not available.',
  },
  {
    constraintId: 'permission_granted',
    name: 'Permission must be granted',
    severity: 'critical',
    evidenceKey: 'permission_granted',
    message: 'Actor does not have permission.',
  },
  {
    constraintId: 'secret_bound',
    name: 'Secret boundary must be satisfied',
    severity: 'critical',
    evidenceKey: 'secret_bound',
    message: 'Secret binding is missing.',
  },
  {
    constraintId: 'dependency_resolved',
    name: 'Dependencies must be resolved',
    severity: 'high',
    evidenceKey: 'dependency_resolved',
    message: 'Dependencies are unresolved.',
  },
  {
    constraintId: 'testable',
    name: 'Action must be testable',
    severity: 'medium',
    evidenceKey: 'testable',
    message: 'Action has no testable path.',
  },
  {
    constraintId: 'deploy_target_ready',
    name: 'Deploy target must be ready',
    severity: 'high',
    evidenceKey: 'deploy_target_ready',
    message: 'Deploy target is not ready.',
  },
  {
    constraintId: 'audit_hook_available',
    name: 'Audit hook must be available',
    severity: 'critical',
    evidenceKey: 'audit_hook_available',
    message: 'Audit hook is unavailable.',
  },
];

export function getDeterministicPolicyManifest() {
  const constraintIds = DETERMINISTIC_POLICY_CONSTRAINTS.map((constraint) => constraint.constraintId);

  return {
    policyRef: DETERMINISTIC_POLICY_REF,
    policyVersion: DETERMINISTIC_POLICY_VERSION,
    constraintSetHash: buildConstraintSetHash(constraintIds),
    constraints: DETERMINISTIC_POLICY_CONSTRAINTS,
    evidenceBoundary: {
      statement: 'Policy manifest is the source of truth for DSG deterministic static-check proofs.',
      externalSolverInvoked: false,
    },
  };
}
