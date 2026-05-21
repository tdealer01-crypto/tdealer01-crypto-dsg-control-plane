"""Z3 formal model of lib/gateway/policy.ts — evaluateGatewayToolRequest().

Defines the enum sorts, predicates, and policy function that mirror the
TypeScript implementation exactly. Import in theorems.py and
defi_constraints.py to prove safety properties.
"""
from z3 import EnumSort, Bool, Const, And, Or, Not, If, Implies, BoolVal

# ── Enum sorts — mirror TypeScript union type literals exactly ─────────────────

RoleSort, (
    role_owner, role_admin, role_finance_admin, role_finance_approver,
    role_agent_operator, role_viewer, role_member, role_unknown
) = EnumSort('Role', [
    'owner', 'admin', 'finance_admin', 'finance_approver',
    'agent_operator', 'viewer', 'member', 'unknown_role'
])

PlanSort, (
    plan_enterprise, plan_business, plan_pro, plan_starter, plan_unknown
) = EnumSort('Plan', ['enterprise', 'business', 'pro', 'starter', 'unknown_plan'])

DecisionSort, (
    dec_allow, dec_block, dec_review, dec_ask_more_info
) = EnumSort('Decision', ['allow', 'block', 'review', 'ask_more_info'])

RiskSort, (
    risk_low, risk_medium, risk_high, risk_critical
) = EnumSort('Risk', ['low', 'medium', 'high', 'critical'])

ModeSort, (
    mode_monitor, mode_gateway, mode_critical
) = EnumSort('Mode', ['monitor', 'gateway', 'critical'])

# ── Policy constants (match policy.ts exactly) ────────────────────────────────

WRITE_ROLES = [
    role_owner, role_admin, role_finance_admin,
    role_finance_approver, role_agent_operator
]
EXECUTION_PLANS = [plan_enterprise, plan_business, plan_pro]


def is_write_role(r):
    """Mirrors: actorRole ∈ WRITE_ROLES in policy.ts"""
    return Or([r == wr for wr in WRITE_ROLES])


def is_execution_plan(p):
    """Mirrors: orgPlan ∈ EXECUTION_PLANS in policy.ts"""
    return Or([p == ep for ep in EXECUTION_PLANS])


def approval_required(req_approval, risk, mode):
    """Mirrors: tool.requiresApproval || tool.risk === 'critical' || tool.executionMode === 'critical'"""
    return Or(req_approval, risk == risk_critical, mode == mode_critical)


def policy(role, plan, risk, mode, req_approval, has_token, tool_exists, action_matches):
    """
    Z3 encoding of evaluateGatewayToolRequest() — returns a DecisionSort value.
    Evaluation order mirrors the TypeScript if-chain exactly:
      1. tool not found           → block
      2. action mismatch          → block
      3. role not in WRITE_ROLES  → block
      4. plan not in EXEC_PLANS   → block
      5. approval required, no token → review
      6. otherwise                → allow
    """
    return If(
        Not(tool_exists), dec_block,
        If(Not(action_matches), dec_block,
        If(Not(is_write_role(role)), dec_block,
        If(Not(is_execution_plan(plan)), dec_block,
        If(And(approval_required(req_approval, risk, mode), Not(has_token)), dec_review,
        dec_allow)))))
