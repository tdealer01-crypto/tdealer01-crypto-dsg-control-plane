export type DsgClaimLevel = 'BUILDABLE' | 'IMPLEMENTED' | 'VERIFIED' | 'DEPLOYABLE' | 'PRODUCTION';

export type DsgClaimGateInput = {
  hasEvidence: boolean;
  hasAuditExport: boolean;
  hasReplayProof: boolean;
  hasAuthRbacProof: boolean;
  hasDeploymentProof: boolean;
  hasProductionFlowProof: boolean;
  usesMockState: boolean;
  isDevOrSmokeOnly: boolean;
};

export type DsgClaimGateResult = {
  allowed: boolean;
  level: DsgClaimLevel;
  blocks: string[];
};

const BLOCKS = {
  evidence: 'NO_EVIDENCE',
  audit: 'NO_AUDIT_EXPORT',
  replay: 'NO_REPLAY_PROOF',
  auth: 'NO_AUTH_RBAC_PROOF',
  deployment: 'NO_DEPLOYMENT_PROOF',
  productionFlow: 'NO_PRODUCTION_FLOW_PROOF',
  mock: 'MOCK_STATE_BLOCKS_PRODUCTION',
  smoke: 'DEV_OR_SMOKE_ONLY_BLOCKS_PRODUCTION',
} as const;

export function evaluateDsgClaimGate(input: DsgClaimGateInput): DsgClaimGateResult {
  const blocks: string[] = [];

  const completed = input.hasEvidence && input.hasAuditExport && input.hasReplayProof;
  if (!input.hasEvidence) blocks.push(BLOCKS.evidence);
  if (!input.hasAuditExport) blocks.push(BLOCKS.audit);
  if (!input.hasReplayProof) blocks.push(BLOCKS.replay);

  const verified = completed && input.hasAuthRbacProof;
  if (!input.hasAuthRbacProof) blocks.push(BLOCKS.auth);

  const deployable = verified && input.hasDeploymentProof;
  if (!input.hasDeploymentProof) blocks.push(BLOCKS.deployment);

  const production =
    deployable &&
    input.hasProductionFlowProof &&
    !input.usesMockState &&
    !input.isDevOrSmokeOnly;

  if (!input.hasProductionFlowProof) blocks.push(BLOCKS.productionFlow);
  if (input.usesMockState) blocks.push(BLOCKS.mock);
  if (input.isDevOrSmokeOnly) blocks.push(BLOCKS.smoke);

  if (production) {
    return { allowed: true, level: 'PRODUCTION', blocks: [] };
  }

  if (deployable) {
    return { allowed: true, level: 'DEPLOYABLE', blocks };
  }

  if (verified) {
    return { allowed: true, level: 'VERIFIED', blocks };
  }

  if (completed) {
    return { allowed: true, level: 'IMPLEMENTED', blocks };
  }

  return { allowed: true, level: 'BUILDABLE', blocks };
}

export function assertNoProductionClaim(input: DsgClaimGateInput): void {
  const result = evaluateDsgClaimGate(input);
  if (result.level === 'PRODUCTION') return;

  throw new Error(
    `Production claim blocked. Current level=${result.level}; blocks=${result.blocks.join(',')}`,
  );
}
