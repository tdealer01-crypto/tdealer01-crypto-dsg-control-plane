import { evaluateDeterministicGate } from '../deterministic/gate-engine';
import type { DeterministicRiskLevel } from '../deterministic/types';
import type {
  DsgAutomationControllerRequest,
  DsgAutomationControllerResult,
  DsgAutomationPolicyResult,
  DsgEvidenceState,
} from './types';

const POLICY_VERSION = '1.0';

function asBoolean(context: Record<string, unknown>, key: string) {
  return context[key] === true;
}

function highestRisk(a: DeterministicRiskLevel, b: DeterministicRiskLevel): DeterministicRiskLevel {
  const order: Record<DeterministicRiskLevel, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  return order[b] > order[a] ? b : a;
}

function riskFromClassification(classification: DsgAutomationControllerRequest['resource']['classification']): DeterministicRiskLevel {
  if (classification === 'top_secret') return 'critical';
  if (classification === 'secret') return 'high';
  if (classification === 'internal') return 'medium';
  return 'low';
}

function riskFromAction(actionType: DsgAutomationControllerRequest['actionType']): DeterministicRiskLevel {
  if (actionType === 'deployment_action') return 'high';
  if (actionType === 'policy_change') return 'high';
  if (actionType === 'finance_approval') return 'medium';
  if (actionType === 'connector_call') return 'medium';
  return 'low';
}

function evidenceStates(request: DsgAutomationControllerRequest): DsgEvidenceState[] {
  return Array.isArray(request.evidence) ? request.evidence.map((item) => item.state) : [];
}

function hasBlockingEvidence(request: DsgAutomationControllerRequest) {
  return evidenceStates(request).some((state) => state === 'BLOCKED' || state === 'UNSUPPORTED');
}

function hasOnlySafeEvidenceStates(request: DsgAutomationControllerRequest) {
  const states = evidenceStates(request);
  if (states.length === 0) return false;
  return states.every((state) => state === 'VERIFIED' || state === 'REPO_STATED');
}

function approvalRequired(request: DsgAutomationControllerRequest, riskLevel: DeterministicRiskLevel) {
  if (riskLevel === 'critical' || riskLevel === 'high') return true;
  if (request.actionType === 'deployment_action') return true;
  if (request.actionType === 'policy_change') return true;
  if (request.resource.classification === 'secret' || request.resource.classification === 'top_secret') return true;
  return false;
}

function evaluatePolicy(request: DsgAutomationControllerRequest): DsgAutomationPolicyResult {
  let riskLevel = riskFromAction(request.actionType);
  riskLevel = highestRisk(riskLevel, riskFromClassification(request.resource.classification));
  if (request.connector?.riskLevel) {
    riskLevel = highestRisk(riskLevel, request.connector.riskLevel);
  }

  const requiredApproval = approvalRequired(request, riskLevel);
  const failureReasons: string[] = [];

  if (!request.actor.userId || !request.actor.role || !request.actor.workspaceId) {
    failureReasons.push('missing_actor_identity');
  }

  if (!request.resource.id || !request.resource.type) {
    failureReasons.push('missing_resource_identity');
  }

  if (hasBlockingEvidence(request)) {
    failureReasons.push('blocked_or_unsupported_evidence_present');
  }

  if (requiredApproval && !asBoolean(request.context, 'approval_available')) {
    failureReasons.push('required_approval_not_available');
  }

  return {
    policyRef: `dsg.automation.${request.actionType}`,
    policyVersion: POLICY_VERSION,
    riskLevel,
    requiredApproval,
    failureReasons,
  };
}

function buildGateContext(request: DsgAutomationControllerRequest, policy: DsgAutomationPolicyResult) {
  const evidenceIsUsable = hasOnlySafeEvidenceStates(request) && !hasBlockingEvidence(request);
  const permissionGranted = asBoolean(request.context, 'permission_granted') && policy.failureReasons.length === 0;

  return {
    requirement_clear: asBoolean(request.context, 'requirement_clear'),
    tool_available: asBoolean(request.context, 'tool_available'),
    permission_granted: permissionGranted,
    secret_bound:
      request.resource.classification === 'public'
        ? true
        : asBoolean(request.context, 'secret_bound'),
    dependency_resolved: asBoolean(request.context, 'dependency_resolved'),
    testable: asBoolean(request.context, 'testable'),
    deploy_target_ready:
      request.actionType === 'deployment_action'
        ? asBoolean(request.context, 'deploy_target_ready')
        : true,
    audit_hook_available: asBoolean(request.context, 'audit_hook_available'),
    evidence_available: evidenceIsUsable,
    approval_available: policy.requiredApproval
      ? asBoolean(request.context, 'approval_available')
      : true,
  };
}

function remediationFor(result: Pick<DsgAutomationControllerResult, 'decision' | 'policy'>) {
  if (result.decision === 'PASS') return [];

  const remediation = new Set<string>();
  result.policy.failureReasons.forEach((reason) => remediation.add(reason));
  remediation.add('verify_action_requirement_context');
  remediation.add('attach_verified_or_repo_stated_evidence');
  remediation.add('confirm_actor_permission_and_org_scope');
  remediation.add('confirm_audit_hook_before_execution');

  if (result.policy.requiredApproval) {
    remediation.add('attach_human_approval_before_execution');
  }

  return Array.from(remediation);
}

export function evaluateAutomationController(
  request: DsgAutomationControllerRequest
): DsgAutomationControllerResult {
  const policy = evaluatePolicy(request);
  const gate = evaluateDeterministicGate({
    planId: request.actionId,
    policyRef: policy.policyRef,
    policyVersion: policy.policyVersion,
    riskLevel: policy.riskLevel,
    previousProofHash: request.previousProofHash,
    nonce: request.nonce,
    idempotencyKey: request.idempotencyKey,
    context: buildGateContext(request, policy),
  });

  const partial = {
    decision: gate.gateStatus,
    policy,
  };

  const remediation = remediationFor(partial);

  return {
    ok: gate.gateStatus === 'PASS',
    type: 'dsg-automation-controller-decision',
    decision: gate.gateStatus,
    actionType: request.actionType,
    riskLevel: policy.riskLevel,
    requiredApproval: policy.requiredApproval,
    policy,
    gate,
    audit: {
      auditRequired: true,
      policyRef: policy.policyRef,
      policyVersion: policy.policyVersion,
      proofHash: gate.proof.proofHash,
      inputHash: gate.proof.inputHash,
      decision: gate.gateStatus,
      note: 'Audit preview is derived from the deterministic gate scaffold response. It is not a WORM storage or cryptographic-signature completion claim.',
    },
    remediation,
    evidenceBoundary: {
      statement:
        'DSG Automation Controller maps agent/workflow actions through policy, evidence, approval, deterministic proof/gate, and audit preview before execute/block. It reuses the repository deterministic gate scaffold and does not create mock proof, random decision, fake testimonial, or certification claim.',
      source: 'repo_gate_scaffold',
      externalSolverInvoked: false,
      productionReadyClaim: false,
      consumerClaimSafe: true,
    },
  };
}
