from z3 import Bool, Const, Int, Not, Or, unsat

from dsg_revenue_model import Plan, FREE, build_revenue_contract
from governed_agent_model import Decision, Risk, ALLOW, BLOCK, HIGH, CRITICAL, build_governed_agent_contract


def assert_unsat(name, solver, constraints):
    solver.push()
    solver.add(*constraints)
    result = solver.check()
    if result != unsat:
        print(f"NO-GO: {name}")
        print(solver.model())
        raise SystemExit(1)
    solver.pop()
    print(f"PASS: {name}")


def prove_revenue_states():
    user_present = Bool("user_present")
    org_present = Bool("org_present")
    credential_present = Bool("credential_present")
    credential_active = Bool("credential_active")
    execution_allowed = Bool("execution_allowed")
    upgrade_visible = Bool("upgrade_visible")
    audit_written = Bool("audit_written")
    entitlement_present = Bool("entitlement_present")
    stripe_paid = Bool("stripe_paid")
    webhook_verified = Bool("webhook_verified")
    usage = Int("usage")
    quota = Int("quota")
    plan = Const("plan", Plan)

    assert_unsat(
        "execution without user must be impossible",
        build_revenue_contract(),
        [execution_allowed, Not(user_present)],
    )
    assert_unsat(
        "execution without org must be impossible",
        build_revenue_contract(),
        [execution_allowed, Not(org_present)],
    )
    assert_unsat(
        "execution without credential must be impossible",
        build_revenue_contract(),
        [execution_allowed, Not(credential_present)],
    )
    assert_unsat(
        "execution with inactive credential must be impossible",
        build_revenue_contract(),
        [execution_allowed, credential_present, Not(credential_active)],
    )
    assert_unsat(
        "over-quota execution must be impossible",
        build_revenue_contract(),
        [execution_allowed, usage >= quota],
    )
    assert_unsat(
        "allowed execution without audit must be impossible",
        build_revenue_contract(),
        [execution_allowed, Not(audit_written)],
    )
    assert_unsat(
        "over-quota state without upgrade path must be impossible",
        build_revenue_contract(),
        [usage >= quota, Not(upgrade_visible)],
    )
    assert_unsat(
        "verified paid checkout without entitlement must be impossible",
        build_revenue_contract(),
        [stripe_paid, webhook_verified, Not(entitlement_present)],
    )
    assert_unsat(
        "paid entitlement on free plan must be impossible",
        build_revenue_contract(),
        [entitlement_present, plan == FREE],
    )


def prove_agent_states():
    authenticated = Bool("authenticated")
    quota_ok = Bool("quota_ok")
    audit_written = Bool("audit_written")
    external_side_effect = Bool("external_side_effect")
    user_gets_result = Bool("user_gets_result")
    risk = Const("risk", Risk)
    decision = Const("decision", Decision)

    assert_unsat(
        "high or critical risk cannot be allowed",
        build_governed_agent_contract(),
        [Or(risk == HIGH, risk == CRITICAL), decision == ALLOW],
    )
    assert_unsat(
        "unauthenticated side effects must be impossible",
        build_governed_agent_contract(),
        [Not(authenticated), external_side_effect],
    )
    assert_unsat(
        "quota-failed side effects must be impossible",
        build_governed_agent_contract(),
        [Not(quota_ok), external_side_effect],
    )
    assert_unsat(
        "side effect without audit must be impossible",
        build_governed_agent_contract(),
        [external_side_effect, Not(audit_written)],
    )
    assert_unsat(
        "blocked decision with side effect must be impossible",
        build_governed_agent_contract(),
        [decision == BLOCK, external_side_effect],
    )
    assert_unsat(
        "agent response invisibility must be impossible",
        build_governed_agent_contract(),
        [Not(user_gets_result)],
    )


def main():
    prove_revenue_states()
    prove_agent_states()
    print("VERDICT: FORMAL PROOF PASS")


if __name__ == "__main__":
    main()
