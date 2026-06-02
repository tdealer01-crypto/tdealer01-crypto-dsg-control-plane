import type {
  SecurityExecutionRisk,
  SecurityRemediationDecisions,
  SecurityRemediationFacts,
  SecurityRemediationGateResult,
  SecuritySeverity,
} from "./types";

function b(facts: SecurityRemediationFacts, key: keyof SecurityRemediationFacts): boolean {
  return facts[key] === true;
}

function isHighOrCritical(value?: SecuritySeverity | SecurityExecutionRisk): boolean {
  return value === "HIGH" || value === "CRITICAL";
}

function pushMissing(target: string[], condition: boolean, evidenceName: string): void {
  if (!condition) target.push(evidenceName);
}

export function evaluateSecurityRemediationGate(
  inputFacts: SecurityRemediationFacts,
): SecurityRemediationGateResult {
  const facts: SecurityRemediationFacts = { ...inputFacts };
  const next_required_evidence: string[] = [];
  const reasons: string[] = [];

  const finding_verified =
    b(facts, "finding_reported") &&
    b(facts, "finding_evidence_present") &&
    b(facts, "affected_files_present") &&
    b(facts, "repro_or_scan_output_present");

  pushMissing(next_required_evidence, b(facts, "finding_reported"), "original_finding_report");
  pushMissing(next_required_evidence, b(facts, "finding_evidence_present"), "finding_evidence");
  pushMissing(next_required_evidence, b(facts, "affected_files_present"), "affected_files");
  pushMissing(next_required_evidence, b(facts, "repro_or_scan_output_present"), "repro_or_scan_output");

  const classification_complete =
    b(facts, "severity_classified") &&
    Boolean(facts.severity) &&
    Boolean(facts.execution_risk);

  const requires_human_approval =
    b(facts, "touches_auth_payment_secrets_admin") ||
    b(facts, "patch_touches_auth_rbac_crypto_secrets") ||
    isHighOrCritical(facts.execution_risk);

  const requires_security_approval =
    isHighOrCritical(facts.severity) ||
    isHighOrCritical(facts.execution_risk) ||
    b(facts, "patch_touches_auth_rbac_crypto_secrets");

  const approval_satisfied =
    (!requires_human_approval || b(facts, "human_approval_present")) &&
    (!requires_security_approval || b(facts, "security_approval_present"));

  const patch_plan_ready =
    b(facts, "patch_plan_present") &&
    b(facts, "plan_hash_present") &&
    b(facts, "allowed_files_present") &&
    b(facts, "patch_scope_matches_finding");

  const patch_executed =
    b(facts, "controlled_executor_used") && b(facts, "patch_applied");

  const verification_passed =
    patch_executed &&
    b(facts, "tests_passed") &&
    b(facts, "build_passed") &&
    b(facts, "security_scan_passed");

  const evidence_ready =
    verification_passed &&
    b(facts, "evidence_manifest_present") &&
    b(facts, "audit_valid");

  const deployment_ready = evidence_ready && b(facts, "deployment_proof_present");

  const production_claim_allowed =
    b(facts, "production_claim_requested") && deployment_ready;

  const decisions: SecurityRemediationDecisions = {
    finding_verified,
    classification_complete,
    requires_human_approval,
    requires_security_approval,
    approval_satisfied,
    patch_plan_ready,
    patch_executed,
    verification_passed,
    evidence_ready,
    deployment_ready,
    production_claim_allowed,
  };

  if (!finding_verified) {
    reasons.push("AI-reported findings are not treated as verified vulnerabilities until evidence, affected files, and scan/repro output are present.");
    return {
      final_decision: "BLOCK_UNVERIFIED_FINDING",
      allowed: false,
      claim_allowed: false,
      reasons,
      next_required_evidence,
      decisions,
      facts,
    };
  }

  if (!classification_complete) {
    reasons.push("Severity and execution risk must be classified before remediation planning.");
    pushMissing(next_required_evidence, b(facts, "severity_classified"), "severity_classification");
    pushMissing(next_required_evidence, Boolean(facts.severity), "technical_severity");
    pushMissing(next_required_evidence, Boolean(facts.execution_risk), "execution_risk");
    return {
      final_decision: "BLOCK_NO_CLASSIFICATION",
      allowed: false,
      claim_allowed: false,
      reasons,
      next_required_evidence,
      decisions,
      facts,
    };
  }

  if (requires_security_approval && !b(facts, "security_approval_present")) {
    reasons.push("Security approval is required for high-risk/high-severity remediation or sensitive auth/RBAC/crypto/secret changes.");
    pushMissing(next_required_evidence, false, "security_approval");
    return {
      final_decision: "WAITING_SECURITY_APPROVAL",
      allowed: false,
      claim_allowed: false,
      reasons,
      next_required_evidence,
      decisions,
      facts,
    };
  }

  if (requires_human_approval && !b(facts, "human_approval_present")) {
    reasons.push("Human approval is required before the controlled executor can patch sensitive or high-risk code.");
    pushMissing(next_required_evidence, false, "human_approval");
    return {
      final_decision: "WAITING_HUMAN_APPROVAL",
      allowed: false,
      claim_allowed: false,
      reasons,
      next_required_evidence,
      decisions,
      facts,
    };
  }

  if (!b(facts, "patch_scope_matches_finding") && b(facts, "patch_plan_present")) {
    reasons.push("Patch scope must match the verified finding and approved file boundary.");
    pushMissing(next_required_evidence, false, "scope_match_proof");
    return {
      final_decision: "BLOCK_SCOPE_MISMATCH",
      allowed: false,
      claim_allowed: false,
      reasons,
      next_required_evidence,
      decisions,
      facts,
    };
  }

  if (!patch_plan_ready) {
    reasons.push("A deterministic patch plan, plan hash, allowed file list, and scope proof are required before execution.");
    pushMissing(next_required_evidence, b(facts, "patch_plan_present"), "patch_plan");
    pushMissing(next_required_evidence, b(facts, "plan_hash_present"), "plan_hash");
    pushMissing(next_required_evidence, b(facts, "allowed_files_present"), "allowed_files");
    pushMissing(next_required_evidence, b(facts, "patch_scope_matches_finding"), "scope_match_proof");
    return {
      final_decision: "PATCH_PLAN_REQUIRED",
      allowed: false,
      claim_allowed: false,
      reasons,
      next_required_evidence,
      decisions,
      facts,
    };
  }

  if (!patch_executed) {
    reasons.push("Patch execution is allowed only through the controlled executor and only inside the approved scope.");
    pushMissing(next_required_evidence, b(facts, "controlled_executor_used"), "controlled_executor_log");
    pushMissing(next_required_evidence, b(facts, "patch_applied"), "patch_diff_or_patch_hash");
    return {
      final_decision: "PATCH_EXECUTION_ALLOWED",
      allowed: true,
      claim_allowed: false,
      reasons,
      next_required_evidence,
      decisions,
      facts,
    };
  }

  if (!verification_passed) {
    reasons.push("A patch is not verified until tests, build, and security scan all pass.");
    pushMissing(next_required_evidence, b(facts, "tests_passed"), "test_output");
    pushMissing(next_required_evidence, b(facts, "build_passed"), "build_output");
    pushMissing(next_required_evidence, b(facts, "security_scan_passed"), "security_scan_output");
    return {
      final_decision: "VERIFYING_PATCH",
      allowed: false,
      claim_allowed: false,
      reasons,
      next_required_evidence,
      decisions,
      facts,
    };
  }

  if (!b(facts, "evidence_manifest_present")) {
    reasons.push("Verification passed, but the remediation cannot be claimed without an evidence manifest.");
    pushMissing(next_required_evidence, false, "evidence_manifest");
    return {
      final_decision: "BLOCK_NO_EVIDENCE",
      allowed: false,
      claim_allowed: false,
      reasons,
      next_required_evidence,
      decisions,
      facts,
    };
  }

  if (!b(facts, "audit_valid")) {
    reasons.push("Verification passed, but the remediation cannot be claimed without a valid audit ledger chain.");
    pushMissing(next_required_evidence, false, "valid_audit_ledger");
    return {
      final_decision: "BLOCK_AUDIT_INVALID",
      allowed: false,
      claim_allowed: false,
      reasons,
      next_required_evidence,
      decisions,
      facts,
    };
  }

  if (!deployment_ready) {
    reasons.push("The patch may be deployable, but production-fixed is not claimable without deployment proof.");
    pushMissing(next_required_evidence, false, "deployment_proof");
    return {
      final_decision: "DEPLOYABLE_NOT_PRODUCTION_FIXED",
      allowed: true,
      claim_allowed: false,
      reasons,
      next_required_evidence,
      decisions,
      facts,
    };
  }

  if (production_claim_allowed) {
    reasons.push("Production fix claim is allowed because finding, approval, patch, verification, evidence, audit, and deployment proof gates are satisfied.");
    return {
      final_decision: "PRODUCTION_FIX_CLAIM_ALLOWED",
      allowed: true,
      claim_allowed: true,
      reasons,
      next_required_evidence,
      decisions,
      facts,
    };
  }

  reasons.push("All remediation proof gates passed, but no production claim was requested.");
  return {
    final_decision: "DEPLOYABLE_NOT_PRODUCTION_FIXED",
    allowed: true,
    claim_allowed: false,
    reasons,
    next_required_evidence,
    decisions,
    facts,
  };
}
