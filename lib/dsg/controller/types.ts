import type {
  DeterministicGateDecision,
  DeterministicGateStatus,
  DeterministicRiskLevel,
  ResourceClassification,
} from '../deterministic/types';

export type DsgAutomationActionType =
  | 'agent_action'
  | 'connector_call'
  | 'finance_approval'
  | 'deployment_action'
  | 'evidence_export'
  | 'questionnaire_response'
  | 'policy_change';

export type DsgAutomationDecision = DeterministicGateStatus;

export type DsgAutomationProvider = 'webhook' | 'rest' | 'zapier' | 'make' | 'n8n' | 'internal';

export type DsgEvidenceState = 'VERIFIED' | 'REPO_STATED' | 'DEMO_ONLY' | 'UNSUPPORTED' | 'BLOCKED';

export type DsgAutomationActor = {
  userId: string;
  role: string;
  workspaceId: string;
};

export type DsgAutomationResource = {
  type: string;
  id: string;
  classification: ResourceClassification;
};

export type DsgAutomationConnector = {
  id: string;
  provider: DsgAutomationProvider;
  riskLevel?: DeterministicRiskLevel;
};

export type DsgAutomationEvidence = {
  id: string;
  title: string;
  state: DsgEvidenceState;
  source?: string;
};

export type DsgAutomationControllerRequest = {
  actionId: string;
  actionType: DsgAutomationActionType;
  actor: DsgAutomationActor;
  resource: DsgAutomationResource;
  connector?: DsgAutomationConnector;
  evidence?: DsgAutomationEvidence[];
  context: Record<string, unknown>;
  previousProofHash?: string;
  nonce: string;
  idempotencyKey: string;
};

export type DsgAutomationPolicyResult = {
  policyRef: string;
  policyVersion: string;
  riskLevel: DeterministicRiskLevel;
  requiredApproval: boolean;
  failureReasons: string[];
};

export type DsgAutomationAuditPreview = {
  auditRequired: true;
  policyRef: string;
  policyVersion: string;
  proofHash?: string;
  inputHash?: string;
  decision: DsgAutomationDecision;
  note: string;
};

export type DsgAutomationControllerResult = {
  ok: boolean;
  type: 'dsg-automation-controller-decision';
  decision: DsgAutomationDecision;
  actionType: DsgAutomationActionType;
  riskLevel: DeterministicRiskLevel;
  requiredApproval: boolean;
  policy: DsgAutomationPolicyResult;
  gate: DeterministicGateDecision;
  audit: DsgAutomationAuditPreview;
  remediation: string[];
  evidenceBoundary: {
    statement: string;
    source: 'repo_gate_scaffold';
    externalSolverInvoked: false;
    productionReadyClaim: false;
    consumerClaimSafe: true;
  };
};
