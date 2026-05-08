export type AgentCapabilityGapType =
  | 'missing_connector'
  | 'missing_ui'
  | 'missing_api'
  | 'missing_workflow'
  | 'missing_proof'
  | 'unknown';

export type AgentCapabilityGapInput = {
  requestedAction: string;
  currentCapability?: string;
  userBenefit?: string;
  evidenceRequired?: string[];
};

export type AgentCapabilityGapResolution = {
  gapType: AgentCapabilityGapType;
  builderRequired: true;
  approvalRequired: true;
  recommendedBuilderGoal: string;
  successCriteria: string[];
  constraints: string[];
  nextEndpoint: string;
  truthBoundary: string;
};

function classifyGap(text: string): AgentCapabilityGapType {
  const value = text.toLowerCase();
  if (/gmail|drive|slack|github|stripe|browser|connector|api key|token/.test(value)) return 'missing_connector';
  if (/button|screen|page|ui|dashboard|preview|panel/.test(value)) return 'missing_ui';
  if (/endpoint|api|route|webhook|service/.test(value)) return 'missing_api';
  if (/flow|workflow|approval|handoff|runtime|process/.test(value)) return 'missing_workflow';
  if (/proof|audit|evidence|log|verify|verification/.test(value)) return 'missing_proof';
  return 'unknown';
}

export function resolveAgentCapabilityGap(input: AgentCapabilityGapInput): AgentCapabilityGapResolution {
  const requestedAction = input.requestedAction.trim();
  if (!requestedAction) throw new Error('REQUESTED_ACTION_REQUIRED');

  const gapType = classifyGap(`${requestedAction} ${input.currentCapability || ''}`);
  const benefit = input.userBenefit?.trim() || 'The user gets a working capability instead of a dead-end agent response.';
  const evidence = input.evidenceRequired?.length ? input.evidenceRequired : ['pullRequestUrl', 'generatedFiles', 'auditEvent'];

  return {
    gapType,
    builderRequired: true,
    approvalRequired: true,
    recommendedBuilderGoal: `Create the missing DSG agent capability: ${requestedAction}. User benefit: ${benefit}`,
    successCriteria: [
      'The missing capability is represented as a visible App Builder plan before execution.',
      'The user can approve or reject the build request before any code-generation action runs.',
      `Evidence is returned after build: ${evidence.join(', ')}.`,
      'No production deploy is triggered by the gap resolver. Preview or production proof remains a separate quota-gated step.',
    ],
    constraints: [
      'Use existing DSG App Builder endpoints and approval flow.',
      'Do not execute hidden automation without user approval.',
      'Do not claim production verification until live proof is attached.',
      'Prefer GitHub pull request evidence before spending Vercel deployment quota.',
    ],
    nextEndpoint: '/api/dsg/app-builder/jobs',
    truthBoundary: 'This resolver creates a governed builder request only. It does not directly implement, deploy, or verify production behavior.',
  };
}
