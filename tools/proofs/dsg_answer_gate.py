"""
DSG Answer Gate — Z3-backed claim gate for AI responses.

Evaluates whether an AI response should be answered in full, answered with
stated limits, or blocked because a claim lacks its required proof chain.

Decision priority (highest wins):
  BLOCK_UNSUPPORTED_CLAIM   → strong claim present, proof chain incomplete
  NEED_TOOL_VERIFICATION    → current/user-facing info with no verified source
  SPLIT_VERIFIED_AND_INFERRED → inferred content exists alongside verified source
  ANSWER_VERIFIED           → all evidence complete, no speculation
  ANSWER_WITH_LIMITS        → evidence partial or inference present
  NEED_REVIEW               → solver not SAT or no decision matched
"""

from z3 import Bool, Not, And, Or, Solver, is_true, sat


def compute_evidence_complete(facts: dict) -> bool:
    """
    Derive evidence_complete from the facts dict.

    The caller must not supply evidence_complete directly; this function
    computes it from the claim-type flags and their required proof fields.
    Priority order mirrors the gate's claim-check precedence.
    """
    if facts.get("contains_production_claim"):
        return (
            facts.get("deployment_proof_present", False)
            and facts.get("healthcheck_proof_present", False)
            and facts.get("test_proof_present", False)
            and facts.get("build_proof_present", False)
            and facts.get("audit_valid", False)
            and facts.get("replay_matched", False)
            and facts.get("production_flow_proof_present", False)
        )

    if facts.get("contains_deployment_claim") or facts.get("contains_mainnet_claim"):
        return facts.get("deployment_proof_present", False) and facts.get(
            "healthcheck_proof_present", False
        )

    if facts.get("contains_tests_passed_claim"):
        return facts.get("test_proof_present", False)

    if facts.get("contains_audit_claim"):
        return facts.get("audit_valid", False)

    if facts.get("contains_z3_claim"):
        return facts.get("solver_run_present", False)

    if facts.get("contains_revenue_claim"):
        return facts.get("revenue_evidence_present", False)

    if facts.get("contains_users_claim"):
        return facts.get("user_metric_evidence_present", False)

    if facts.get("contains_security_claim"):
        return facts.get("security_audit_present", False)

    if facts.get("contains_enterprise_claim"):
        return (
            facts.get("audit_valid", False)
            and facts.get("security_audit_present", False)
            and facts.get("production_flow_proof_present", False)
        )

    return facts.get("has_verified_source", False)


def evaluate_dsg_answer_gate(input_facts: dict) -> dict:
    """
    DSG Answer Gate — Z3-backed claim gate for AI responses.

    Three Buddhist marks of evidence quality drive the constraint set:
      Anicca  (impermanence) — current info must be verified before asserting.
      Dukkha  (unsatisfactoriness) — strong claims without proof are harmful.
      Anatta  (non-self) — inferred content must be separated from verified fact.

    Returns a dict with:
      solver_result   — "sat" or the Z3 result string
      final_decision  — one of the six decision labels above
      allowed         — bool: whether the response may proceed
      decisions       — individual Z3 boolean results
      facts           — the complete normalized facts dict
      reason          — present only when solver does not return SAT
    """
    # Override any caller-supplied evidence_complete; always recompute.
    facts = dict(input_facts)
    facts["evidence_complete"] = compute_evidence_complete(facts)

    names = [
        "has_user_question",
        "has_verified_source",
        "has_file_evidence",
        "has_repo_evidence",
        "has_web_evidence",
        "has_runtime_evidence",
        "uses_current_info",
        "contains_production_claim",
        "contains_deployment_claim",
        "contains_tests_passed_claim",
        "contains_audit_claim",
        "contains_z3_claim",
        "contains_mainnet_claim",
        "contains_revenue_claim",
        "contains_users_claim",
        "contains_security_claim",
        "contains_enterprise_claim",
        "contains_inference",
        "contains_speculation",
        "contains_user_facing_claim",
        "deployment_proof_present",
        "healthcheck_proof_present",
        "test_proof_present",
        "build_proof_present",
        "audit_valid",
        "replay_matched",
        "solver_run_present",
        "revenue_evidence_present",
        "user_metric_evidence_present",
        "security_audit_present",
        "production_flow_proof_present",
        "evidence_complete",
    ]

    z = {name: Bool(name) for name in names}

    need_verification = Bool("need_verification")
    block_unsupported_claim = Bool("block_unsupported_claim")
    answer_verified = Bool("answer_verified")
    answer_with_limits = Bool("answer_with_limits")
    split_verified_and_inferred = Bool("split_verified_and_inferred")

    s = Solver()

    # Bind every input fact to its concrete truth value.
    for name, var in z.items():
        s.add(var == bool(facts.get(name, False)))

    # Anicca: data changes — verify before asserting.
    s.add(
        need_verification
        == Or(
            And(z["uses_current_info"], Not(z["has_verified_source"])),
            And(z["contains_user_facing_claim"], Not(z["has_verified_source"])),
        )
    )

    # Dukkha: strong claims without a proof chain must be blocked.
    s.add(
        block_unsupported_claim
        == Or(
            And(
                z["contains_production_claim"],
                Not(
                    And(
                        z["deployment_proof_present"],
                        z["healthcheck_proof_present"],
                        z["test_proof_present"],
                        z["build_proof_present"],
                        z["audit_valid"],
                        z["replay_matched"],
                        z["production_flow_proof_present"],
                    )
                ),
            ),
            And(
                z["contains_deployment_claim"],
                Not(And(z["deployment_proof_present"], z["healthcheck_proof_present"])),
            ),
            And(z["contains_tests_passed_claim"], Not(z["test_proof_present"])),
            And(z["contains_audit_claim"], Not(z["audit_valid"])),
            And(z["contains_z3_claim"], Not(z["solver_run_present"])),
            And(
                z["contains_mainnet_claim"],
                Not(And(z["deployment_proof_present"], z["healthcheck_proof_present"])),
            ),
            And(z["contains_revenue_claim"], Not(z["revenue_evidence_present"])),
            And(z["contains_users_claim"], Not(z["user_metric_evidence_present"])),
            And(z["contains_security_claim"], Not(z["security_audit_present"])),
            And(
                z["contains_enterprise_claim"],
                Not(
                    And(
                        z["audit_valid"],
                        z["security_audit_present"],
                        z["production_flow_proof_present"],
                    )
                ),
            ),
        )
    )

    # Anatta: separate inference/speculation from verified fact.
    s.add(
        split_verified_and_inferred
        == And(
            Or(z["contains_inference"], z["contains_speculation"]),
            z["has_verified_source"],
            Not(block_unsupported_claim),
        )
    )

    s.add(
        answer_verified
        == And(
            z["has_user_question"],
            z["has_verified_source"],
            z["evidence_complete"],
            Not(need_verification),
            Not(block_unsupported_claim),
            Not(z["contains_speculation"]),
        )
    )

    s.add(
        answer_with_limits
        == And(
            z["has_user_question"],
            Not(block_unsupported_claim),
            Or(
                need_verification,
                z["contains_inference"],
                z["contains_speculation"],
                Not(z["evidence_complete"]),
            ),
        )
    )

    result = s.check()

    if result != sat:
        return {
            "solver_result": str(result),
            "final_decision": "NEED_REVIEW",
            "allowed": False,
            "decisions": None,
            "facts": facts,
            "reason": "Solver did not return SAT",
        }

    m = s.model()

    decisions = {
        "need_verification": is_true(
            m.evaluate(need_verification, model_completion=True)
        ),
        "block_unsupported_claim": is_true(
            m.evaluate(block_unsupported_claim, model_completion=True)
        ),
        "answer_verified": is_true(
            m.evaluate(answer_verified, model_completion=True)
        ),
        "answer_with_limits": is_true(
            m.evaluate(answer_with_limits, model_completion=True)
        ),
        "split_verified_and_inferred": is_true(
            m.evaluate(split_verified_and_inferred, model_completion=True)
        ),
    }

    if decisions["block_unsupported_claim"]:
        final_decision = "BLOCK_UNSUPPORTED_CLAIM"
        allowed = False
    elif decisions["need_verification"]:
        final_decision = "NEED_TOOL_VERIFICATION"
        allowed = False
    elif decisions["split_verified_and_inferred"]:
        final_decision = "SPLIT_VERIFIED_AND_INFERRED"
        allowed = True
    elif decisions["answer_verified"]:
        final_decision = "ANSWER_VERIFIED"
        allowed = True
    elif decisions["answer_with_limits"]:
        final_decision = "ANSWER_WITH_LIMITS"
        allowed = True
    else:
        final_decision = "NEED_REVIEW"
        allowed = False

    return {
        "solver_result": "sat",
        "final_decision": final_decision,
        "allowed": allowed,
        "decisions": decisions,
        "facts": facts,
    }
