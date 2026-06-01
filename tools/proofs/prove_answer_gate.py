"""
Formal proofs for DSG Answer Gate invariants.

Each assert_decision call proves that a given input_facts dict produces
the expected final_decision from evaluate_dsg_answer_gate().

These are deterministic smoke proofs — same inputs must always yield the
same decision.  If any assertion fails the script exits with code 1.
"""

import sys
from dsg_answer_gate import evaluate_dsg_answer_gate


def assert_decision(name: str, input_facts: dict, expected: str) -> None:
    result = evaluate_dsg_answer_gate(input_facts)
    if result["final_decision"] != expected:
        print(f"FAIL: {name}")
        print(f"  expected  : {expected}")
        print(f"  got       : {result['final_decision']}")
        print(f"  decisions : {result['decisions']}")
        sys.exit(1)
    print(f"PASS: {name}")


# ---------------------------------------------------------------------------
# BLOCK_UNSUPPORTED_CLAIM cases
# ---------------------------------------------------------------------------

assert_decision(
    "production claim without proof chain must block",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_production_claim": True,
        "contains_user_facing_claim": True,
        # all required proofs absent → must block
    },
    "BLOCK_UNSUPPORTED_CLAIM",
)

assert_decision(
    "deployment claim without deployment proof must block",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_deployment_claim": True,
        "deployment_proof_present": False,
        "healthcheck_proof_present": False,
    },
    "BLOCK_UNSUPPORTED_CLAIM",
)

assert_decision(
    "tests-passed claim without test proof must block",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_tests_passed_claim": True,
        "test_proof_present": False,
    },
    "BLOCK_UNSUPPORTED_CLAIM",
)

assert_decision(
    "audit claim without valid audit must block",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_audit_claim": True,
        "audit_valid": False,
    },
    "BLOCK_UNSUPPORTED_CLAIM",
)

assert_decision(
    "z3 claim without solver run must block",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_z3_claim": True,
        "solver_run_present": False,
    },
    "BLOCK_UNSUPPORTED_CLAIM",
)

assert_decision(
    "mainnet claim without deployment+healthcheck must block",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_mainnet_claim": True,
    },
    "BLOCK_UNSUPPORTED_CLAIM",
)

assert_decision(
    "revenue claim without revenue evidence must block",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_revenue_claim": True,
        "revenue_evidence_present": False,
    },
    "BLOCK_UNSUPPORTED_CLAIM",
)

assert_decision(
    "users claim without user metric evidence must block",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_users_claim": True,
        "user_metric_evidence_present": False,
    },
    "BLOCK_UNSUPPORTED_CLAIM",
)

assert_decision(
    "security claim without security audit must block",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_security_claim": True,
        "security_audit_present": False,
    },
    "BLOCK_UNSUPPORTED_CLAIM",
)

assert_decision(
    "enterprise claim missing audit must block",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_enterprise_claim": True,
        "audit_valid": False,
        "security_audit_present": True,
        "production_flow_proof_present": True,
    },
    "BLOCK_UNSUPPORTED_CLAIM",
)

# ---------------------------------------------------------------------------
# NEED_TOOL_VERIFICATION cases
# ---------------------------------------------------------------------------

assert_decision(
    "current info without verified source must need verification",
    {
        "has_user_question": True,
        "has_verified_source": False,
        "uses_current_info": True,
    },
    "NEED_TOOL_VERIFICATION",
)

assert_decision(
    "user-facing claim without verified source must need verification",
    {
        "has_user_question": True,
        "has_verified_source": False,
        "contains_user_facing_claim": True,
    },
    "NEED_TOOL_VERIFICATION",
)

# ---------------------------------------------------------------------------
# SPLIT_VERIFIED_AND_INFERRED cases
# ---------------------------------------------------------------------------

assert_decision(
    "inference with verified source and no claims must split",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_inference": True,
    },
    "SPLIT_VERIFIED_AND_INFERRED",
)

assert_decision(
    "speculation with verified source and no blocking claim must split",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_speculation": True,
    },
    "SPLIT_VERIFIED_AND_INFERRED",
)

# ---------------------------------------------------------------------------
# ANSWER_VERIFIED cases
# ---------------------------------------------------------------------------

assert_decision(
    "question with verified source and no claims must be verified",
    {
        "has_user_question": True,
        "has_verified_source": True,
    },
    "ANSWER_VERIFIED",
)

assert_decision(
    "production claim with all proofs must be verified",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_production_claim": True,
        "deployment_proof_present": True,
        "healthcheck_proof_present": True,
        "test_proof_present": True,
        "build_proof_present": True,
        "audit_valid": True,
        "replay_matched": True,
        "production_flow_proof_present": True,
    },
    "ANSWER_VERIFIED",
)

assert_decision(
    "z3 claim with solver run present must be verified",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_z3_claim": True,
        "solver_run_present": True,
    },
    "ANSWER_VERIFIED",
)

assert_decision(
    "deployment claim with both proofs must be verified",
    {
        "has_user_question": True,
        "has_verified_source": True,
        "contains_deployment_claim": True,
        "deployment_proof_present": True,
        "healthcheck_proof_present": True,
    },
    "ANSWER_VERIFIED",
)

# ---------------------------------------------------------------------------
# ANSWER_WITH_LIMITS cases
# ---------------------------------------------------------------------------

assert_decision(
    "question with no verified source and no claims must answer with limits",
    {
        "has_user_question": True,
        "has_verified_source": False,
    },
    "ANSWER_WITH_LIMITS",
)

# ---------------------------------------------------------------------------
# NEED_REVIEW edge case — no user question
# ---------------------------------------------------------------------------

assert_decision(
    "no user question with no claims must need review",
    {},
    "NEED_REVIEW",
)


print("\nVERDICT: ANSWER GATE FORMAL PROOF PASS")
