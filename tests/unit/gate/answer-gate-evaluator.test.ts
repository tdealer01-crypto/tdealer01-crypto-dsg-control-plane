import { describe, it, expect } from "vitest";
import {
  evaluateAnswerGate,
  computeEvidenceComplete,
} from "../../../lib/dsg/answer-gate/answer-gate-evaluator";

// ---------------------------------------------------------------------------
// computeEvidenceComplete
// ---------------------------------------------------------------------------

describe("computeEvidenceComplete", () => {
  it("requires all 7 proofs for production claim", () => {
    const base = {
      contains_production_claim: true,
      deployment_proof_present: true,
      healthcheck_proof_present: true,
      test_proof_present: true,
      build_proof_present: true,
      audit_valid: true,
      replay_matched: true,
      production_flow_proof_present: true,
    };
    expect(computeEvidenceComplete(base)).toBe(true);
    expect(
      computeEvidenceComplete({ ...base, replay_matched: false })
    ).toBe(false);
  });

  it("requires deployment+healthcheck for deployment claim", () => {
    expect(
      computeEvidenceComplete({
        contains_deployment_claim: true,
        deployment_proof_present: true,
        healthcheck_proof_present: true,
      })
    ).toBe(true);
    expect(
      computeEvidenceComplete({
        contains_deployment_claim: true,
        deployment_proof_present: true,
        healthcheck_proof_present: false,
      })
    ).toBe(false);
  });

  it("requires deployment+healthcheck for mainnet claim", () => {
    expect(
      computeEvidenceComplete({
        contains_mainnet_claim: true,
        deployment_proof_present: true,
        healthcheck_proof_present: true,
      })
    ).toBe(true);
  });

  it("requires test_proof_present for tests-passed claim", () => {
    expect(
      computeEvidenceComplete({
        contains_tests_passed_claim: true,
        test_proof_present: true,
      })
    ).toBe(true);
    expect(
      computeEvidenceComplete({
        contains_tests_passed_claim: true,
        test_proof_present: false,
      })
    ).toBe(false);
  });

  it("requires audit_valid for audit claim", () => {
    expect(
      computeEvidenceComplete({ contains_audit_claim: true, audit_valid: true })
    ).toBe(true);
    expect(
      computeEvidenceComplete({ contains_audit_claim: true, audit_valid: false })
    ).toBe(false);
  });

  it("requires solver_run_present for z3 claim", () => {
    expect(
      computeEvidenceComplete({
        contains_z3_claim: true,
        solver_run_present: true,
      })
    ).toBe(true);
    expect(
      computeEvidenceComplete({
        contains_z3_claim: true,
        solver_run_present: false,
      })
    ).toBe(false);
  });

  it("requires all 3 for enterprise claim", () => {
    expect(
      computeEvidenceComplete({
        contains_enterprise_claim: true,
        audit_valid: true,
        security_audit_present: true,
        production_flow_proof_present: true,
      })
    ).toBe(true);
    expect(
      computeEvidenceComplete({
        contains_enterprise_claim: true,
        audit_valid: false,
        security_audit_present: true,
        production_flow_proof_present: true,
      })
    ).toBe(false);
  });

  it("falls through to has_verified_source when no claim flags set", () => {
    expect(
      computeEvidenceComplete({ has_verified_source: true })
    ).toBe(true);
    expect(computeEvidenceComplete({})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// evaluateAnswerGate — BLOCK_UNSUPPORTED_CLAIM
// ---------------------------------------------------------------------------

describe("evaluateAnswerGate — BLOCK_UNSUPPORTED_CLAIM", () => {
  it("blocks production claim without proof chain", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_production_claim: true,
    });
    expect(r.final_decision).toBe("BLOCK_UNSUPPORTED_CLAIM");
    expect(r.allowed).toBe(false);
  });

  it("blocks deployment claim without deployment+healthcheck proofs", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_deployment_claim: true,
      deployment_proof_present: false,
      healthcheck_proof_present: false,
    });
    expect(r.final_decision).toBe("BLOCK_UNSUPPORTED_CLAIM");
    expect(r.allowed).toBe(false);
  });

  it("blocks tests-passed claim without test proof", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_tests_passed_claim: true,
      test_proof_present: false,
    });
    expect(r.final_decision).toBe("BLOCK_UNSUPPORTED_CLAIM");
    expect(r.allowed).toBe(false);
  });

  it("blocks audit claim without valid audit", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_audit_claim: true,
      audit_valid: false,
    });
    expect(r.final_decision).toBe("BLOCK_UNSUPPORTED_CLAIM");
    expect(r.allowed).toBe(false);
  });

  it("blocks z3 claim without solver run", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_z3_claim: true,
      solver_run_present: false,
    });
    expect(r.final_decision).toBe("BLOCK_UNSUPPORTED_CLAIM");
    expect(r.allowed).toBe(false);
  });

  it("blocks mainnet claim without deployment+healthcheck", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_mainnet_claim: true,
    });
    expect(r.final_decision).toBe("BLOCK_UNSUPPORTED_CLAIM");
    expect(r.allowed).toBe(false);
  });

  it("blocks revenue claim without revenue evidence", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_revenue_claim: true,
      revenue_evidence_present: false,
    });
    expect(r.final_decision).toBe("BLOCK_UNSUPPORTED_CLAIM");
    expect(r.allowed).toBe(false);
  });

  it("blocks security claim without security audit", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_security_claim: true,
      security_audit_present: false,
    });
    expect(r.final_decision).toBe("BLOCK_UNSUPPORTED_CLAIM");
    expect(r.allowed).toBe(false);
  });

  it("blocks enterprise claim when audit_valid is false", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_enterprise_claim: true,
      audit_valid: false,
      security_audit_present: true,
      production_flow_proof_present: true,
    });
    expect(r.final_decision).toBe("BLOCK_UNSUPPORTED_CLAIM");
    expect(r.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// evaluateAnswerGate — NEED_TOOL_VERIFICATION
// ---------------------------------------------------------------------------

describe("evaluateAnswerGate — NEED_TOOL_VERIFICATION", () => {
  it("needs verification for current info without verified source", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: false,
      uses_current_info: true,
    });
    expect(r.final_decision).toBe("NEED_TOOL_VERIFICATION");
    expect(r.allowed).toBe(false);
  });

  it("needs verification for user-facing claim without verified source", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: false,
      contains_user_facing_claim: true,
    });
    expect(r.final_decision).toBe("NEED_TOOL_VERIFICATION");
    expect(r.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// evaluateAnswerGate — SPLIT_VERIFIED_AND_INFERRED
// ---------------------------------------------------------------------------

describe("evaluateAnswerGate — SPLIT_VERIFIED_AND_INFERRED", () => {
  it("splits when inference present with verified source", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_inference: true,
    });
    expect(r.final_decision).toBe("SPLIT_VERIFIED_AND_INFERRED");
    expect(r.allowed).toBe(true);
  });

  it("splits when speculation present with verified source and no blocking claim", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_speculation: true,
    });
    expect(r.final_decision).toBe("SPLIT_VERIFIED_AND_INFERRED");
    expect(r.allowed).toBe(true);
  });

  it("does not split when block_unsupported_claim overrides", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_inference: true,
      contains_z3_claim: true,
      solver_run_present: false,
    });
    expect(r.final_decision).toBe("BLOCK_UNSUPPORTED_CLAIM");
  });
});

// ---------------------------------------------------------------------------
// evaluateAnswerGate — ANSWER_VERIFIED
// ---------------------------------------------------------------------------

describe("evaluateAnswerGate — ANSWER_VERIFIED", () => {
  it("verifies when question and verified source present, no claims", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
    });
    expect(r.final_decision).toBe("ANSWER_VERIFIED");
    expect(r.allowed).toBe(true);
  });

  it("verifies production claim when all 7 proofs present", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_production_claim: true,
      deployment_proof_present: true,
      healthcheck_proof_present: true,
      test_proof_present: true,
      build_proof_present: true,
      audit_valid: true,
      replay_matched: true,
      production_flow_proof_present: true,
    });
    expect(r.final_decision).toBe("ANSWER_VERIFIED");
    expect(r.allowed).toBe(true);
  });

  it("verifies z3 claim with solver run present", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_z3_claim: true,
      solver_run_present: true,
    });
    expect(r.final_decision).toBe("ANSWER_VERIFIED");
    expect(r.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// evaluateAnswerGate — ANSWER_WITH_LIMITS
// ---------------------------------------------------------------------------

describe("evaluateAnswerGate — ANSWER_WITH_LIMITS", () => {
  it("answers with limits when no verified source", () => {
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: false,
    });
    expect(r.final_decision).toBe("ANSWER_WITH_LIMITS");
    expect(r.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// evaluateAnswerGate — NEED_REVIEW
// ---------------------------------------------------------------------------

describe("evaluateAnswerGate — NEED_REVIEW", () => {
  it("needs review when no user question and no facts", () => {
    const r = evaluateAnswerGate({});
    expect(r.final_decision).toBe("NEED_REVIEW");
    expect(r.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// evidence_complete override guard
// ---------------------------------------------------------------------------

describe("evidence_complete override guard", () => {
  it("ignores caller-supplied evidence_complete and recomputes it", () => {
    // Caller claims evidence_complete=true but has no proofs for production claim.
    // The evaluator must recompute evidence_complete=false and block.
    const r = evaluateAnswerGate({
      has_user_question: true,
      has_verified_source: true,
      contains_production_claim: true,
      // No proofs provided
    } as never);
    expect(r.final_decision).toBe("BLOCK_UNSUPPORTED_CLAIM");
    expect(r.facts.evidence_complete).toBe(false);
  });
});
