import { createHash } from 'node:crypto';

export type ManusCapabilityId =
  | 'auth_rbac'
  | 'deterministic_planner'
  | 'flow_studio'
  | 'sandbox_isolation'
  | 'agent_repair_loop'
  | 'remote_browser_session'
  | 'artifact_timeline'
  | 'preview_deployment_proof'
  | 'production_smoke_proof';

export type ManusCapabilityStatus = 'PASS' | 'PARTIAL' | 'BLOCKED';

export type ManusCapability = {
  id: ManusCapabilityId;
  label: string;
  status: ManusCapabilityStatus;
  requiredForComplete: boolean;
  evidence: string[];
  blockedReason?: string;
  nextAction: string;
};

export type ManusLevelGate = {
  claim: 'MANUS_LEVEL_BLOCKED' | 'MANUS_LEVEL_PARTIAL' | 'MANUS_LEVEL_COMPLETE';
  complete: boolean;
  score: number;
  passed: number;
  totalRequired: number;
  capabilities: ManusCapability[];
  missingRequired: ManusCapabilityId[];
  proofHash: string;
};

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort())).digest('hex');
}

export function evaluateManusLevelGate(input?: Partial<Record<ManusCapabilityId, ManusCapabilityStatus>>): ManusLevelGate {
  const status = (id: ManusCapabilityId, fallback: ManusCapabilityStatus) => input?.[id] ?? fallback;
  const capabilities: ManusCapability[] = [
    {
      id: 'auth_rbac',
      label: 'Verified auth and workspace RBAC',
      status: status('auth_rbac', 'PASS'),
      requiredForComplete: true,
      evidence: ['App Builder and Flow Studio guarded routes return DSG_AUTH_REQUIRED without valid context.'],
      nextAction: 'Keep all privileged runtime routes behind verified DSG context.',
    },
    {
      id: 'deterministic_planner',
      label: 'Deterministic planner and claim gate',
      status: status('deterministic_planner', 'PASS'),
      requiredForComplete: true,
      evidence: ['control-kernel smoke', 'deterministic suite smoke', 'Flow Studio smoke'],
      nextAction: 'Keep claim downgrade behavior deterministic and fail-closed.',
    },
    {
      id: 'flow_studio',
      label: 'Flow Studio hardened action planner',
      status: status('flow_studio', 'PASS'),
      requiredForComplete: true,
      evidence: ['Flow Studio production smoke verified', 'mutate route locked', 'MCP route allowlisted'],
      nextAction: 'Connect planner outputs to App Builder timeline and artifact ledger.',
    },
    {
      id: 'sandbox_isolation',
      label: 'Isolated sandbox runner',
      status: status('sandbox_isolation', 'BLOCKED'),
      requiredForComplete: true,
      evidence: ['Sandbox contract exists, but no isolated provider proof exists yet.'],
      blockedReason: 'Need provider-backed isolated execution, command logs, timeout, and artifact storage.',
      nextAction: 'Add provider adapter for isolated build/test execution and attach logs as evidence.',
    },
    {
      id: 'agent_repair_loop',
      label: 'Plan-act-observe-repair-verify loop',
      status: status('agent_repair_loop', 'PARTIAL'),
      requiredForComplete: true,
      evidence: ['Build log analyzer and deterministic workflow exist, but autonomous repair commits are not provider-backed.'],
      blockedReason: 'Need controlled repair attempt loop against sandbox failures.',
      nextAction: 'Implement bounded repair attempts with diff evidence and stop conditions.',
    },
    {
      id: 'remote_browser_session',
      label: 'Remote browser/computer session',
      status: status('remote_browser_session', 'BLOCKED'),
      requiredForComplete: true,
      evidence: ['Flow Studio MCP-style search is native public API, not a remote browser session.'],
      blockedReason: 'Need actual browser/session provider, screenshots, navigation log, and takeover checkpoint.',
      nextAction: 'Add remote browser provider adapter and proof capture.',
    },
    {
      id: 'artifact_timeline',
      label: 'User-visible artifact timeline',
      status: status('artifact_timeline', 'PARTIAL'),
      requiredForComplete: true,
      evidence: ['App Builder metadata and proof screens exist, but unified timeline is not complete.'],
      blockedReason: 'Need generated files, PR links, build logs, browser proof, and deployment proof in one timeline.',
      nextAction: 'Build a single evidence timeline component backed by deterministic report data.',
    },
    {
      id: 'preview_deployment_proof',
      label: 'Preview deployment proof collector',
      status: status('preview_deployment_proof', 'BLOCKED'),
      requiredForComplete: true,
      evidence: ['Vercel build status exists, but per-job preview proof collector is not wired.'],
      blockedReason: 'Need URL health check, response code, screenshot or HTML proof, and stored proof hash per job.',
      nextAction: 'Add preview proof collector and store proof hash before claim promotion.',
    },
    {
      id: 'production_smoke_proof',
      label: 'Production smoke proof',
      status: status('production_smoke_proof', 'PASS'),
      requiredForComplete: true,
      evidence: ['Production smoke verified for App Builder and Flow Studio routes.'],
      nextAction: 'Keep production smoke tests explicit and repeatable.',
    },
  ];

  const required = capabilities.filter((capability) => capability.requiredForComplete);
  const passed = required.filter((capability) => capability.status === 'PASS').length;
  const missingRequired = required.filter((capability) => capability.status !== 'PASS').map((capability) => capability.id);
  const score = Number((passed / required.length).toFixed(4));
  const claim = missingRequired.length === 0 ? 'MANUS_LEVEL_COMPLETE' : passed > 0 ? 'MANUS_LEVEL_PARTIAL' : 'MANUS_LEVEL_BLOCKED';
  const proofBasis = { claim, passed, totalRequired: required.length, missingRequired, capabilities };

  return {
    claim,
    complete: claim === 'MANUS_LEVEL_COMPLETE',
    score,
    passed,
    totalRequired: required.length,
    capabilities,
    missingRequired,
    proofHash: hash(proofBasis),
  };
}
