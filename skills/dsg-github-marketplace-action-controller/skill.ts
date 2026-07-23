import { runZ3AgentGate } from '@/lib/dsg/logic/z3-agent-gate';
import { seedData } from '@/lib/dsg/seed/seed-engine';

export interface GitHubActionControllerInput {
  actionName: string;
  actionVersion: string;
  gatePolicy: 'deterministic' | 'z3-proof' | 'compliance';
  inputs?: Record<string, string>;
  secrets?: string[];
  mockState?: boolean;
}

export interface GitHubActionControllerResult {
  ok: boolean;
  actionName: string;
  actionVersion: string;
  gateDecision: 'GO' | 'NO-GO';
  proofHash: string;
  actionYmlSpec: {
    name: string;
    description: string;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
  };
  goNoGoChecks: {
    deterministicGatePassed: boolean;
    complianceEvidencePacked: boolean;
    auditTrailReady: boolean;
    secretsIsolated: boolean;
  };
  publishReadiness: {
    canPublishToMarketplace: boolean;
    blockers: string[];
    recommendations: string[];
  };
}

/**
 * GitHub Marketplace Action Controller Skill
 *
 * Package DSG gates and proofs as reusable GitHub Actions:
 * - Deterministic GO/NO-GO validation
 * - Audit proof generation
 * - Secure deploy checks
 * - Compliance evidence packing
 */
export async function runGitHubActionController(
  input: GitHubActionControllerInput,
): Promise<GitHubActionControllerResult> {
  const mockState = input.mockState ?? false;

  // Seed governance data for the action
  const seedResult = await seedData({
    dataType: 'github_action',
    query: `GitHub Action: ${input.actionName}@${input.actionVersion}`,
    requiredEvidence: true,
    context: JSON.stringify({
      policy: input.gatePolicy,
      hasSecrets: (input.secrets?.length ?? 0) > 0,
      inputCount: Object.keys(input.inputs ?? {}).length,
    }),
  });

  // Gate evaluation for marketplace readiness
  const gateResult = await runZ3AgentGate({
    agentType: 'github-action-controller',
    jobId: `gh-action-${input.actionName}-${Date.now()}`,
    workspaceId: 'dsg-control-plane',
    goalLocked: true,
    gateAllow: true,
    evidenceExists: seedResult.ok,
    mockState,
    dataNeeded: true,
    dataUnknown: !seedResult.ok,
    searchAttempted: seedResult.searchAttempted,
  });

  // Determine GO/NO-GO based on gate and compliance checks
  const secretsIsolated = (input.secrets ?? []).length === 0 || seedResult.ok;
  const deterministicPassed = gateResult.pass && !mockState;
  const canPublish = deterministicPassed && secretsIsolated && seedResult.ok;

  const blockers: string[] = [];
  if (!deterministicPassed) blockers.push('Deterministic gate did not pass');
  if (!secretsIsolated) blockers.push('Secrets not properly isolated');
  if (!seedResult.ok) blockers.push('Compliance evidence not ready');

  return {
    ok: canPublish && !mockState,
    actionName: input.actionName,
    actionVersion: input.actionVersion,
    gateDecision: canPublish ? 'GO' : 'NO-GO',
    proofHash: gateResult.z3ProofHash,
    actionYmlSpec: {
      name: input.actionName,
      description: `DSG-governed GitHub Action: ${input.actionName}`,
      inputs: input.inputs ?? {},
      outputs: {
        decision: 'GO | NO-GO',
        proof_hash: gateResult.z3ProofHash,
      },
    },
    goNoGoChecks: {
      deterministicGatePassed: deterministicPassed,
      complianceEvidencePacked: seedResult.ok,
      auditTrailReady: gateResult.pass,
      secretsIsolated,
    },
    publishReadiness: {
      canPublishToMarketplace: canPublish,
      blockers,
      recommendations: [
        'Verify action inputs and outputs',
        'Ensure secrets use GitHub Actions encrypted context',
        'Test on sample repository',
        'Document governance policy',
      ],
    },
  };
}
