import { runZ3AgentGate } from '@/lib/dsg/logic/z3-agent-gate';
import { seedData } from '@/lib/dsg/seed/seed-engine';

export interface MultiGovernanceOrchestratorInput {
  orchestrationId: string;
  sources: Array<{
    name: string;
    type: 'ui-trust' | 'action-layer' | 'deterministic' | 'marketplace' | 'enterprise';
    policies: string[];
  }>;
  targetEnvironment: 'staging' | 'production';
  requiresArchitectureReview?: boolean;
  mockState?: boolean;
}

export interface MultiGovernanceOrchestratorResult {
  ok: boolean;
  orchestrationId: string;
  orchestrationStatus: 'READY' | 'REVIEW' | 'BLOCKED';
  proofHash: string;
  sourcesStatus: Array<{
    name: string;
    type: string;
    policies: string[];
    gateStatus: 'PASS' | 'REVIEW' | 'BLOCK';
    ready: boolean;
  }>;
  architectureReview: {
    required: boolean;
    approved?: boolean;
    reviewers: string[];
    findings: string[];
  };
  productionGoNoGo: {
    canDeploy: boolean;
    checks: Record<string, boolean>;
    blockers: string[];
  };
  nextSteps: string[];
}

/**
 * Multi-Governance Orchestrator Skill
 *
 * Orchestrate multiple governance sources:
 * - UI trust upgrades
 * - Action-layer permission gates
 * - Deterministic execution
 * - Marketplace/enterprise cutover
 * - Architecture pages validation
 * - Production GO/NO-GO validation
 */
export async function runMultiGovernanceOrchestrator(
  input: MultiGovernanceOrchestratorInput,
): Promise<MultiGovernanceOrchestratorResult> {
  const mockState = input.mockState ?? false;

  // Seed orchestration context
  const seedResult = await seedData({
    dataType: 'codebase_state',
    query: `Orchestration ${input.orchestrationId} for ${input.targetEnvironment}`,
    requiredEvidence: true,
    context: JSON.stringify({
      sourceCount: input.sources.length,
      targetEnvironment: input.targetEnvironment,
      architectureReviewRequired: input.requiresArchitectureReview ?? false,
    }),
  });

  // Evaluate each governance source
  const sourcesStatus = await Promise.all(
    input.sources.map(async (source) => {
      const sourceGateResult = await runZ3AgentGate({
        agentType: 'orchestrator',
        jobId: `orch-${source.name}-${Date.now()}`,
        workspaceId: 'dsg-control-plane',
        goalLocked: true,
        gateAllow: true,
        evidenceExists: seedResult.ok,
        mockState,
        dataNeeded: true,
        dataUnknown: !seedResult.ok,
        searchAttempted: seedResult.searchAttempted,
      });

      const gateStatus: 'PASS' | 'REVIEW' | 'BLOCK' = sourceGateResult.pass ? 'PASS' : 'REVIEW';

      return {
        name: source.name,
        type: source.type,
        policies: source.policies,
        gateStatus,
        ready: gateStatus === 'PASS' && !mockState,
      };
    }),
  );

  // Determine overall orchestration status
  const allReady = sourcesStatus.every((s) => s.ready);
  const hasReviewNeeded = sourcesStatus.some((s) => s.gateStatus === 'REVIEW');

  let orchestrationStatus: 'READY' | 'REVIEW' | 'BLOCKED' = 'BLOCKED';
  if (allReady) {
    orchestrationStatus = 'READY';
  } else if (hasReviewNeeded) {
    orchestrationStatus = 'REVIEW';
  }

  // Architecture review logic
  const architectureApproved = !input.requiresArchitectureReview || allReady;

  // Production GO/NO-GO determination
  const prodChecks = {
    all_sources_ready: allReady,
    architecture_approved: architectureApproved,
    compliance_evidence_ready: seedResult.ok,
    no_mock_state: !mockState,
    target_environment_valid: ['staging', 'production'].includes(input.targetEnvironment),
  };

  const blockers: string[] = [];
  if (!allReady) blockers.push('Not all governance sources are ready');
  if (!architectureApproved && input.requiresArchitectureReview)
    blockers.push('Architecture review required but not approved');
  if (mockState) blockers.push('Mock state enabled - cannot deploy to production');

  return {
    ok: !mockState && orchestrationStatus !== 'BLOCKED',
    orchestrationId: input.orchestrationId,
    orchestrationStatus,
    proofHash: seedResult.evidenceHash,
    sourcesStatus,
    architectureReview: {
      required: input.requiresArchitectureReview ?? false,
      approved: architectureApproved,
      reviewers: input.requiresArchitectureReview ? ['architecture-team', 'security-lead'] : [],
      findings: [],
    },
    productionGoNoGo: {
      canDeploy: allReady && architectureApproved && !mockState,
      checks: prodChecks,
      blockers,
    },
    nextSteps:
      orchestrationStatus === 'READY'
        ? ['Deploy to production', 'Monitor governance events', 'Collect audit evidence']
        : orchestrationStatus === 'REVIEW'
          ? ['Address review findings', 'Resubmit governance sources', 'Request approvals']
          : ['Fix blockers', 'Escalate to governance team', 'Retry orchestration'],
  };
}
