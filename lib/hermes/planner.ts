/**
 * Hermes Brain Planner
 *
 * Converts a user goal into a structured plan with typed steps,
 * worker assignments, doneWhen conditions, and expected evidence.
 * The plan is submitted to the DSG Plan Alignment Gate before execution.
 */

import { createHash, randomUUID } from "crypto";

export type WorkerType =
  | "file"
  | "terminal"
  | "browser"
  | "api"
  | "db"
  | "deploy"
  | "skill"
  | "subagent"
  | "research";

export type HermesPlanStep = {
  stepId: string;
  goal: string;
  worker: WorkerType;
  expectedEvidence: string[];
  params?: Record<string, unknown>;
};

export type HermesBrainPlan = {
  jobId: string;
  userGoal: string;
  userGoalHash: string;
  summary: string;
  steps: HermesPlanStep[];
  adaptiveExecution: {
    allowMethodChanges: true;
    allowFixAfterError: true;
    allowAdditionalStepsIfGoalAligned: true;
    requireReplanWhenOutsidePlan: true;
  };
  doneWhen: string[];
  createdAt: string;
};

export type PlanStepInput = {
  goal: string;
  worker: WorkerType;
  expectedEvidence?: string[];
  params?: Record<string, unknown>;
};

function goalHash(goal: string): string {
  return createHash("sha256").update(goal.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function buildHermesPlan(
  userGoal: string,
  stepInputs: PlanStepInput[],
  opts: { summary?: string; doneWhen?: string[] } = {},
): HermesBrainPlan {
  const jobId = randomUUID();
  const createdAt = new Date().toISOString();

  const steps: HermesPlanStep[] = stepInputs.map((s, i) => ({
    stepId: `step-${String(i + 1).padStart(2, "0")}`,
    goal: s.goal,
    worker: s.worker,
    expectedEvidence: s.expectedEvidence ?? defaultEvidence(s.worker),
    params: s.params,
  }));

  return {
    jobId,
    userGoal,
    userGoalHash: goalHash(userGoal),
    summary: opts.summary ?? userGoal.slice(0, 120),
    steps,
    adaptiveExecution: {
      allowMethodChanges: true,
      allowFixAfterError: true,
      allowAdditionalStepsIfGoalAligned: true,
      requireReplanWhenOutsidePlan: true,
    },
    doneWhen: opts.doneWhen ?? steps.map((s) => `${s.stepId} evidence received`),
    createdAt,
  };
}

function defaultEvidence(worker: WorkerType): string[] {
  switch (worker) {
    case "file":      return ["diff", "file_hash"];
    case "terminal":  return ["command_output", "exit_code"];
    case "browser":   return ["screenshot", "dom_snapshot"];
    case "api":       return ["response_status", "response_hash"];
    case "db":        return ["query_result", "schema_hash"];
    case "deploy":    return ["deployment_proof", "healthcheck"];
    case "skill":     return ["skill_version_hash", "test_result"];
    case "subagent":  return ["subagent_result_hash", "action_log"];
    case "research":  return ["source_citations", "summary_hash"];
    default:          return ["action_log"];
  }
}
