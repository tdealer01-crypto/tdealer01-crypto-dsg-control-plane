from z3 import And, Bool, Const, EnumSort, If, Implies, Int, Not, Solver

FREE_QUOTA = 60
SOLO_QUOTA = 1_000
TEAM_QUOTA = 5_000
PRODUCTION_QUOTA = 20_000

Plan, (FREE, SOLO, TEAM, PRODUCTION) = EnumSort(
    "Plan",
    ["FREE", "SOLO", "TEAM", "PRODUCTION"],
)


def quota_for(plan):
    return If(
        plan == FREE,
        FREE_QUOTA,
        If(plan == SOLO, SOLO_QUOTA, If(plan == TEAM, TEAM_QUOTA, PRODUCTION_QUOTA)),
    )


def build_revenue_contract():
    """Build product-state constraints for the revenue-ready execution path.

    The model proves forbidden business states are impossible by construction.
    Runtime tests still verify concrete routes, database writes, and webhook behavior.
    """

    solver = Solver()

    user_present = Bool("user_present")
    org_present = Bool("org_present")
    credential_present = Bool("credential_present")
    credential_active = Bool("credential_active")
    stripe_paid = Bool("stripe_paid")
    webhook_verified = Bool("webhook_verified")
    webhook_processed_once = Bool("webhook_processed_once")
    entitlement_present = Bool("entitlement_present")
    execution_allowed = Bool("execution_allowed")
    upgrade_visible = Bool("upgrade_visible")
    audit_written = Bool("audit_written")

    plan = Const("plan", Plan)
    usage = Int("usage")
    quota = Int("quota")

    solver.add(usage >= 0)
    solver.add(quota == quota_for(plan))

    solver.add(Implies(And(stripe_paid, webhook_verified), entitlement_present))
    solver.add(Implies(entitlement_present, plan != FREE))
    solver.add(Implies(Not(entitlement_present), plan == FREE))

    solver.add(Implies(execution_allowed, user_present))
    solver.add(Implies(execution_allowed, org_present))
    solver.add(Implies(execution_allowed, credential_present))
    solver.add(Implies(execution_allowed, credential_active))
    solver.add(Implies(execution_allowed, usage < quota))
    solver.add(Implies(execution_allowed, audit_written))

    solver.add(Implies(usage >= quota, And(Not(execution_allowed), upgrade_visible)))
    solver.add(Implies(webhook_processed_once, entitlement_present))

    return solver
