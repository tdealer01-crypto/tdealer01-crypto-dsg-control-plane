import { seedData } from '@/lib/dsg/seed/seed-engine';
import { runZ3AgentGate } from '@/lib/dsg/logic/z3-agent-gate';

export interface DeployMonitorInput {
  jobId: string;
  workspaceId: string;
  deploymentUrl: string;
  gateAllow: boolean;
  mockState?: boolean;
}

export interface DeployMonitorResult {
  ok: boolean;
  jobId: string;
  deploymentUrl: string;
  deploymentStatusHash: string;
  canTriggerDeploy: boolean;
  z3ProofHash: string;
  blockedReasons: string[];
}

// Z3 invariant: triggers_deploy requires gate_allow AND evidence_exists AND NOT mock_state.
export async function runDeployMonitor(input: DeployMonitorInput): Promise<DeployMonitorResult> {
  const mockState = input.mockState ?? false;

  const seedResult = await seedData({
    dataType: 'deployment_status',
    query: `deployment status for ${input.deploymentUrl}`,
    requiredEvidence: true,
    context: JSON.stringify({ deploymentUrl: input.deploymentUrl, jobId: input.jobId }),
  });

  const z3Result = await runZ3AgentGate({
    agentType: 'deploy-monitor',
    jobId: input.jobId,
    workspaceId: input.workspaceId,
    goalLocked: true,
    gateAllow: input.gateAllow,
    evidenceExists: seedResult.ok,
    mockState,
    dataNeeded: true,
    dataUnknown: !seedResult.ok,
    searchAttempted: seedResult.searchAttempted,
  });

  const canTriggerDeploy = z3Result.pass && input.gateAllow && seedResult.ok && !mockState;

  return {
    ok: z3Result.pass,
    jobId: input.jobId,
    deploymentUrl: input.deploymentUrl,
    deploymentStatusHash: seedResult.evidenceHash,
    canTriggerDeploy,
    z3ProofHash: z3Result.z3ProofHash,
    blockedReasons: z3Result.violations.map((v) => v.code),
  };
}
