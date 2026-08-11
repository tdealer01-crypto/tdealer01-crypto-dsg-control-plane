import type { DeterministicRiskLevel } from './types';
import type { EncodingPolicyConstraint } from './encoding-proof-types';
import { buildConstraintSetHash } from './proof-hash';
import { computeEncodingConstraintSetHash } from './encoding-proof-engine';

export type DeterministicPolicyConstraint = {
  constraintId: string;
  name: string;
  severity: DeterministicRiskLevel;
  evidenceKey: string;
  message: string;
};

export const DETERMINISTIC_POLICY_REF = 'dsg.deterministic.default';
export const DETERMINISTIC_POLICY_VERSION = '1.0';

export const ENCODING_POLICY_REF = 'dsg.encoding.default';
export const ENCODING_POLICY_VERSION = '1.1';
export const ENCODING_POLICY_CONSTRAINTS: EncodingPolicyConstraint[] = [
  { id: 'enc_policy_01', name: 'linear_terms_valid', description: 'Linear terms are valid finite coefficients with correct indices', checkName: 'linear_terms_valid', severity: 'critical' },
  { id: 'enc_policy_02', name: 'quadratic_terms_valid', description: 'Quadratic terms contain finite coefficients and valid variable indices', checkName: 'quadratic_terms_valid', severity: 'critical' },
  { id: 'enc_policy_03', name: 'dimension_within_bounds', description: 'Problem size within policy limits (MAX_VARIABLES=62)', checkName: 'dimension_within_bounds', severity: 'high', maxVariables: 62 },
  { id: 'enc_policy_04', name: 'coefficient_magnitude_bounded', description: 'Coefficient magnitudes are finite and at most 1e6', checkName: 'coefficient_magnitude_bounded', severity: 'high', maxCoefficientMagnitude: 1e6 },
  { id: 'enc_policy_05', name: 'no_nan_or_infinity', description: 'No NaN, Infinity, partial numeric strings, booleans or null coefficient coercion', checkName: 'no_nan_or_infinity', severity: 'critical' },
  { id: 'enc_policy_06', name: 'no_duplicate_edges', description: 'No duplicate or reversed duplicate quadratic edges', checkName: 'no_duplicate_edges', severity: 'high' },
  { id: 'enc_policy_07', name: 'variable_naming_consistent', description: 'Variable indices are integral and in range throughout encoding', checkName: 'variable_naming_consistent', severity: 'medium' },
  { id: 'enc_policy_08', name: 'encoding_type_matches', description: 'Encoding structure/objective matches the declared QUBO or Ising type', checkName: 'encoding_type_matches', severity: 'high' },
];

export const DETERMINISTIC_POLICY_CONSTRAINTS: DeterministicPolicyConstraint[] = [
  { constraintId: 'requirement_clear', name: 'Requirement must be clear', severity: 'high', evidenceKey: 'requirement_clear', message: 'Requirement is missing or ambiguous.' },
  { constraintId: 'tool_available', name: 'Tool must be available', severity: 'critical', evidenceKey: 'tool_available', message: 'Requested tool is not available.' },
  { constraintId: 'permission_granted', name: 'Permission must be granted', severity: 'critical', evidenceKey: 'permission_granted', message: 'Actor does not have permission.' },
  { constraintId: 'secret_bound', name: 'Secret boundary must be satisfied', severity: 'critical', evidenceKey: 'secret_bound', message: 'Secret binding is missing.' },
  { constraintId: 'dependency_resolved', name: 'Dependencies must be resolved', severity: 'high', evidenceKey: 'dependency_resolved', message: 'Dependencies are unresolved.' },
  { constraintId: 'testable', name: 'Action must be testable', severity: 'medium', evidenceKey: 'testable', message: 'Action has no testable path.' },
  { constraintId: 'deploy_target_ready', name: 'Deploy target must be ready', severity: 'high', evidenceKey: 'deploy_target_ready', message: 'Deploy target is not ready.' },
  { constraintId: 'audit_hook_available', name: 'Audit hook must be available', severity: 'critical', evidenceKey: 'audit_hook_available', message: 'Audit hook is unavailable.' },
];

export function getDeterministicPolicyManifest() {
  const constraintIds = DETERMINISTIC_POLICY_CONSTRAINTS.map((constraint) => constraint.constraintId);
  return {
    policyRef: DETERMINISTIC_POLICY_REF,
    policyVersion: DETERMINISTIC_POLICY_VERSION,
    constraintSetHash: buildConstraintSetHash(constraintIds),
    constraints: DETERMINISTIC_POLICY_CONSTRAINTS,
    encodingPolicy: {
      policyRef: ENCODING_POLICY_REF,
      policyVersion: ENCODING_POLICY_VERSION,
      constraintSetHash: computeEncodingConstraintSetHash(),
      constraints: ENCODING_POLICY_CONSTRAINTS,
      replayProtection: 'persistent nonce + idempotency ledger',
      chainSemantics: 'single linear per-organization previousProofHash chain',
    },
    evidenceBoundary: {
      statement: 'Policy manifest is the source of truth for DSG deterministic static-check proofs.',
      externalSolverInvoked: false,
    },
  };
}
