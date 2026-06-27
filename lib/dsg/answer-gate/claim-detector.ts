import type { AnswerGateFacts } from "./types";

const PRODUCTION_PATTERNS =
  /\b(is production[- ]ready|running in production|deployed to production|production environment is|production is (live|up|running))\b/i;

const DEPLOYMENT_PATTERNS =
  /\b(is deployed|deployed successfully|deployment is (live|ready|complete)|running on vercel|live at https?:\/\/)\b/i;

const TESTS_PASSED_PATTERNS =
  /\b(tests? (pass|passed|are passing)|all tests? pass|test suite (passes?|passed)|(\d+) tests? passed)\b/i;

const AUDIT_PATTERNS =
  /\b(security audit(ed)?|audit (passed|complete|valid)|third[- ]party audit)\b/i;

const Z3_PATTERNS =
  /\b(z3 (proves?|verified|solver|proof)|formally (verified|proven)|smt (solver|proof)|z3-backed)\b/i;

const MAINNET_PATTERNS =
  /\b(on mainnet|deployed to mainnet|mainnet (is|deployment|transaction))\b/i;

const REVENUE_PATTERNS =
  /\b(is (generating|earning) revenue|revenue is flowing|making money|revenue stream (is|active))\b/i;

const USERS_PATTERNS =
  /\b((\d+)\s+(users|customers|signups)|users? are (using|on|active))\b/i;

const SECURITY_PATTERNS =
  /\b(is secure|security (is|verified|confirmed)|no vulnerabilities|secure by design)\b/i;

const ENTERPRISE_PATTERNS =
  /\b(enterprise[- ](ready|grade|certified|approved)|enterprise customers?)\b/i;

const INFERENCE_PATTERNS =
  /\b(likely|probably|should|might|could be|appears to|seems to|I think|I believe|my guess|presumably|expected)\b/i;

const SPECULATION_PATTERNS =
  /\b(I assume|I suspect|not sure|uncertain|unclear|speculating|possibly|maybe)\b/i;

const VERIFIED_SOURCE_PATTERNS =
  /(`{1,3}|HTTP [0-9]{3}|curl -|exit (0|1)|npm (run|test)|vitest|passed \(|\d+ tests? passed|\bSHA\b|commit [0-9a-f]{7})/i;

const FILE_EVIDENCE_PATTERNS =
  /(\.(ts|tsx|js|json|sql|md|sh)\b|\/app\/|\/lib\/|\/tests?\/)/i;

const RUNTIME_EVIDENCE_PATTERNS =
  /\b(HTTP (200|201|400|401|403|429|500)|status: (200|ready|pass)|✓|✅|\bPASS\b|\bFAIL\b)/i;

/**
 * Scans an AI reply string for claim-type and evidence signals.
 * Returns a partial AnswerGateFacts ready for evaluateAnswerGate().
 */
export function detectClaimsInReply(
  reply: string,
  opts: { executedSteps?: boolean; hasUserQuestion?: boolean } = {}
): AnswerGateFacts {
  const facts: AnswerGateFacts = {
    has_user_question: opts.hasUserQuestion ?? true,
    uses_current_info: true,
    contains_user_facing_claim: true,

    has_verified_source: opts.executedSteps === true || VERIFIED_SOURCE_PATTERNS.test(reply),
    has_file_evidence: FILE_EVIDENCE_PATTERNS.test(reply),
    has_runtime_evidence: RUNTIME_EVIDENCE_PATTERNS.test(reply),

    contains_production_claim: PRODUCTION_PATTERNS.test(reply),
    contains_deployment_claim: DEPLOYMENT_PATTERNS.test(reply),
    contains_tests_passed_claim: TESTS_PASSED_PATTERNS.test(reply),
    contains_audit_claim: AUDIT_PATTERNS.test(reply),
    contains_z3_claim: Z3_PATTERNS.test(reply),
    contains_mainnet_claim: MAINNET_PATTERNS.test(reply),
    contains_revenue_claim: REVENUE_PATTERNS.test(reply),
    contains_users_claim: USERS_PATTERNS.test(reply),
    contains_security_claim: SECURITY_PATTERNS.test(reply),
    contains_enterprise_claim: ENTERPRISE_PATTERNS.test(reply),

    contains_inference: INFERENCE_PATTERNS.test(reply),
    contains_speculation: SPECULATION_PATTERNS.test(reply),
  };

  // Treat runtime evidence as a verified source
  if (facts.has_runtime_evidence || facts.has_file_evidence) {
    facts.has_verified_source = true;
  }

  return facts;
}
