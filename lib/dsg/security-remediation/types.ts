export type SecuritySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SecurityExecutionRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SecurityRemediationDecision =
  | "BLOCK_UNVERIFIED_FINDING"
  | "BLOCK_NO_CLASSIFICATION"
  | "WAITING_SECURITY_APPROVAL"
  | "WAITING_HUMAN_APPROVAL"
  | "BLOCK_SCOPE_MISMATCH"
  | "PATCH_PLAN_REQUIRED"
  | "PATCH_EXECUTION_ALLOWED"
  | "VERIFYING_PATCH"
  | "BLOCK_NO_EVIDENCE"
  | "BLOCK_AUDIT_INVALID"
  | "DEPLOYABLE_NOT_PRODUCTION_FIXED"
  | "PRODUCTION_FIX_CLAIM_ALLOWED"
  | "NEED_REVIEW";

export interface SecurityRemediationFacts {
  // Finding evidence gate
  finding_reported?: boolean;
  finding_evidence_present?: boolean;
  affected_files_present?: boolean;
  affected_lines_present?: boolean;
  repro_or_scan_output_present?: boolean;

  // Classification gate
  severity_classified?: boolean;
  severity?: SecuritySeverity;
  execution_risk?: SecurityExecutionRisk;
  touches_auth_payment_secrets_admin?: boolean;
  patch_touches_auth_rbac_crypto_secrets?: boolean;

  // Approval gate
  human_approval_present?: boolean;
  security_approval_present?: boolean;

  // Patch plan gate
  patch_plan_present?: boolean;
  plan_hash_present?: boolean;
  allowed_files_present?: boolean;
  patch_scope_matches_finding?: boolean;

  // Controlled execution and verification gate
  controlled_executor_used?: boolean;
  patch_applied?: boolean;
  tests_passed?: boolean;
  build_passed?: boolean;
  security_scan_passed?: boolean;

  // Evidence, audit, deploy, and claim gate
  evidence_manifest_present?: boolean;
  audit_valid?: boolean;
  deployment_proof_present?: boolean;
  production_claim_requested?: boolean;
}

export interface SecurityRemediationDecisions {
  finding_verified: boolean;
  classification_complete: boolean;
  requires_human_approval: boolean;
  requires_security_approval: boolean;
  approval_satisfied: boolean;
  patch_plan_ready: boolean;
  patch_executed: boolean;
  verification_passed: boolean;
  evidence_ready: boolean;
  deployment_ready: boolean;
  production_claim_allowed: boolean;
}

export interface SecurityRemediationGateResult {
  final_decision: SecurityRemediationDecision;
  allowed: boolean;
  claim_allowed: boolean;
  reasons: string[];
  next_required_evidence: string[];
  decisions: SecurityRemediationDecisions;
  facts: SecurityRemediationFacts;
}
