import crypto from "crypto";
import type {
  DeterministicConstraintResult,
  DeterministicProofRequest,
} from "./types";
import { getDeterministicPolicyManifest } from "./policy-manifest";

/**
 * Response from external Z3 solver endpoint.
 */
export type ExternalSolverResponse = {
  status: "sat" | "unsat" | "unknown";
  satisfiable: boolean;
  model?: Array<{ name: string; value: string }>;
  unsatisfiable_core?: string[];
  solver_version: string;
  time_ms: number;
  smt2_hash: string;
  nonce?: string;
  error?: string;
};

export function hashSmt2(smt2: string): string {
  return crypto.createHash("sha256").update(smt2).digest("hex");
}

/**
 * Generate SMT-LIB v2 formula from deterministic constraints.
 * Logic:
 * - All constraints must be satisfied (AND)
 * - If any critical constraint fails → formula is UNSAT
 * - If formula is SAT → proof can be marked PASS
 */
export function generateSmt2ForProof(
  request: DeterministicProofRequest,
  constraints: DeterministicConstraintResult[]
): string {
  const manifest = getDeterministicPolicyManifest();
  const context = request.context ?? {};

  const boolDeclarations = constraints
    .map((c) => `(declare-const ${c.constraintId} Bool)`)
    .join("\n");

  const contextAssertions = constraints
    .map((c) => {
      const contextValue = context[c.evidenceKey] === true ? "true" : "false";
      return `(assert (= ${c.constraintId} ${contextValue}))`;
    })
    .join("\n");

  const requiredConstraints = constraints
    .map((c) => c.constraintId)
    .join(" ");

  return `; DSG Deterministic Proof Verification
; Policy: ${manifest.policyRef} v${manifest.policyVersion}
; Generated for proof request with nonce: ${request.nonce}

(set-logic QF_UF)

${boolDeclarations}

${contextAssertions}

; All constraints must be satisfied
(assert (and ${requiredConstraints}))

; Check satisfiability
(check-sat)
(get-model)
`;
}

/**
 * Invoke external Z3 solver via HTTP.
 */
export async function invokeExternalSolver(
  smt2: string,
  request: DeterministicProofRequest
): Promise<ExternalSolverResponse | null> {
  const solverUrl = process.env.DSG_EXTERNAL_SOLVER_URL;
  const enabled = process.env.DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED === "true";

  if (!enabled || !solverUrl) {
    return null;
  }

  let parsedSolverUrl: URL;
  try {
    parsedSolverUrl = new URL(solverUrl);
  } catch {
    console.error("[ExternalSolver] Invalid solver URL");
    return null;
  }

  if (parsedSolverUrl.protocol !== "https:" && process.env.NODE_ENV === "production") {
    console.error("[ExternalSolver] Production solver URL must use HTTPS");
    return null;
  }

  const timeoutMs = parseInt(
    process.env.DSG_SOLVER_TIMEOUT_MS || "5000",
    10
  );
  const smt2Hash = hashSmt2(smt2);
  const solverApiKey = process.env.DSG_EXTERNAL_SOLVER_API_KEY;

  try {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs + 1000);

    const response = await fetch(parsedSolverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(solverApiKey ? { Authorization: `Bearer ${solverApiKey}` } : {}),
      },
      body: JSON.stringify({
        smt2,
        smt2_hash: smt2Hash,
        timeout_ms: timeoutMs,
        nonce: request.nonce,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutHandle);

    if (!response.ok) {
      console.error(
        `[ExternalSolver] HTTP ${response.status}: ${await response.text()}`
      );
      return null;
    }

    const result = (await response.json()) as ExternalSolverResponse;

    if (!isValidExternalSolverResult(result, { smt2Hash, nonce: request.nonce })) {
      console.error("[ExternalSolver] Invalid or unbound response", result);
      return null;
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.warn(
          `[ExternalSolver] Timeout (>${timeoutMs}ms) [nonce=${request.nonce}]`
        );
      } else {
        console.error(
          `[ExternalSolver] Failed: ${error.message} [nonce=${request.nonce}]`
        );
      }
    }
    return null;
  }
}

export function isValidExternalSolverResult(
  result: ExternalSolverResponse,
  expected?: { smt2Hash?: string; nonce?: string },
): boolean {
  if (!result || result.error) {
    return false;
  }

  if (result.status === "unknown") {
    return false;
  }

  if (!result.solver_version || result.time_ms < 0) {
    return false;
  }

  if (result.status === "sat" && result.satisfiable !== true) {
    return false;
  }

  if (result.status === "unsat" && result.satisfiable !== false) {
    return false;
  }

  if (expected?.smt2Hash && result.smt2_hash !== expected.smt2Hash) {
    return false;
  }

  if (expected?.nonce && result.nonce && result.nonce !== expected.nonce) {
    return false;
  }

  return true;
}
