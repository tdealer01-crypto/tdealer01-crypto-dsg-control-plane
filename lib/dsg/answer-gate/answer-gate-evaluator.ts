import type {
  AnswerGateDecision,
  AnswerGateFacts,
  AnswerGateDecisions,
  AnswerGateResult,
} from "./types";

function b(facts: AnswerGateFacts, key: keyof AnswerGateFacts): boolean {
  return facts[key] === true;
}

/**
 * Mirrors compute_evidence_complete() from tools/proofs/dsg_answer_gate.py.
 * Priority order must stay in sync with the Python source.
 */
export function computeEvidenceComplete(facts: AnswerGateFacts): boolean {
  if (b(facts, "contains_production_claim")) {
    return (
      b(facts, "deployment_proof_present") &&
      b(facts, "healthcheck_proof_present") &&
      b(facts, "test_proof_present") &&
      b(facts, "build_proof_present") &&
      b(facts, "audit_valid") &&
      b(facts, "replay_matched") &&
      b(facts, "production_flow_proof_present")
    );
  }

  if (
    b(facts, "contains_deployment_claim") ||
    b(facts, "contains_mainnet_claim")
  ) {
    return (
      b(facts, "deployment_proof_present") &&
      b(facts, "healthcheck_proof_present")
    );
  }

  if (b(facts, "contains_tests_passed_claim")) {
    return b(facts, "test_proof_present");
  }

  if (b(facts, "contains_audit_claim")) {
    return b(facts, "audit_valid");
  }

  if (b(facts, "contains_z3_claim")) {
    return b(facts, "solver_run_present");
  }

  if (b(facts, "contains_revenue_claim")) {
    return b(facts, "revenue_evidence_present");
  }

  if (b(facts, "contains_users_claim")) {
    return b(facts, "user_metric_evidence_present");
  }

  if (b(facts, "contains_security_claim")) {
    return b(facts, "security_audit_present");
  }

  if (b(facts, "contains_enterprise_claim")) {
    return (
      b(facts, "audit_valid") &&
      b(facts, "security_audit_present") &&
      b(facts, "production_flow_proof_present")
    );
  }

  return b(facts, "has_verified_source");
}

/**
 * TypeScript port of evaluate_dsg_answer_gate() from tools/proofs/dsg_answer_gate.py.
 *
 * All Z3 constraints are deterministic Boolean implications, so the SAT model
 * always produces the same result for the same inputs. This port evaluates the
 * same constraints directly without invoking an external solver.
 *
 * Decision boundary (highest priority wins):
 *   BLOCK_UNSUPPORTED_CLAIM  — strong claim present, proof chain incomplete
 *   NEED_TOOL_VERIFICATION   — current/user-facing info with no verified source
 *   SPLIT_VERIFIED_AND_INFERRED — inferred content alongside verified source
 *   ANSWER_VERIFIED          — all evidence complete, no speculation
 *   ANSWER_WITH_LIMITS       — evidence partial or inference present
 *   NEED_REVIEW              — no decision matched
 */
export function evaluateAnswerGate(inputFacts: AnswerGateFacts): AnswerGateResult {
  const facts = { ...inputFacts };
  const evidence_complete = computeEvidenceComplete(facts);

  // Anicca: data changes — verify before asserting.
  const need_verification =
    (b(facts, "uses_current_info") && !b(facts, "has_verified_source")) ||
    (b(facts, "contains_user_facing_claim") && !b(facts, "has_verified_source"));

  // Dukkha: strong claims without a proof chain must be blocked.
  const block_unsupported_claim =
    (b(facts, "contains_production_claim") &&
      !(
        b(facts, "deployment_proof_present") &&
        b(facts, "healthcheck_proof_present") &&
        b(facts, "test_proof_present") &&
        b(facts, "build_proof_present") &&
        b(facts, "audit_valid") &&
        b(facts, "replay_matched") &&
        b(facts, "production_flow_proof_present")
      )) ||
    (b(facts, "contains_deployment_claim") &&
      !(
        b(facts, "deployment_proof_present") &&
        b(facts, "healthcheck_proof_present")
      )) ||
    (b(facts, "contains_tests_passed_claim") && !b(facts, "test_proof_present")) ||
    (b(facts, "contains_audit_claim") && !b(facts, "audit_valid")) ||
    (b(facts, "contains_z3_claim") && !b(facts, "solver_run_present")) ||
    (b(facts, "contains_mainnet_claim") &&
      !(
        b(facts, "deployment_proof_present") &&
        b(facts, "healthcheck_proof_present")
      )) ||
    (b(facts, "contains_revenue_claim") &&
      !b(facts, "revenue_evidence_present")) ||
    (b(facts, "contains_users_claim") &&
      !b(facts, "user_metric_evidence_present")) ||
    (b(facts, "contains_security_claim") &&
      !b(facts, "security_audit_present")) ||
    (b(facts, "contains_enterprise_claim") &&
      !(
        b(facts, "audit_valid") &&
        b(facts, "security_audit_present") &&
        b(facts, "production_flow_proof_present")
      ));

  // Anatta: separate inference/speculation from verified fact.
  const split_verified_and_inferred =
    (b(facts, "contains_inference") || b(facts, "contains_speculation")) &&
    b(facts, "has_verified_source") &&
    !block_unsupported_claim;

  const answer_verified =
    b(facts, "has_user_question") &&
    b(facts, "has_verified_source") &&
    evidence_complete &&
    !need_verification &&
    !block_unsupported_claim &&
    !b(facts, "contains_speculation");

  const answer_with_limits =
    b(facts, "has_user_question") &&
    !block_unsupported_claim &&
    (need_verification ||
      b(facts, "contains_inference") ||
      b(facts, "contains_speculation") ||
      !evidence_complete);

  const decisions: AnswerGateDecisions = {
    need_verification,
    block_unsupported_claim,
    answer_verified,
    answer_with_limits,
    split_verified_and_inferred,
  };

  let final_decision: AnswerGateDecision;
  let allowed: boolean;

  if (block_unsupported_claim) {
    final_decision = "BLOCK_UNSUPPORTED_CLAIM";
    allowed = false;
  } else if (need_verification) {
    final_decision = "NEED_TOOL_VERIFICATION";
    allowed = false;
  } else if (split_verified_and_inferred) {
    final_decision = "SPLIT_VERIFIED_AND_INFERRED";
    allowed = true;
  } else if (answer_verified) {
    final_decision = "ANSWER_VERIFIED";
    allowed = true;
  } else if (answer_with_limits) {
    final_decision = "ANSWER_WITH_LIMITS";
    allowed = true;
  } else {
    final_decision = "NEED_REVIEW";
    allowed = false;
  }

  return {
    final_decision,
    allowed,
    decisions,
    facts: { ...facts, evidence_complete },
  };
}
