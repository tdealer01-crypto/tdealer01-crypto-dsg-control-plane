export type NoMockGuardInput = {
  environment: 'development' | 'test' | 'preview' | 'production';
  sourceOfTruth: 'database' | 'external_verified' | 'memory' | 'localStorage' | 'fixture' | 'mock';
  hasDeploymentProof: boolean;
  hasProductionFlowProof: boolean;
};

export function checkNoMockProductionGuard(input: NoMockGuardInput): { ok: boolean; blocks: string[] } {
  const blocks: string[] = [];
  if (input.environment !== 'production') blocks.push('ENVIRONMENT_NOT_PRODUCTION');
  if (['memory', 'localStorage', 'fixture', 'mock'].includes(input.sourceOfTruth)) blocks.push('SOURCE_OF_TRUTH_NOT_REAL');
  if (!input.hasDeploymentProof) blocks.push('NO_DEPLOYMENT_PROOF');
  if (!input.hasProductionFlowProof) blocks.push('NO_PRODUCTION_FLOW_PROOF');
  return { ok: blocks.length === 0, blocks };
}
