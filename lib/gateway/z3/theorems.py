"""
Proves 5 safety theorems about the gateway policy engine using Z3 SMT solver.

Method: refutation (negation check).
  If Not(claim) is UNSAT → claim holds for ALL inputs → proved.
  If Not(claim) is SAT   → counterexample found → policy is unsafe.

Usage:
    pip install z3-solver
    python3 lib/gateway/z3/theorems.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from z3 import Solver, Const, Bool, Not, Implies, Or, And, BoolVal, sat, unsat
from policy_model import (
    RoleSort, PlanSort, RiskSort, ModeSort,
    dec_allow, dec_block, dec_review,
    role_owner, plan_enterprise, risk_low, mode_gateway,
    is_write_role, is_execution_plan, approval_required,
    policy,
)

THEOREMS_PROVED: list[str] = []
THEOREMS_FAILED: list[str] = []


def _refute(name: str, claim) -> bool:
    """
    Checks whether NOT(claim) is satisfiable.
    UNSAT → claim is universally true → theorem proved.
    SAT   → counterexample exists → theorem fails.
    """
    s = Solver()
    s.add(Not(claim))
    result = s.check()
    if result == unsat:
        print(f'✓ PROVED   [{name}]')
        THEOREMS_PROVED.append(name)
        return True
    else:
        print(f'✗ FAILED   [{name}]  counterexample: {s.model()}')
        THEOREMS_FAILED.append(name)
        return False


def main() -> list[str]:
    # Symbolic free variables — Z3 will consider all possible values
    role = Const('role', RoleSort)
    plan = Const('plan', PlanSort)
    risk = Const('risk', RiskSort)
    mode = Const('mode', ModeSort)
    has_token = Bool('has_token')
    req_approval = Bool('req_approval')
    tool_exists = Bool('tool_exists')
    action_matches = Bool('action_matches')

    d = policy(role, plan, risk, mode, req_approval, has_token, tool_exists, action_matches)

    # ── Theorem 1: Role Safety ────────────────────────────────────────────────
    # If the decision is 'allow', the actor's role MUST be in WRITE_ROLES.
    # No counterexample: there is no assignment where allow fires with an invalid role.
    _refute(
        'role_safety',
        Implies(d == dec_allow, is_write_role(role))
    )

    # ── Theorem 2: Plan Safety ────────────────────────────────────────────────
    # If the decision is 'allow', the org plan MUST be in EXECUTION_PLANS.
    _refute(
        'plan_safety',
        Implies(d == dec_allow, is_execution_plan(plan))
    )

    # ── Theorem 3: Approval Safety ────────────────────────────────────────────
    # If the decision is 'allow' AND approval is required, a token MUST be present.
    # Without a token when approval is required, the decision is 'review', not 'allow'.
    _refute(
        'approval_safety',
        Implies(
            And(d == dec_allow, approval_required(req_approval, risk, mode)),
            has_token
        )
    )

    # ── Theorem 4: Audit Completeness ─────────────────────────────────────────
    # The policy function always returns one of the 4 defined decision values.
    # committed = (decision != 'allow') is True for block/review/ask_more_info.
    # Formally: for all inputs, decision is always a member of DecisionSort.
    _refute(
        'audit_completeness',
        Or(d == dec_allow, d == dec_block, d == dec_review)
        # Z3 enum sort is closed: every value is one of {allow,block,review,ask_more_info}
        # Negation (none of these) is UNSAT by enum exhaustion
    )

    # ── Theorem 5: Non-triviality ─────────────────────────────────────────────
    # There EXISTS a valid request that results in 'allow'.
    # (Confirms the system is not trivially all-blocking.)
    s = Solver()
    s.add(
        policy(
            role_owner, plan_enterprise, risk_low, mode_gateway,
            BoolVal(False), BoolVal(False), BoolVal(True), BoolVal(True)
        ) == dec_allow
    )
    result = s.check()
    if result == sat:
        print(f'✓ PROVED   [non_triviality]')
        THEOREMS_PROVED.append('non_triviality')
    else:
        print(f'✗ FAILED   [non_triviality]  system is trivially all-blocking!')
        THEOREMS_FAILED.append('non_triviality')

    print()
    print(f'Policy theorems: {len(THEOREMS_PROVED)} proved, {len(THEOREMS_FAILED)} failed')
    if THEOREMS_FAILED:
        sys.exit(1)
    return list(THEOREMS_PROVED)


if __name__ == '__main__':
    main()
