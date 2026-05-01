import crypto from 'node:crypto';
import type {
  DeterministicConstraintResult,
  DeterministicFailureReason,
  DeterministicProof,
  DeterministicProofRequest,
  DeterministicProofStatus,
} from './types';
import { buildProofHash, hashDeterministicValue } from './proof-hash';
import { getDeterministicPolicyManifest } from './policy-manifest';
import { getDeterministicSolverMetadata } from './solver-metadata';

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
  const manifest = getDeterministicPolicyManifest();
  const solver = getDeterministicSolverMetadata();
  const policyRef = request.policyRef ?? manifest.policyRef;
  const policyVersion = request.policyVersion ?? manifest.policyVersion;
  const context = request.context ?? {};

  const constraints: DeterministicConstraintResult[] = manifest.constraints.map((constraint) => {
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
    nonce: request.nonce,
    idempotencyKey: request.idempotencyKey,
  });
  const replayProtection = {
    nonce: request.nonce,
    idempotencyKey: request.idempotencyKey,
    requestHash: inputHash,
  };
  const constraintSetHash = manifest.constraintSetHash;
  const proofHash = buildProofHash({
    proofId,
    status,
    timestamp,
    solver: { name: solver.name, version: solver.version },
    policyRef,
    policyVersion,
    constraintsChecked: constraints.length,
    inputHash,
    constraintSetHash,
    previousProofHash: request.previousProofHash,
    failureReasons,
    constraints,
    replayProtection,
  } as any);

  return {
    proofId,
    status,
    timestamp,
    solver: {
      name: solver.name,
      version: solver.version,
    },
    policyRef,
    policyVersion,
    constraintsChecked: constraints.length,
    inputHash,
    constraintSetHash,
    proofHash,
    previousProofHash: request.previousProofHash,
    replayProtection,
    model: {
      planId: request.planId ?? null,
      riskLevel: request.riskLevel ?? 'medium',
    },
    failureReasons,
    constraints,
    evidenceBoundary: {
      statement:
        'This DSG-native deterministic proof is a TypeScript static-check adapter mapped from the Z3 module. It does not claim that an external Z3 solver was invoked unless solver metadata says so.',
      externalSolverInvoked: solver.externalSolverInvoked,
      productionReadyClaim: false,
    },
  };
}
