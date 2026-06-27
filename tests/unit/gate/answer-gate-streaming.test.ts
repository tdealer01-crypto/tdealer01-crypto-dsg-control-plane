import { describe, it, expect } from "vitest";
import { detectClaimsInReply } from "../../../lib/dsg/answer-gate/claim-detector";
import { evaluateAnswerGate } from "../../../lib/dsg/answer-gate/answer-gate-evaluator";

// ---------------------------------------------------------------------------
// detectClaimsInReply — claim detection from SSE stream text
// ---------------------------------------------------------------------------

describe("detectClaimsInReply — production claim detection", () => {
  it("detects production-ready claim in text", () => {
    const reply = "The system is production-ready and has been validated.";
    const facts = detectClaimsInReply(reply);
    expect(facts.contains_production_claim).toBe(true);
  });

  it("detects 'running in production' claim", () => {
    const reply = "The service is running in production with zero downtime.";
    const facts = detectClaimsInReply(reply);
    expect(facts.contains_production_claim).toBe(true);
  });

  it("detects 'deployed to production' claim", () => {
    const reply = "We deployed to production yesterday and everything is stable.";
    const facts = detectClaimsInReply(reply);
    expect(facts.contains_production_claim).toBe(true);
  });

  it("does NOT detect production claim when text contains no such phrase", () => {
    const reply = "This is a staging environment for testing only.";
    const facts = detectClaimsInReply(reply);
    expect(facts.contains_production_claim).toBe(false);
  });
});

describe("detectClaimsInReply — evaluateAnswerGate returns BLOCK_UNSUPPORTED_CLAIM when no evidence + production claim", () => {
  it("blocks when production claim detected and no evidence provided", () => {
    const reply = "The platform is production-ready and running in production.";
    const facts = detectClaimsInReply(reply, { executedSteps: false });

    const gateResult = evaluateAnswerGate({
      ...facts,
      has_verified_source: false,
      deployment_proof_present: false,
      healthcheck_proof_present: false,
      test_proof_present: false,
      build_proof_present: false,
      audit_valid: false,
      replay_matched: false,
      production_flow_proof_present: false,
    });

    expect(gateResult.final_decision).toBe("BLOCK_UNSUPPORTED_CLAIM");
    expect(gateResult.allowed).toBe(false);
  });

  it("blocks deployment claim when no deployment or healthcheck proof", () => {
    const reply = "The service is deployed and running on Vercel live at https://example.vercel.app";
    const facts = detectClaimsInReply(reply, { executedSteps: false });

    const gateResult = evaluateAnswerGate({
      ...facts,
      has_verified_source: false,
      deployment_proof_present: false,
      healthcheck_proof_present: false,
    });

    expect(gateResult.final_decision).toBe("BLOCK_UNSUPPORTED_CLAIM");
    expect(gateResult.allowed).toBe(false);
  });
});

describe("detectClaimsInReply — gate result has correct structure { decision, allowed, claims_detected }", () => {
  it("returned gate result has correct structure", () => {
    const reply = "We think this might work in production.";
    const facts = detectClaimsInReply(reply);
    const gateResult = evaluateAnswerGate(facts);

    // Structure checks
    expect(gateResult).toHaveProperty("final_decision");
    expect(gateResult).toHaveProperty("allowed");
    expect(gateResult).toHaveProperty("decisions");
    expect(gateResult).toHaveProperty("facts");

    // decisions sub-structure
    expect(gateResult.decisions).toHaveProperty("need_verification");
    expect(gateResult.decisions).toHaveProperty("block_unsupported_claim");
    expect(gateResult.decisions).toHaveProperty("answer_verified");
    expect(gateResult.decisions).toHaveProperty("answer_with_limits");
    expect(gateResult.decisions).toHaveProperty("split_verified_and_inferred");

    // facts includes evidence_complete
    expect(gateResult.facts).toHaveProperty("evidence_complete");
    expect(typeof gateResult.facts.evidence_complete).toBe("boolean");

    // allowed is always boolean
    expect(typeof gateResult.allowed).toBe("boolean");
  });
});

describe("detectClaimsInReply — text with NO claims returns ALLOW decision", () => {
  it("plain factual reply without claims yields allowed=true decision", () => {
    const reply = "The function signature takes two string arguments and returns a boolean.";
    const facts = detectClaimsInReply(reply, { executedSteps: true });

    expect(facts.contains_production_claim).toBe(false);
    expect(facts.contains_deployment_claim).toBe(false);
    expect(facts.contains_z3_claim).toBe(false);
    expect(facts.contains_audit_claim).toBe(false);
    expect(facts.contains_mainnet_claim).toBe(false);

    const gateResult = evaluateAnswerGate({
      ...facts,
      has_user_question: true,
    });

    expect(gateResult.allowed).toBe(true);
  });

  it("plain factual reply is never BLOCK_UNSUPPORTED_CLAIM", () => {
    const reply = "The method returns the sum of two integers.";
    const facts = detectClaimsInReply(reply, { executedSteps: true });

    const gateResult = evaluateAnswerGate({
      ...facts,
      has_user_question: true,
    });

    expect(gateResult.final_decision).not.toBe("BLOCK_UNSUPPORTED_CLAIM");
  });
});

describe("detectClaimsInReply — text with verified code snippet (```curl```) gets different treatment", () => {
  it("text with backtick curl command is treated as having a verified source", () => {
    const reply =
      "You can test it with:\n```\ncurl -fsSL https://example.com/api/health\n```\nThis should return HTTP 200.";
    const facts = detectClaimsInReply(reply);

    // Backtick pattern triggers VERIFIED_SOURCE_PATTERNS
    expect(facts.has_verified_source).toBe(true);
  });

  it("curl snippet reply with a production claim still blocks if no full proof chain", () => {
    const reply =
      "```curl -fsSL https://example.com/api/health```\nThe system is running in production.";
    const facts = detectClaimsInReply(reply, { executedSteps: false });

    const gateResult = evaluateAnswerGate({
      ...facts,
      contains_production_claim: true,
      deployment_proof_present: false,
      healthcheck_proof_present: false,
      test_proof_present: false,
      build_proof_present: false,
      audit_valid: false,
      replay_matched: false,
      production_flow_proof_present: false,
    });

    expect(gateResult.final_decision).toBe("BLOCK_UNSUPPORTED_CLAIM");
    expect(gateResult.allowed).toBe(false);
  });

  it("curl snippet reply without any strong claim and executedSteps=true allows response", () => {
    const reply =
      "Run:\n```\ncurl -fsSL https://example.com/api/health\n```\nThis verifies the endpoint is reachable.";
    const facts = detectClaimsInReply(reply, { executedSteps: true });

    const gateResult = evaluateAnswerGate({
      ...facts,
      has_user_question: true,
      contains_production_claim: false,
    });

    expect(gateResult.allowed).toBe(true);
  });
});
