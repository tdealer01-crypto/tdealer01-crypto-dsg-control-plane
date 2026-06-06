import { sha256Json, sha256Text } from './hash';
import type { GateStatus, RiskLevel } from './types';

export type GatewayInvariantInput = {
  hasOrg: boolean;
  hasActor: boolean;
  hasActorRole: boolean;
  hasOrgPlan: boolean;
  isRegisteredTool: boolean;
  actionMatchesTool: boolean;
  actorRoleAllowed: boolean;
  planEntitled: boolean;
  risk: RiskLevel;
  requiresApproval: boolean;
  hasApproval: boolean;
  evidenceWritable: boolean;
};

export type GatewayProofViolation = { code: string; message: string };
export type GatewayProofDecision = { decision: GateStatus; violated: GatewayProofViolation[]; smt2: string; smt2Hash: string; resultHash: string; policyVersion: string; sourceRepo: string; sourceRef: string };

export const GATEWAY_POLICY_VERSION = 'control-plane-gateway-smt2-v1';
export const GATEWAY_SOURCE_REPO = 'tdealer01-crypto/tdealer01-crypto-dsg-control-plane';

function riskToInt(risk: RiskLevel): 0 | 1 | 2 | 3 {
  if (risk === 'CRITICAL') return 3;
  if (risk === 'HIGH') return 2;
  if (risk === 'MEDIUM') return 1;
  return 0;
}

function bool(v: boolean): 'true' | 'false' { return v ? 'true' : 'false'; }

function renderGatewayInvariantSmt2(input: GatewayInvariantInput): string {
  const r = riskToInt(input.risk);
  return `; DSG Gateway deterministic invariant check
(set-logic QF_UFLIA)

(declare-const has_org Bool)
(declare-const has_actor Bool)
(declare-const has_actor_role Bool)
(declare-const has_org_plan Bool)
(declare-const is_registered_tool Bool)
(declare-const action_matches_tool Bool)
(declare-const actor_role_allowed Bool)
(declare-const plan_entitled Bool)
(declare-const evidence_writable Bool)
(declare-const requires_approval Bool)
(declare-const has_approval Bool)
(declare-const risk Int)

(assert (= has_org ${bool(input.hasOrg)}))
(assert (= has_actor ${bool(input.hasActor)}))
(assert (= has_actor_role ${bool(input.hasActorRole)}))
(assert (= has_org_plan ${bool(input.hasOrgPlan)}))
(assert (= is_registered_tool ${bool(input.isRegisteredTool)}))
(assert (= action_matches_tool ${bool(input.actionMatchesTool)}))
(assert (= actor_role_allowed ${bool(input.actorRoleAllowed)}))
(assert (= plan_entitled ${bool(input.planEntitled)}))
(assert (= evidence_writable ${bool(input.evidenceWritable)}))
(assert (= requires_approval ${bool(input.requiresApproval)}))
(assert (= has_approval ${bool(input.hasApproval)}))
(assert (= risk ${r}))

(assert has_org)
(assert has_actor)
(assert has_actor_role)
(assert has_org_plan)
(assert is_registered_tool)
(assert action_matches_tool)
(assert actor_role_allowed)
(assert plan_entitled)
(assert evidence_writable)
(assert (=> (or requires_approval (>= risk 2)) has_approval))

(check-sat)
(get-model)
`;
}

export function evaluateGatewayProof(input: GatewayInvariantInput & { sourceRef?: string }): GatewayProofDecision {
  const violated: GatewayProofViolation[] = [];
  if (!input.hasOrg) violated.push({ code: 'ORG_REQUIRED', message: 'Missing org context' });
  if (!input.hasActor) violated.push({ code: 'ACTOR_REQUIRED', message: 'Missing actor context' });
  if (!input.hasActorRole) violated.push({ code: 'ACTOR_ROLE_REQUIRED', message: 'Missing actor role' });
  if (!input.hasOrgPlan) violated.push({ code: 'ORG_PLAN_REQUIRED', message: 'Missing org plan' });
  if (!input.isRegisteredTool) violated.push({ code: 'REGISTERED_TOOL_REQUIRED', message: 'Tool is not registered' });
  if (!input.actionMatchesTool) violated.push({ code: 'ACTION_TOOL_MISMATCH', message: 'Action does not match tool' });
  if (!input.actorRoleAllowed) violated.push({ code: 'ACTOR_ROLE_NOT_ALLOWED', message: 'Actor role is not allowed' });
  if (!input.planEntitled) violated.push({ code: 'PLAN_NOT_ENTITLED', message: 'Plan is not entitled for action' });
  if (!input.evidenceWritable) violated.push({ code: 'EVIDENCE_NOT_WRITABLE', message: 'Evidence writer unavailable' });
  if ((input.requiresApproval || riskToInt(input.risk) >= 2) && !input.hasApproval) violated.push({ code: 'APPROVAL_REQUIRED', message: 'Approval required but missing' });

  const smt2 = renderGatewayInvariantSmt2(input);
  const smt2Hash = sha256Text(smt2);
  const sorted = violated.sort((a,b)=>a.code.localeCompare(b.code));
  const decision: GateStatus = sorted.length ? 'BLOCK' : 'PASS';
  const sourceRef = input.sourceRef ?? 'unknown';
  const resultHash = sha256Json({
    stage: 'bridge',
    topoIndex: 1,
    taskId: '16K-A',
    policyVersion: GATEWAY_POLICY_VERSION,
    sourceRepo: GATEWAY_SOURCE_REPO,
    sourceRef,
    decision,
    violated: sorted,
    smt2Hash,
  });

  return { decision, violated: sorted, smt2, smt2Hash, resultHash, policyVersion: GATEWAY_POLICY_VERSION, sourceRepo: GATEWAY_SOURCE_REPO, sourceRef };
}
