export type FinanceGovernanceAccessAction = 'approve' | 'reject' | 'escalate' | 'read';

export type FinanceGovernanceAccessDecision = {
  ok: boolean;
  orgId: string;
  actor: string;
  role: string;
  plan: string;
  action: FinanceGovernanceAccessAction;
  reason?: string;
};

const WRITE_ROLES = new Set(['owner', 'admin', 'finance_admin', 'finance_approver']);
const READ_ROLES = new Set([...WRITE_ROLES, 'finance_viewer', 'viewer', 'auditor']);
const WRITE_PLANS = new Set(['enterprise', 'business', 'pro']);
const READ_PLANS = new Set([...WRITE_PLANS, 'free', 'trial']);

function header(request: Request, name: string) {
  return request.headers.get(name)?.trim() ?? '';
}

function deny(
  orgId: string,
  actor: string,
  role: string,
  plan: string,
  action: FinanceGovernanceAccessAction,
  reason: string
): FinanceGovernanceAccessDecision {
  return { ok: false, orgId, actor, role, plan, action, reason };
}

export function evaluateFinanceGovernanceAccess(
  request: Request,
  orgId: string,
  action: FinanceGovernanceAccessAction
): FinanceGovernanceAccessDecision {
  const actor = header(request, 'x-actor-id') || header(request, 'x-user-id') || 'anonymous';
  const role = (header(request, 'x-actor-role') || header(request, 'x-user-role') || '').toLowerCase();
  const plan = (header(request, 'x-org-plan') || header(request, 'x-plan') || '').toLowerCase();

  if (!orgId) {
    return deny(orgId, actor, role, plan, action, 'missing_org_id');
  }

  if (!role) {
    return deny(orgId, actor, role, plan, action, 'missing_actor_role');
  }

  if (!plan) {
    return deny(orgId, actor, role, plan, action, 'missing_org_plan');
  }

  const allowedRoles = action === 'read' ? READ_ROLES : WRITE_ROLES;
  const allowedPlans = action === 'read' ? READ_PLANS : WRITE_PLANS;

  if (!allowedRoles.has(role)) {
    return deny(orgId, actor, role, plan, action, 'role_not_allowed');
  }

  if (!allowedPlans.has(plan)) {
    return deny(orgId, actor, role, plan, action, 'plan_not_entitled');
  }

  return { ok: true, orgId, actor, role, plan, action };
}

export function requireFinanceGovernanceAccess(
  request: Request,
  orgId: string,
  action: FinanceGovernanceAccessAction
): FinanceGovernanceAccessDecision {
  const decision = evaluateFinanceGovernanceAccess(request, orgId, action);

  if (!decision.ok) {
    throw new Error(decision.reason ?? 'finance_governance_access_denied');
  }

  return decision;
}
