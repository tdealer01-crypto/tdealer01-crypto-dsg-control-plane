from z3 import And, Bool, Const, EnumSort, Implies, Not, Or, Solver

Decision, (ALLOW, REVIEW, BLOCK) = EnumSort(
    "Decision",
    ["ALLOW", "REVIEW", "BLOCK"],
)

Risk, (LOW, MEDIUM, HIGH, CRITICAL) = EnumSort(
    "Risk",
    ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
)


def build_governed_agent_contract():
    """Build constraints for deterministic governed agent execution."""

    solver = Solver()

    authenticated = Bool("authenticated")
    quota_ok = Bool("quota_ok")
    policy_ok = Bool("policy_ok")
    audit_written = Bool("audit_written")
    user_gets_result = Bool("user_gets_result")
    external_side_effect = Bool("external_side_effect")

    risk = Const("risk", Risk)
    decision = Const("decision", Decision)

    solver.add(Implies(Not(authenticated), decision == BLOCK))
    solver.add(Implies(Not(quota_ok), decision == BLOCK))
    solver.add(Implies(And(authenticated, quota_ok, policy_ok, risk == LOW), decision == ALLOW))
    solver.add(Implies(And(authenticated, quota_ok, risk == MEDIUM), decision == REVIEW))
    solver.add(Implies(Or(risk == HIGH, risk == CRITICAL), decision == BLOCK))

    solver.add(Implies(external_side_effect, decision == ALLOW))
    solver.add(Implies(external_side_effect, audit_written))
    solver.add(Implies(decision != ALLOW, Not(external_side_effect)))
    solver.add(user_gets_result)

    return solver
