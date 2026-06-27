import type { GatewayDecision, GatewayToolRegistryEntry, GatewayToolRequest } from './types';

const WRITE_ROLES = new Set(['owner', 'admin', 'finance_admin', 'finance_approver', 'agent_operator']);
const EXECUTION_PLANS = new Set(['enterprise', 'business', 'pro']);

export type GatewayPolicyDecision = {
  decision: GatewayDecision;
  reason?: string;
};

export function evaluateGatewayToolRequest(
  request: GatewayToolRequest,
  tool: GatewayToolRegistryEntry | null
): GatewayPolicyDecision {
  if (!request.orgId) {
    return { decision: 'block', reason: 'missing_org_id' };
  }

  if (!request.actorId) {
    return { decision: 'block', reason: 'missing_actor_id' };
  }

  if (!request.actorRole) {
    return { decision: 'block', reason: 'missing_actor_role' };
  }

  if (!request.orgPlan) {
    return { decision: 'block', reason: 'missing_org_plan' };
  }

  if (!tool) {
    return { decision: 'block', reason: 'tool_not_registered' };
  }

  if (tool.action !== request.action) {
    return { decision: 'block', reason: 'tool_action_mismatch' };
  }

  if (!WRITE_ROLES.has(request.actorRole.toLowerCase())) {
    return { decision: 'block', reason: 'role_not_allowed' };
  }

  if (!EXECUTION_PLANS.has(request.orgPlan.toLowerCase())) {
    return { decision: 'block', reason: 'plan_not_entitled' };
  }

  const approvalRequired = tool.requiresApproval || tool.risk === 'critical' || tool.executionMode === 'critical';

  if (approvalRequired && !request.approvalToken) {
    return { decision: 'review', reason: 'approval_required' };
  }

  return { decision: 'allow' };
}
