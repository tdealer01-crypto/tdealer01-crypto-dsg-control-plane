import { executeAgent } from '@/lib/dsg/agents/executor';
import { runZ3AgentGate } from '@/lib/dsg/logic/z3-agent-gate';
import { callAgentModel } from '@/lib/dsg/ai/model-router';
import type { AgentType } from '@/lib/dsg/agents/types';

const VALID_SUB_AGENTS = new Set<AgentType>([
  'code-evolution',
  'test-coverage',
  'deploy-monitor',
  'browser-research',
  'security-gate',
]);

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
  plannedSubGoals?: Array<{ agentType: string; goal: string }>;
  plannerModel?: string;
  plannerProvider?: string;
  plannerError?: string;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced ?? text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('PLANNER_JSON_NOT_FOUND');
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeSubGoals(value: unknown): Array<{ agentType: string; goal: string }> {
  const root = value as { subGoals?: unknown };
  const rows = Array.isArray(root.subGoals) ? root.subGoals : [];
  return rows
    .map((row) => row as { agentType?: unknown; goal?: unknown })
    .filter((row) => typeof row.agentType === 'string' && typeof row.goal === 'string')
    .filter((row) => VALID_SUB_AGENTS.has(row.agentType as AgentType))
    .slice(0, 5)
    .map((row) => ({ agentType: row.agentType as string, goal: row.goal as string }));
}

async function planSubGoals(input: OrchestratorInput): Promise<{
  subGoals: Array<{ agentType: string; goal: string }>;
  model?: string;
  provider?: string;
  error?: string;
}> {
  if (input.subGoals.length > 0) return { subGoals: input.subGoals };

  const modelResult = await callAgentModel({
    temperature: 0,
    maxTokens: 900,
    messages: [
      {
        role: 'system',
        content: [
          'You are the DSG Orchestrator planner.',
          'Return JSON only: {"subGoals":[{"agentType":"browser-research|code-evolution|test-coverage|deploy-monitor|security-gate","goal":"..."}]}',
          'Do not claim revenue or production readiness. Create safe, evidence-first subgoals only.',
          'Prefer browser-research for unknown data, security-gate for action checks, code-evolution only after a plan is clear.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `Goal: ${input.goal}`,
      },
    ],
  });

  if (!modelResult.ok) {
    return { subGoals: [], error: modelResult.error, model: modelResult.model, provider: modelResult.provider };
  }

  try {
    const parsed = extractJson(modelResult.content);
    return {
      subGoals: normalizeSubGoals(parsed),
      model: modelResult.model,
      provider: modelResult.provider,
    };
  } catch (err) {
    return {
      subGoals: [],
      error: err instanceof Error ? err.message : String(err),
      model: modelResult.model,
      provider: modelResult.provider,
    };
  }
}

export async function runOrchestrator(input: OrchestratorInput): Promise<OrchestratorResult> {
  const dispatched: Array<{ agentType: string; result: string }> = [];
  const blocked: Array<{ agentType: string; reason: string }> = [];

  const plan = await planSubGoals(input);

  if (!input.goalLocked) {
    return {
      ok: false,
      jobId: input.jobId,
      dispatched,
      blocked: (plan.subGoals.length ? plan.subGoals : input.subGoals).map((sg) => ({
        agentType: sg.agentType,
        reason: 'ORCHESTRATOR_NO_GOAL_LOCK',
      })),
      z3ProofHash: 'sha256:none',
      plannedSubGoals: plan.subGoals,
      plannerModel: plan.model,
      plannerProvider: plan.provider,
      plannerError: plan.error,
    };
  }

  if (input.subGoals.length === 0 && plan.subGoals.length === 0) {
    return {
      ok: false,
      jobId: input.jobId,
      dispatched,
      blocked: [{ agentType: 'orchestrator', reason: plan.error ?? 'PLANNER_RETURNED_NO_SUBGOALS' }],
      z3ProofHash: 'sha256:none',
      plannedSubGoals: [],
      plannerModel: plan.model,
      plannerProvider: plan.provider,
      plannerError: plan.error,
    };
  }

  const subGoals = plan.subGoals.length ? plan.subGoals : input.subGoals;

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
      blocked: subGoals.map((sg) => ({
        agentType: sg.agentType,
        reason: `Z3_BLOCK:${z3Result.violations.map((v) => v.code).join(',')}`,
      })),
      z3ProofHash: z3Result.z3ProofHash,
      plannedSubGoals: plan.subGoals,
      plannerModel: plan.model,
      plannerProvider: plan.provider,
      plannerError: plan.error,
    };
  }

  for (const sg of subGoals) {
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
    plannedSubGoals: plan.subGoals,
    plannerModel: plan.model,
    plannerProvider: plan.provider,
    plannerError: plan.error,
  };
}
