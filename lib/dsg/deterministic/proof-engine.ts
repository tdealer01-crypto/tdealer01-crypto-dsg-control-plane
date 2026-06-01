import type {
  DeterministicConstraintResult,
  DeterministicFailureReason,
  DeterministicProof,
  DeterministicProofRequest,
  DeterministicProofStatus,
} from "./types";
import { buildProofHash, hashDeterministicValue } from "./proof-hash";
import { getDeterministicPolicyManifest } from "./policy-manifest";
import { getDeterministicSolverMetadata } from "./solver-metadata";

function boolValue(context: Record<string, unknown>, key: string) {
  return context[key] === true;
}

function statusFromFailures(
  failures: DeterministicFailureReason[],
): DeterministicProofStatus {
  if (failures.some((failure) => failure.severity === "critical"))
    return "BLOCK";
  if (failures.some((failure) => failure.severity === "high")) return "REVIEW";
  if (failures.length > 0) return "REVIEW";
  return "PASS";
}

function nonceText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function deterministicProofId(inputHash: string) {
  return `dpf_${inputHash.slice(0, 32)}`;
}

function deterministicProofTimestamp(inputHash: string) {
  const seconds = Number.parseInt(inputHash.slice(0, 8), 16);
  return new Date(seconds * 1000).toISOString();
}

export function isProductionReadyDeterministicProof(
  proof: DeterministicProof,
): boolean {
  return (
    proof.status === "PASS" &&
    proof.constraints.length > 0 &&
    proof.constraints.every((constraint) => constraint.passed) &&
    Boolean(nonceText(proof.replayProtection?.nonce)) &&
    Boolean(nonceText(proof.replayProtection?.idempotencyKey)) &&
    Boolean(proof.policyRef) &&
    Boolean(proof.policyVersion) &&
    Boolean(proof.constraintSetHash) &&
    Boolean(proof.proofHash) &&
    Boolean(proof.inputHash) &&
    Boolean(proof.solver?.name) &&
    Boolean(proof.solver?.version)
  );
}

export function proveDeterministicPlan(
  request: DeterministicProofRequest,
): DeterministicProof {
  const manifest = getDeterministicPolicyManifest();
  const solver = getDeterministicSolverMetadata();
  const policyRef = request.policyRef ?? manifest.policyRef;
  const policyVersion = request.policyVersion ?? manifest.policyVersion;
  const context = request.context ?? {};

  const constraints: DeterministicConstraintResult[] = manifest.constraints.map(
    (constraint) => {
      const passed = boolValue(context, constraint.evidenceKey);
      return {
        ...constraint,
        passed,
      };
    },
  );

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
    riskLevel: request.riskLevel ?? "medium",
    nonce: request.nonce,
    idempotencyKey: request.idempotencyKey,
  });
  const proofId = deterministicProofId(inputHash);
  const timestamp = deterministicProofTimestamp(inputHash);
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
  });

  const proof: DeterministicProof = {
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
      riskLevel: request.riskLevel ?? "medium",
    },
    failureReasons,
    constraints,
    evidenceBoundary: {
      statement:
        "This DSG-native deterministic proof is evidence-derived from the checked policy constraints, replay-protection inputs, policy reference, constraint-set hash, proof hash, input hash, and solver metadata. It does not claim an external Z3 production solver, third-party certification, WORM-certified storage, or cryptographic-signing completion.",
      externalSolverInvoked: solver.externalSolverInvoked,
      productionReadyClaim: false,
      externalZ3ProductionSolverClaim: false,
      certificationClaim: false,
      independentAuditClaim: false,
      wormStorageCertifiedClaim: false,
      cryptographicSigningCompleteClaim: false,
    },
  };

  proof.evidenceBoundary.productionReadyClaim =
    isProductionReadyDeterministicProof(proof);

  return proof;
}
