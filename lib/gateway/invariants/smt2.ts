import crypto from 'node:crypto';
import type { GatewayToolRequest } from '../types';

export type Smt2InvariantRisk = 0 | 1 | 2 | 3;

export type Smt2InvariantInput = {
  hasOrg: boolean;
  hasActor: boolean;
  hasActorRole: boolean;
  hasOrgPlan: boolean;
  isRegisteredTool: boolean;
  actionMatchesTool: boolean;
  actorRoleAllowed: boolean;
  planEntitled: boolean;
  risk: Smt2InvariantRisk;
  requiresApproval: boolean;
  hasApproval: boolean;
  evidenceWritable: boolean;
};

export type Smt2InvariantEvaluation = {
  ok: boolean;
  decision: 'allow' | 'block';
  violated: string[];
  smt2: string;
  smt2Hash: string;
  resultHash: string;
};

const ROLE_ALLOWLIST = new Set(['owner', 'admin', 'finance_admin', 'finance_approver', 'agent_operator']);
const PLAN_ALLOWLIST = new Set(['enterprise', 'business', 'pro']);

function bool(value: boolean) {
  return value ? 'true' : 'false';
}

function riskToInt(risk: string | undefined): Smt2InvariantRisk {
  if (risk === 'critical') return 3;
  if (risk === 'high') return 2;
  if (risk === 'medium') return 1;
  return 0;
}

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function buildSmt2InvariantInput(
  request: GatewayToolRequest,
  tool: { action: string; risk: string; requiresApproval: boolean } | null,
  evidenceWritable = true
): Smt2InvariantInput {
  return {
    hasOrg: Boolean(request.orgId),
    hasActor: Boolean(request.actorId),
    hasActorRole: Boolean(request.actorRole),
    hasOrgPlan: Boolean(request.orgPlan),
    isRegisteredTool: Boolean(tool),
    actionMatchesTool: Boolean(tool && tool.action === request.action),
    actorRoleAllowed: ROLE_ALLOWLIST.has((request.actorRole || '').toLowerCase()),
    planEntitled: PLAN_ALLOWLIST.has((request.orgPlan || '').toLowerCase()),
    risk: riskToInt(tool?.risk),
    requiresApproval: Boolean(tool?.requiresApproval),
    hasApproval: Boolean(request.approvalToken),
    evidenceWritable,
  };
}

export function renderGatewayInvariantSmt2(input: Smt2InvariantInput) {
  return `; DSG Gateway deterministic invariant check\n; Generated from normalized gateway request.\n; Risk scale: 0 low, 1 medium, 2 high, 3 critical\n\n(set-logic QF_UFLIA)\n\n(declare-const has_org Bool)\n(declare-const has_actor Bool)\n(declare-const has_actor_role Bool)\n(declare-const has_org_plan Bool)\n(declare-const is_registered_tool Bool)\n(declare-const action_matches_tool Bool)\n(declare-const actor_role_allowed Bool)\n(declare-const plan_entitled Bool)\n(declare-const risk Int)\n(declare-const requires_approval Bool)\n(declare-const has_approval Bool)\n(declare-const evidence_writable Bool)\n\n(assert (= has_org ${bool(input.hasOrg)}))\n(assert (= has_actor ${bool(input.hasActor)}))\n(assert (= has_actor_role ${bool(input.hasActorRole)}))\n(assert (= has_org_plan ${bool(input.hasOrgPlan)}))\n(assert (= is_registered_tool ${bool(input.isRegisteredTool)}))\n(assert (= action_matches_tool ${bool(input.actionMatchesTool)}))\n(assert (= actor_role_allowed ${bool(input.actorRoleAllowed)}))\n(assert (= plan_entitled ${bool(input.planEntitled)}))\n(assert (= risk ${input.risk}))\n(assert (= requires_approval ${bool(input.requiresApproval)}))\n(assert (= has_approval ${bool(input.hasApproval)}))\n(assert (= evidence_writable ${bool(input.evidenceWritable)}))\n\n; Core invariants required before ALLOW.\n(assert has_org)\n(assert has_actor)\n(assert has_actor_role)\n(assert has_org_plan)\n(assert is_registered_tool)\n(assert action_matches_tool)\n(assert actor_role_allowed)\n(assert plan_entitled)\n(assert evidence_writable)\n\n; High-risk and critical actions require approval.\n(assert (=> (or requires_approval (>= risk 2)) has_approval))\n\n(check-sat)\n(get-model)\n`;
}

export function evaluateSmt2InvariantInput(input: Smt2InvariantInput): Smt2InvariantEvaluation {
  const violated: string[] = [];

  if (!input.hasOrg) violated.push('missing_org_id');
  if (!input.hasActor) violated.push('missing_actor_id');
  if (!input.hasActorRole) violated.push('missing_actor_role');
  if (!input.hasOrgPlan) violated.push('missing_org_plan');
  if (!input.isRegisteredTool) violated.push('tool_not_registered');
  if (!input.actionMatchesTool) violated.push('tool_action_mismatch');
  if (!input.actorRoleAllowed) violated.push('role_not_allowed');
  if (!input.planEntitled) violated.push('plan_not_entitled');
  if (!input.evidenceWritable) violated.push('evidence_not_writable');
  if ((input.requiresApproval || input.risk >= 2) && !input.hasApproval) violated.push('approval_required');

  const smt2 = renderGatewayInvariantSmt2(input);
  const smt2Hash = sha256(smt2);
  const resultHash = sha256(JSON.stringify({ violated, smt2Hash }));

  return {
    ok: violated.length === 0,
    decision: violated.length === 0 ? 'allow' : 'block',
    violated,
    smt2,
    smt2Hash,
    resultHash,
  };
}
