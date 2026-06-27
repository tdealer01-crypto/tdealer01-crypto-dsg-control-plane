import { sha256Json } from '@/lib/dsg/runtime/hash';
import { seedData } from '@/lib/dsg/seed/seed-engine';
import { runZ3AgentGate, isZ3Pass } from '@/lib/dsg/logic/z3-agent-gate';
import { getAgent } from './registry';
import type { AgentDispatchOrder, AgentJob, AgentResult, AgentType } from './types';

export interface ExecutorOptions {
  goalLocked?: boolean;
  mockState?: boolean;
  gateAllow?: boolean;
}

// Body executes; agents decide. Every execution goes through: seed → Z3 verify → gate → run.
export async function executeAgent(
  dispatch: AgentDispatchOrder,
  opts: ExecutorOptions = {},
): Promise<AgentResult> {
  const { agentType, jobId, workspaceId, goal } = dispatch;
  const registration = getAgent(agentType);

  if (!registration) {
    return {
      ok: false,
      jobId,
      agentType: agentType as AgentType,
      status: 'blocked',
      evidenceHash: 'sha256:none',
      error: `UNKNOWN_AGENT_TYPE:${agentType}`,
    };
  }

  const job: AgentJob = {
    jobId,
    agentType: agentType as AgentType,
    workspaceId,
    goal,
    seedData: [],
    z3Result: null,
    gateDecision: null,
    status: 'seeding',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Step 1: Seed Engine — fetch real data, never guess
  const seedResult = await seedData({
    dataType: 'external_api',
    query: goal,
    requiredEvidence: false,
  });
  job.seedData = [seedResult];

  const dataUnknown = !seedResult.ok;
  const searchAttempted = seedResult.searchAttempted;

  // Step 2: Z3 formal verification of agent invariants
  job.status = 'z3-verify';
  const goalLocked = opts.goalLocked ?? true;
  const gateAllow = opts.gateAllow ?? false;
  const mockState = opts.mockState ?? false;

  const z3Result = await runZ3AgentGate({
    agentType: agentType as AgentType,
    jobId,
    workspaceId,
    goalLocked,
    gateAllow,
    evidenceExists: seedResult.ok,
    mockState,
    dataNeeded: true,
    dataUnknown,
    searchAttempted,
  });

  job.z3Result = z3Result;

  if (!isZ3Pass(z3Result)) {
    job.status = 'blocked';
    return {
      ok: false,
      jobId,
      agentType: agentType as AgentType,
      status: 'blocked',
      evidenceHash: z3Result.z3ProofHash,
      error: `Z3_BLOCK:${z3Result.violations.map((v) => v.code).join(',')}`,
    };
  }

  // Step 3: Security Gate check
  job.status = 'gate-check';
  if (!gateAllow) {
    job.gateDecision = 'BLOCK';
    job.status = 'blocked';
    return {
      ok: false,
      jobId,
      agentType: agentType as AgentType,
      status: 'blocked',
      evidenceHash: z3Result.z3ProofHash,
      error: 'GATE_DECISION_NOT_ALLOW',
    };
  }

  job.gateDecision = 'ALLOW';

  // Step 4: Execute — dispatch to agent API endpoint
  job.status = 'running';
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const response = await fetch(`${baseUrl}${registration.endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jobId, workspaceId, goal, seedData: job.seedData }),
    });

    if (!response.ok) {
      throw new Error(`AGENT_HTTP_${response.status}`);
    }

    const resultPayload = await response.json();
    job.resultPayload = resultPayload;
    job.status = 'pass';

    const evidenceHash = sha256Json({ jobId, agentType, goal, resultPayload });

    return {
      ok: true,
      jobId,
      agentType: agentType as AgentType,
      status: 'pass',
      evidenceHash,
      payload: resultPayload,
    };
  } catch (err) {
    job.status = 'failed';
    return {
      ok: false,
      jobId,
      agentType: agentType as AgentType,
      status: 'failed',
      evidenceHash: z3Result.z3ProofHash,
      error: String(err),
    };
  }
}
