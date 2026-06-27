import { executeAgent } from '@/lib/dsg/agents/executor';
import { runZ3AgentGate } from '@/lib/dsg/logic/z3-agent-gate';
import type { AgentType } from '@/lib/dsg/agents/types';

export interface OrchestratorInput {
  jobId: string;
  workspaceId: string;
  goal: string;
  goalLocked: boolean;
  subGoals: Array<{ agentType: string; goal: string }>;
}

export interface OrchestratorResult {
  ok: boolean;
  jobId: string;
  dispatched: Array<{ agentType: string; result: string }>;
  blocked: Array<{ agentType: string; reason: string }>;
  z3ProofHash: string;
}

export async function runOrchestrator(input: OrchestratorInput): Promise<OrchestratorResult> {
  const dispatched: Array<{ agentType: string; result: string }> = [];
  const blocked: Array<{ agentType: string; reason: string }> = [];

  if (!input.goalLocked) {
    return {
      ok: false,
      jobId: input.jobId,
      dispatched,
      blocked: input.subGoals.map((sg) => ({
        agentType: sg.agentType,
        reason: 'ORCHESTRATOR_NO_GOAL_LOCK',
      })),
      z3ProofHash: 'sha256:none',
    };
  }

  const z3Result = await runZ3AgentGate({
    agentType: 'orchestrator',
    jobId: input.jobId,
    workspaceId: input.workspaceId,
    goalLocked: input.goalLocked,
    gateAllow: input.goalLocked,
    evidenceExists: true,
    mockState: false,
  });

  if (!z3Result.pass) {
    return {
      ok: false,
      jobId: input.jobId,
      dispatched,
      blocked: input.subGoals.map((sg) => ({
        agentType: sg.agentType,
        reason: `Z3_BLOCK:${z3Result.violations.map((v) => v.code).join(',')}`,
      })),
      z3ProofHash: z3Result.z3ProofHash,
    };
  }

  for (const sg of input.subGoals) {
    const subJobId = `${input.jobId}-${sg.agentType}-${Date.now()}`;
    const result = await executeAgent(
      { jobId: subJobId, agentType: sg.agentType as AgentType, workspaceId: input.workspaceId, goal: sg.goal },
      { goalLocked: true, gateAllow: true, mockState: false },
    );
    if (result.ok) {
      dispatched.push({ agentType: sg.agentType, result: result.evidenceHash });
    } else {
      blocked.push({ agentType: sg.agentType, reason: result.error ?? 'UNKNOWN' });
    }
  }

  return {
    ok: blocked.length === 0,
    jobId: input.jobId,
    dispatched,
    blocked,
    z3ProofHash: z3Result.z3ProofHash,
  };
}
