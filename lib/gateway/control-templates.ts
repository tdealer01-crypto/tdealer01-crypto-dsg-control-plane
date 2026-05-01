export type GatewayControlTemplate = {
  id: string;
  name: string;
  category: 'identity' | 'entitlement' | 'risk' | 'approval' | 'evidence' | 'runtime' | 'deployment';
  description: string;
  requiredEvidence: string[];
  recommendedMode: 'gateway' | 'monitor' | 'deploy_gate' | 'any';
  defaultRisk: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  status: 'implemented' | 'planned';
};

export const gatewayControlTemplates: GatewayControlTemplate[] = [
  {
    id: 'identity-required',
    name: 'Organization and actor identity required',
    category: 'identity',
    description: 'Require organization, actor, and actor role before an AI-proposed action can be evaluated.',
    requiredEvidence: ['orgId', 'actorId', 'actorRole'],
    recommendedMode: 'any',
    defaultRisk: 'medium',
    requiresApproval: false,
    status: 'implemented',
  },
  {
    id: 'tool-registration-required',
    name: 'Tool registration required',
    category: 'runtime',
    description: 'Require the target tool/action to be registered before execution or audit commit.',
    requiredEvidence: ['toolName', 'action', 'connectorRecord'],
    recommendedMode: 'gateway',
    defaultRisk: 'medium',
    requiresApproval: false,
    status: 'implemented',
  },
  {
    id: 'action-match-invariant',
    name: 'Requested action must match registered action',
    category: 'runtime',
    description: 'Block mismatched tool/action requests before execution.',
    requiredEvidence: ['toolName', 'action', 'actionMatchesTool'],
    recommendedMode: 'any',
    defaultRisk: 'medium',
    requiresApproval: false,
    status: 'implemented',
  },
  {
    id: 'high-risk-approval',
    name: 'High-risk action approval required',
    category: 'approval',
    description: 'Route high-risk or approval-required actions to review before execution.',
    requiredEvidence: ['risk', 'requiresApproval', 'decision'],
    recommendedMode: 'monitor',
    defaultRisk: 'high',
    requiresApproval: true,
    status: 'implemented',
  },
  {
    id: 'evidence-writable-before-allow',
    name: 'Evidence writable before allow',
    category: 'evidence',
    description: 'Fail closed if audit evidence cannot be written before an allow decision is returned.',
    requiredEvidence: ['auditToken', 'requestHash', 'decisionHash'],
    recommendedMode: 'monitor',
    defaultRisk: 'high',
    requiresApproval: false,
    status: 'implemented',
  },
  {
    id: 'request-result-hash-proof',
    name: 'Request and result hash proof',
    category: 'evidence',
    description: 'Produce requestHash before execution and recordHash after execution or audit commit.',
    requiredEvidence: ['requestHash', 'recordHash'],
    recommendedMode: 'any',
    defaultRisk: 'medium',
    requiresApproval: false,
    status: 'implemented',
  },
  {
    id: 'customer-key-custody',
    name: 'Customer key custody preserved',
    category: 'runtime',
    description: 'Use Monitor Mode when the customer must keep API keys and execution inside its own runtime.',
    requiredEvidence: ['auditToken', 'customerRuntimeResult', 'recordHash'],
    recommendedMode: 'monitor',
    defaultRisk: 'high',
    requiresApproval: false,
    status: 'implemented',
  },
  {
    id: 'ci-cd-deploy-gate',
    name: 'CI/CD deploy gate',
    category: 'deployment',
    description: 'Gate production deployment readiness and protected-route behavior in GitHub Actions.',
    requiredEvidence: ['verdict', 'readinessStatus', 'evidenceHash'],
    recommendedMode: 'deploy_gate',
    defaultRisk: 'high',
    requiresApproval: false,
    status: 'implemented',
  },
  {
    id: 'signed-evidence-bundle',
    name: 'Signed evidence bundle',
    category: 'evidence',
    description: 'Export a portable evidence bundle with bundleHash, eventHashes, and signature metadata.',
    requiredEvidence: ['bundleHash', 'eventHashes', 'signature'],
    recommendedMode: 'any',
    defaultRisk: 'medium',
    requiresApproval: false,
    status: 'implemented',
  },
  {
    id: 'pdf-evidence-report',
    name: 'PDF evidence report',
    category: 'evidence',
    description: 'Generate a human-readable evidence report for consultants, reviewers, and buyers.',
    requiredEvidence: ['reportPdf', 'bundleHash'],
    recommendedMode: 'any',
    defaultRisk: 'medium',
    requiresApproval: false,
    status: 'planned',
  },
];

export function listGatewayControlTemplates() {
  return gatewayControlTemplates;
}
