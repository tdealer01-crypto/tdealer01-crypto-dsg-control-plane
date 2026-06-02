export type AnswerGateDecision =
  | "ANSWER_VERIFIED"
  | "ANSWER_WITH_LIMITS"
  | "SPLIT_VERIFIED_AND_INFERRED"
  | "BLOCK_UNSUPPORTED_CLAIM"
  | "NEED_TOOL_VERIFICATION"
  | "NEED_REVIEW";

export interface AnswerGateFacts {
  // Core evidence sources
  has_user_question?: boolean;
  has_verified_source?: boolean;
  has_file_evidence?: boolean;
  has_repo_evidence?: boolean;
  has_web_evidence?: boolean;
  has_runtime_evidence?: boolean;

  uses_current_info?: boolean;

  // Claim type flags
  contains_production_claim?: boolean;
  contains_deployment_claim?: boolean;
  contains_tests_passed_claim?: boolean;
  contains_audit_claim?: boolean;
  contains_z3_claim?: boolean;
  contains_mainnet_claim?: boolean;
  contains_revenue_claim?: boolean;
  contains_users_claim?: boolean;
  contains_security_claim?: boolean;
  contains_enterprise_claim?: boolean;

  contains_inference?: boolean;
  contains_speculation?: boolean;
  contains_user_facing_claim?: boolean;

  // Proof fields
  deployment_proof_present?: boolean;
  healthcheck_proof_present?: boolean;
  test_proof_present?: boolean;
  build_proof_present?: boolean;
  audit_valid?: boolean;
  replay_matched?: boolean;
  solver_run_present?: boolean;
  revenue_evidence_present?: boolean;
  user_metric_evidence_present?: boolean;
  security_audit_present?: boolean;
  production_flow_proof_present?: boolean;
}

export interface AnswerGateDecisions {
  need_verification: boolean;
  block_unsupported_claim: boolean;
  answer_verified: boolean;
  answer_with_limits: boolean;
  split_verified_and_inferred: boolean;
}

export interface AnswerGateResult {
  final_decision: AnswerGateDecision;
  allowed: boolean;
  decisions: AnswerGateDecisions;
  facts: AnswerGateFacts & { evidence_complete: boolean };
}
