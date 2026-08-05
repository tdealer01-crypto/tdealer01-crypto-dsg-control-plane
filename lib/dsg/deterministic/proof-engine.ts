import type {
  DeterministicConstraintResult,
  DeterministicFailureReason,
  DeterministicProof,
  DeterministicProofRequest,
  DeterministicProofStatus,
  DeterministicSolverEvidence,
  DeterministicVerificationMode,
} from "./types";
import { buildProofHash, hashDeterministicValue } from "./proof-hash";
import { getDeterministicPolicyManifest } from "./policy-manifest";
import { getDeterministicSolverMetadata } from "./solver-metadata";
import {
  generateSmt2ForProof,
  invokeExternalSolver,
  hashSmt2,
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

function resolveVerificationMode(
  request: DeterministicProofRequest,
): DeterministicVerificationMode {
  if (request.verificationMode) return request.verificationMode;

  const solverRequired = process.env.DSG_SOLVER_REQUIRED === "true";
  const solverConfigured =
    process.env.DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED === "true" &&
    Boolean(process.env.DSG_EXTERNAL_SOLVER_URL);

  if (solverRequired) return "external_required";

  // Preserve the deterministic static gate when no external solver is wired.
  // Deployments that require external verification must set DSG_SOLVER_REQUIRED
  // or pass verificationMode="external_required" explicitly.
  if (!solverConfigured) return "static_allowed";

  if (request.riskLevel === "high" || request.riskLevel === "critical") {
    return "external_required";
  }
  if (request.riskLevel === "medium") return "external_preferred";
  return "static_allowed";
}

async function resolveSolverEvidence(
  constraints: DeterministicConstraintResult[],
  request: DeterministicProofRequest,
): Promise<DeterministicSolverEvidence> {
  const fallback = getDeterministicSolverMetadata();
  const smt2 = generateSmt2ForProof(request, constraints);
  const result = await invokeExternalSolver(smt2, request);

  if (!result) {
    return {
      name: fallback.name,
      version: fallback.version,
      invoked: false,
    };
  }

  return {
    name: "z3",
    version: result.solver_version,
    invoked: true,
    status: result.status,
    satisfiable: result.satisfiable,
    smt2Hash: result.smt2_hash || hashSmt2(smt2),
    timeMs: result.time_ms,
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

export function isStructurallyCompleteDeterministicProof(
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

/** @deprecated Prefer isStructurallyCompleteDeterministicProof. */
export const isProductionReadyDeterministicProof =
  isStructurallyCompleteDeterministicProof;

export async function proveDeterministicPlan(
  request: DeterministicProofRequest,
): Promise<DeterministicProof> {
  const manifest = getDeterministicPolicyManifest();
  const policyRef = request.policyRef ?? manifest.policyRef;
  const policyVersion = request.policyVersion ?? manifest.policyVersion;
  const context = request.context ?? {};
  const verificationMode = resolveVerificationMode(request);

  const constraints: DeterministicConstraintResult[] = manifest.constraints.map(
    (constraint) => ({
      ...constraint,
      passed: boolValue(context, constraint.evidenceKey),
    }),
  );

  const solver = await resolveSolverEvidence(constraints, request);

  const failureReasons: DeterministicFailureReason[] = constraints
    .filter((constraint) => !constraint.passed)
    .map((constraint) => ({
      code: constraint.constraintId,
      message: constraint.message,
      constraintId: constraint.constraintId,
      severity: constraint.severity,
    }));

  const localStatus = statusFromFailures(failureReasons);
  let status = localStatus;

  if (solver.invoked && solver.status === "unsat") {
    if (localStatus === "PASS") {
      failureReasons.push({
        code: "external_solver_disagreement",
        message:
          "External Z3 returned UNSAT while local deterministic checks returned PASS.",
        severity: "critical",
      });
    }
    status = "BLOCK";
  }

  if (solver.invoked && solver.status === "sat" && localStatus !== "PASS") {
    failureReasons.push({
      code: "external_solver_disagreement",
      message:
        "External Z3 returned SAT while local deterministic checks found failed constraints.",
      severity: "critical",
    });
    status = "BLOCK";
  }

  if (!solver.invoked && verificationMode === "external_required") {
    failureReasons.push({
      code: "external_solver_required",
      message:
        "External verification is required for this request but no verified solver result was available.",
      severity: "critical",
    });
    status = "BLOCK";
  }

  if (!solver.invoked && verificationMode === "external_preferred" && status === "PASS") {
    failureReasons.push({
      code: "external_solver_unavailable",
      message:
        "External verification was preferred but unavailable; manual review is required.",
      severity: "high",
    });
    status = "REVIEW";
  }

  const inputHash = hashDeterministicValue({
    planId: request.planId ?? null,
    context,
    policyRef,
    policyVersion,
    riskLevel: request.riskLevel ?? "medium",
    verificationMode,
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
    solver,
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
    solver,
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
      verificationMode,
    },
    failureReasons,
    constraints,
    evidenceBoundary: {
      statement:
        "This DSG-native deterministic proof records checked policy constraints, replay-protection inputs, policy reference, constraint-set hash, proof hash, input hash, and verified solver evidence when available. It does not claim third-party certification, WORM-certified storage, or cryptographic-signing completion.",
      externalSolverInvoked: solver.invoked,
      productionReadyClaim: false,
      externalZ3ProductionSolverClaim: false,
      certificationClaim: false,
      independentAuditClaim: false,
      wormStorageCertifiedClaim: false,
      cryptographicSigningCompleteClaim: false,
    },
  };

  proof.evidenceBoundary.productionReadyClaim =
    isStructurallyCompleteDeterministicProof(proof) &&
    (verificationMode !== "external_required" || solver.invoked);

  return proof;
}
