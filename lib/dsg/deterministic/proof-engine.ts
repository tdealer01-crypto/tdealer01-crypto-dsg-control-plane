import crypto from 'node:crypto';
import type {
  DeterministicConstraintResult,
  DeterministicFailureReason,
  DeterministicProof,
  DeterministicProofRequest,
  DeterministicProofStatus,
  DeterministicRiskLevel,
} from './types';
import { buildConstraintSetHash, buildProofHash, hashDeterministicValue } from './proof-hash';

const CONSTRAINTS = [
  {
    constraintId: 'requirement_clear',
    name: 'Requirement must be clear',
    severity: 'high' as DeterministicRiskLevel,
    evidenceKey: 'requirement_clear',
    message: 'Requirement is missing or ambiguous.',
  },
  {
    constraintId: 'tool_available',
    name: 'Tool must be available',
    severity: 'critical' as DeterministicRiskLevel,
    evidenceKey: 'tool_available',
    message: 'Requested tool is not available.',
  },
  {
    constraintId: 'permission_granted',
    name: 'Permission must be granted',
    severity: 'critical' as DeterministicRiskLevel,
    evidenceKey: 'permission_granted',
    message: 'Actor does not have permission.',
  },
  {
    constraintId: 'secret_bound',
    name: 'Secret boundary must be satisfied',
    severity: 'critical' as DeterministicRiskLevel,
    evidenceKey: 'secret_bound',
    message: 'Secret binding is missing.',
  },
  {
    constraintId: 'dependency_resolved',
    name: 'Dependencies must be resolved',
    severity: 'high' as DeterministicRiskLevel,
    evidenceKey: 'dependency_resolved',
    message: 'Dependencies are unresolved.',
  },
  {
    constraintId: 'testable',
    name: 'Action must be testable',
    severity: 'medium' as DeterministicRiskLevel,
    evidenceKey: 'testable',
    message: 'Action has no testable path.',
  },
  {
    constraintId: 'deploy_target_ready',
    name: 'Deploy target must be ready',
    severity: 'high' as DeterministicRiskLevel,
    evidenceKey: 'deploy_target_ready',
    message: 'Deploy target is not ready.',
  },
  {
    constraintId: 'audit_hook_available',
    name: 'Audit hook must be available',
    severity: 'critical' as DeterministicRiskLevel,
    evidenceKey: 'audit_hook_available',
    message: 'Audit hook is unavailable.',
  },
];

function boolValue(context: Record<string, unknown>, key: string) {
  return context[key] === true;
}

function statusFromFailures(failures: DeterministicFailureReason[]): DeterministicProofStatus {
  if (failures.some((failure) => failure.severity === 'critical')) return 'BLOCK';
  if (failures.some((failure) => failure.severity === 'high')) return 'REVIEW';
  if (failures.length > 0) return 'REVIEW';
  return 'PASS';
}

export function proveDeterministicPlan(request: DeterministicProofRequest): DeterministicProof {
  const timestamp = new Date().toISOString();
  const proofId = `dpf_${crypto.randomBytes(16).toString('hex')}`;
  const policyRef = request.policyRef ?? 'dsg.deterministic.default';
  const policyVersion = request.policyVersion ?? '1.0';
  const context = request.context ?? {};

  const constraints: DeterministicConstraintResult[] = CONSTRAINTS.map((constraint) => {
    const passed = boolValue(context, constraint.evidenceKey);
    return {
      ...constraint,
      passed,
    };
  });

  const failureReasons = constraints
    .filter((constraint) => !constraint.passed)
    .map((constraint) => ({
      code: constraint.constraintId,
      message: constraint.message,
      constraintId: constraint.constraintId,
      severity: constraint.severity,
    }));

  const status = statusFromFailures(failureReasons);
  const inputHash = hashDeterministicValue({
    planId: request.planId ?? null,
    context,
    policyRef,
    policyVersion,
    riskLevel: request.riskLevel ?? 'medium',
  });
  const constraintSetHash = buildConstraintSetHash(CONSTRAINTS.map((constraint) => constraint.constraintId));
  const proofHash = buildProofHash({
    proofId,
    status,
    timestamp,
    solver: { name: 'static_check', version: 'dsg-deterministic-ts-1.0' },
    policyRef,
    policyVersion,
    constraintsChecked: constraints.length,
    inputHash,
    constraintSetHash,
    previousProofHash: request.previousProofHash,
    failureReasons,
    constraints,
  });

  return {
    proofId,
    status,
    timestamp,
    solver: {
      name: 'static_check',
      version: 'dsg-deterministic-ts-1.0',
    },
    policyRef,
    policyVersion,
    constraintsChecked: constraints.length,
    inputHash,
    constraintSetHash,
    proofHash,
    previousProofHash: request.previousProofHash,
    model: {
      planId: request.planId ?? null,
      riskLevel: request.riskLevel ?? 'medium',
    },
    failureReasons,
    constraints,
    evidenceBoundary: {
      statement:
        'This DSG-native deterministic proof is a TypeScript static-check adapter mapped from the Z3 module. It does not claim that an external Z3 solver was invoked.',
      externalSolverInvoked: false,
      productionReadyClaim: false,
    },
  };
}
