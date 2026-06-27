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
  error?: string;
};

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

  // Build boolean variables for each constraint
  const boolDeclarations = constraints
    .map((c) => `(declare-const ${c.constraintId} Bool)`)
    .join("\n");

  // Assert actual values from context
  const contextAssertions = constraints
    .map((c) => {
      const contextValue = context[c.evidenceKey] === true ? "true" : "false";
      return `(assert (= ${c.constraintId} ${contextValue}))`;
    })
    .join("\n");

  // Require all constraints to be true (hard gates)
  const requiredConstraints = constraints
    .map((c) => c.constraintId)
    .join(" ");

  // Build the complete formula
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
 * Returns null if disabled or fails; returns result if successful.
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

  const timeoutMs = parseInt(
    process.env.DSG_SOLVER_TIMEOUT_MS || "5000",
    10
  );

  try {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs + 1000);

    const response = await fetch(`${solverUrl}/solve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        smt2,
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

    // Validate response shape
    if (!result.status || !result.solver_version) {
      console.error("[ExternalSolver] Invalid response format", result);
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

/**
 * Determine if external solver claim should be marked as invoked.
 * Only true if:
 * 1. Solver responded with sat/unsat (not "unknown")
 * 2. No errors in response
 * 3. Response time is reasonable
 */
export function isValidExternalSolverResult(
  result: ExternalSolverResponse
): boolean {
  if (!result || result.error) {
    return false;
  }

  // "unknown" status doesn't count as external solver invocation
  if (result.status === "unknown") {
    return false;
  }

  // Must have solver version and reasonable timing
  if (!result.solver_version || result.time_ms < 0) {
    return false;
  }

  return true;
}
