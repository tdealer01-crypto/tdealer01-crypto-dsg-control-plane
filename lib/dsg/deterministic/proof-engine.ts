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
import {
  generateSmt2ForProof,
  invokeExternalSolver,
  isValidExternalSolverResult,
  type ExternalSolverResponse,
} from "./external-solver";

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

/**
 * Attempt to invoke external Z3 solver and update solver metadata.
 * Returns updated solver metadata if successful; original metadata on failure.
 * Always falls back to static check on error/timeout.
 */
async function tryInvokeExternalSolverAndUpdateMetadata(
  constraints: DeterministicConstraintResult[],
  request: DeterministicProofRequest,
  defaultSolver: ReturnType<typeof getDeterministicSolverMetadata>,
): Promise<ReturnType<typeof getDeterministicSolverMetadata>> {
  // Generate SMT-LIB2 representation of the constraints
  const smt2 = generateSmt2ForProof(request, constraints);

  // Attempt to invoke external solver
  const solverResult = await invokeExternalSolver(smt2, request);

  // If external solver failed or returned invalid result, return default
  if (!solverResult || !isValidExternalSolverResult(solverResult)) {
    return defaultSolver;
  }

  // External solver succeeded; update metadata
  return {
    name: "z3",
    version: solverResult.solver_version,
    externalSolverInvoked: true,
  };
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

export async function proveDeterministicPlan(
  request: DeterministicProofRequest,
): Promise<DeterministicProof> {
  const manifest = getDeterministicPolicyManifest();
  let solver = getDeterministicSolverMetadata();
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

  // Try to invoke external Z3 solver (if enabled and configured)
  if (
    process.env.DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED === "true" &&
    process.env.DSG_EXTERNAL_SOLVER_URL
  ) {
    solver = await tryInvokeExternalSolverAndUpdateMetadata(
      constraints,
      request,
      solver,
    );
  }

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
