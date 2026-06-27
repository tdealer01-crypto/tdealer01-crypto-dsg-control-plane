/**
 * Hermes Full Option Runtime
 *
 * Orchestrates the full execution loop:
 *   1. Receive user goal + plan
 *   2. For each step: send action event → DSG alignment gate
 *   3. If PLAN_MATCHED_ALLOW_AUDIT → execute via worker
 *   4. Collect evidence → submit receipt to DSG
 *   5. On error: do NOT stop — use error as input, fix and retry
 *   6. If out-of-plan: replan and submit new plan
 *   7. When all doneWhen conditions met → job complete
 *
 * DSG rules enforced here:
 *   - Every action goes through alignment gate before execution
 *   - Every result produces an evidence receipt
 *   - Claims are bounded by evidence (no claim without proof)
 *   - Errors trigger adaptive retry, not termination
 */

import { evaluatePlanAlignment } from "@/lib/dsg/plan-alignment-gate";
import { buildHermesEvidenceReceipt } from "@/lib/dsg/plan-alignment-gate";
import type { HermesPlanScopeContract } from "@/lib/dsg/plan-scope-contract";
import { buildActionEvent } from "./action-event";
import { routeToWorker } from "./worker-router";
import { buildResultHash } from "./evidence-reporter";
import type { HermesBrainPlan, HermesPlanStep } from "./planner";
import type { EvidenceItem } from "./evidence-reporter";
import { recordErrorFix, findErrorFix } from "./memory";

export type StepOutcome = {
  stepId: string;
  decision: string;
  success: boolean;
  evidence: EvidenceItem[];
  receiptHash: string;
  retryCount: number;
  errorMessage?: string;
};

export type JobResult = {
  jobId: string;
  planHash: string;
  allStepsDone: boolean;
  stepOutcomes: StepOutcome[];
  evidenceSummary: string[];
  claimBoundary: string;
  completedAt: string;
};

export type RuntimeOptions = {
  maxRetries?: number;
  workspaceId: string;
  sessionId: string;
};

export async function executeHermesPlan(
  plan: HermesBrainPlan,
  contract: HermesPlanScopeContract,
  opts: RuntimeOptions,
): Promise<JobResult> {
  const outcomes: StepOutcome[] = [];
  const maxRetries = opts.maxRetries ?? 2;

  for (const step of plan.steps) {
    const outcome = await executeStep(step, plan, contract, opts, maxRetries);
    outcomes.push(outcome);

    if (!outcome.success && outcome.decision === "OUT_OF_PLAN_DENY") {
      // Out-of-plan action — stop this step and record, but continue remaining steps.
      // Caller can request a replan for the failed step.
      continue;
    }
  }

  const allDone = outcomes.every((o) => o.success || o.decision === "PLAN_RELATED_REPLAN");
  const evidenceSummary = outcomes.flatMap((o) => o.evidence.map((e) => `${e.type}:${e.hash.slice(0, 12)}`));

  return {
    jobId: plan.jobId,
    planHash: contract.planHash,
    allStepsDone: allDone,
    stepOutcomes: outcomes,
    evidenceSummary,
    claimBoundary: contract.claimBoundary,
    completedAt: new Date().toISOString(),
  };
}

async function executeStep(
  step: HermesPlanStep,
  plan: HermesBrainPlan,
  contract: HermesPlanScopeContract,
  opts: RuntimeOptions,
  maxRetries: number,
): Promise<StepOutcome> {
  let retryCount = 0;
  let lastError: string | undefined;
  let lastEvidence: EvidenceItem[] = [];

  while (retryCount <= maxRetries) {
    // 1. Build action event for this step
    const event = buildActionEvent({
      planId: contract.planId,
      planHash: contract.planHash,
      workspaceId: opts.workspaceId,
      agentId: contract.agentId,
      sessionId: opts.sessionId,
      stepId: step.stepId,
      worker: step.worker,
      operationName: step.goal.slice(0, 80),
      // On retry: keep same idempotencyKey so DSG can detect duplicates
      idempotencyKey: `${plan.jobId}:${step.stepId}`,
    });

    // 2. Check plan alignment
    const alignment = evaluatePlanAlignment(contract, event);

    if (!alignment.canProceed) {
      if (alignment.decision === "PLAN_RELATED_REPLAN") {
        return { stepId: step.stepId, decision: alignment.decision, success: false, evidence: [], receiptHash: "", retryCount, errorMessage: alignment.reasons.join("; ") };
      }
      if (alignment.decision === "CLAIM_EVIDENCE_DENY") {
        return { stepId: step.stepId, decision: alignment.decision, success: false, evidence: [], receiptHash: "", retryCount, errorMessage: alignment.reasons.join("; ") };
      }
      return { stepId: step.stepId, decision: alignment.decision, success: false, evidence: [], receiptHash: "", retryCount, errorMessage: alignment.reasons.join("; ") };
    }

    // 3. Execute via worker
    const workerResult = await routeToWorker(step, {
      jobId: plan.jobId,
      stepId: step.stepId,
      workspaceId: opts.workspaceId,
      params: step.params,
    });

    lastEvidence = workerResult.evidence;

    // 4. Build evidence receipt
    const receipt = buildHermesEvidenceReceipt(contract, event, alignment, {
      commandId: `${plan.jobId}:${step.stepId}:${retryCount}`,
      actionStatus: workerResult.success ? "SUCCESS" : "FAILED",
      observedResultHash: buildResultHash(workerResult.evidence),
      evidenceItemIds: workerResult.evidence.map((e) => e.hash.slice(0, 16)),
      claimVerified: workerResult.success && workerResult.evidence.length > 0,
    });

    if (workerResult.success) {
      return {
        stepId: step.stepId,
        decision: alignment.decision,
        success: true,
        evidence: workerResult.evidence,
        receiptHash: receipt.receiptHash,
        retryCount,
      };
    }

    // 5. On error — record in memory, prepare retry
    lastError = workerResult.errorMessage;
    const errorSig = `${step.worker}:${lastError?.slice(0, 80) ?? "unknown"}`;

    // Check memory for a known fix pattern
    const knownFix = findErrorFix(opts.workspaceId, opts.sessionId, errorSig);
    if (knownFix && retryCount === 0) {
      // Attempt the known fix by patching step params
      step = { ...step, params: { ...step.params, fixHint: knownFix.fixPatch } };
    }

    // Record this error for future memory
    recordErrorFix(opts.workspaceId, opts.sessionId, {
      errorSignature: errorSig,
      rootCause: lastError ?? "unknown",
      fixPatch: step.params?.fixHint ? String(step.params.fixHint) : "",
      verificationCommand: `npm run typecheck`,
      evidenceHash: buildResultHash(lastEvidence),
    });

    retryCount++;
  }

  return {
    stepId: step.stepId,
    decision: "PLAN_MATCHED_ALLOW_AUDIT",
    success: false,
    evidence: lastEvidence,
    receiptHash: "",
    retryCount,
    errorMessage: `Failed after ${retryCount} retries: ${lastError}`,
  };
}
