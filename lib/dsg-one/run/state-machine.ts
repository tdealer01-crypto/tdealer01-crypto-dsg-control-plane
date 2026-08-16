/**
 * DSG ONE — Verified Execution run state machine.
 *
 * Pure and deterministic: same run + same event => same result, no clock, no
 * network, no database. Every timestamp arrives on the event so a run can be
 * replayed from its event log and land in the same state.
 *
 * The invariants this module exists to hold:
 *
 *   1. Nothing is dispatched before the user approves (planHash frozen).
 *   2. Every observation must carry the frozen planHash.
 *   3. UNSUPPORTED is never PASS.
 *   4. A run ends in exactly one of VERIFIED / NEEDS_REVIEW / BLOCKED / CANCELLED.
 *   5. Terminal runs never move again.
 */

import { sha256Hash } from '../../dsg/brain/hash-utils';
import {
  isTerminal,
  riskExceeds,
  type GateVerdict,
  type Run,
  type RunEvent,
  type RunPlan,
  type RunRiskLevel,
  type RunStep,
  type RunTransitionResult,
  type StepJudgement,
  type StepObservation,
  type StepStatus,
} from './types';

/** Default plan lifetime. An approval is consent for now, not forever. */
export const DEFAULT_PLAN_TTL_MS = 60 * 60 * 1000;

/**
 * Freeze a plan into its planHash.
 *
 * Covers everything the user actually consented to: the steps, the scope
 * boundary, the exclusions, and the policy version in force. Changing any of
 * them produces a different hash, which is what makes "the agent went outside
 * the approved plan" mechanically detectable rather than a matter of opinion.
 */
export function computePlanHash(plan: RunPlan): string {
  return sha256Hash({
    intent: plan.intent,
    steps: plan.steps.map((step) => ({
      ordinal: step.ordinal,
      actionType: step.actionType,
      targetSystem: step.targetSystem,
      operation: step.operation,
      riskLevel: step.riskLevel,
    })),
    allowedTargetSystems: [...plan.allowedTargetSystems].sort(),
    allowedOperations: [...plan.allowedOperations].sort(),
    maxRiskLevel: plan.maxRiskLevel,
    exclusions: [...plan.exclusions].sort(),
    policyVersion: plan.policyVersion,
  });
}

/**
 * Map a gate verdict to a step outcome.
 *
 * This is the table from the product spec, and it is the reason the product can
 * make its claim at all: an indeterminate answer is never allowed to read as
 * success. Low risk degrades to human review; anything above that stops.
 */
export function verdictToStepStatus(
  verdict: GateVerdict,
  risk: RunRiskLevel,
): Extract<StepStatus, 'VERIFIED' | 'REVIEW' | 'BLOCKED'> {
  if (verdict === 'PASS') return 'VERIFIED';
  if (verdict === 'BLOCK') return 'BLOCKED';
  if (verdict === 'REVIEW') return 'REVIEW';
  // UNSUPPORTED. Deliberately identical to proofToGateStatus in
  // lib/dsg/deterministic/gate-engine.ts: undecidable is tolerable only when
  // the blast radius is small.
  return risk === 'low' ? 'REVIEW' : 'BLOCKED';
}

/**
 * Judge one observation against the locked plan.
 *
 * Pure counterpart to lib/dsg/brain/conformance-gate.ts: that module checks a
 * filesystem-level execution result, this one checks the plan-scope claims a
 * remote executor reported. Both must agree before a step passes.
 */
export function judgeObservation(
  run: Run,
  step: RunStep,
  observation: StepObservation,
): StepJudgement {
  const reasons: string[] = [];

  if (!run.planHash) {
    return {
      status: 'BLOCKED',
      reasons: ['plan_not_locked'],
      message: 'This run has no approved plan, so nothing can be verified against it.',
    };
  }

  if (observation.planHash !== run.planHash) {
    return {
      status: 'BLOCKED',
      reasons: ['plan_hash_mismatch'],
      message:
        'The agent acted under a different plan than the one you approved. That action was stopped.',
    };
  }

  if (!run.plan.allowedTargetSystems.includes(step.targetSystem)) {
    reasons.push(`target_system_not_in_plan:${step.targetSystem}`);
  }

  if (
    run.plan.allowedOperations.length > 0 &&
    !run.plan.allowedOperations.includes(step.operation)
  ) {
    reasons.push(`operation_not_in_plan:${step.operation}`);
  }

  if (riskExceeds(step.riskLevel, run.plan.maxRiskLevel)) {
    reasons.push(`risk_exceeds_plan:${step.riskLevel}_max_${run.plan.maxRiskLevel}`);
  }

  if (reasons.length > 0) {
    return {
      status: 'BLOCKED',
      reasons,
      message: `The agent tried to go outside the approved plan (${reasons[0]}). That action was stopped.`,
    };
  }

  // Evidence is mandatory. A step that reports success without producing
  // anything to check is indistinguishable from a step that did nothing.
  if (observation.evidenceIds.length === 0) {
    return {
      status: 'REVIEW',
      reasons: ['no_evidence'],
      message: 'The step reported success but produced no evidence, so it needs a human look.',
    };
  }

  if (observation.outcome === 'FAILED') {
    return {
      status: 'BLOCKED',
      reasons: ['execution_failed'],
      message:
        observation.detail?.trim() ||
        `${step.summary} did not complete. Fix the cause and re-run.`,
    };
  }

  return { status: 'PASSED', reasons: [], message: null };
}

/**
 * Roll individual step outcomes up to a run status.
 *
 * Worst outcome wins, and the run only reaches VERIFIED when every step landed
 * on PASSED. There is no partial credit.
 */
export function deriveRunStatus(steps: RunStep[]): Run['status'] {
  if (steps.some((step) => step.status === 'BLOCKED')) return 'BLOCKED';

  const settled = steps.every(
    (step) => step.status === 'PASSED' || step.status === 'REVIEW' || step.status === 'SKIPPED',
  );
  if (!settled) return 'RUNNING';

  if (steps.some((step) => step.status === 'REVIEW' || step.status === 'SKIPPED')) {
    return 'NEEDS_REVIEW';
  }
  return 'VERIFIED';
}

function fail(
  code: Extract<RunTransitionResult, { ok: false }>['code'],
  message: string,
): RunTransitionResult {
  return { ok: false, code, message };
}

/** First step still awaiting orchestration, or null when the run is settled. */
function findNextStepId(steps: RunStep[]): string | null {
  const next = steps.find(
    (step) =>
      step.status === 'PENDING' || step.status === 'VERIFIED' || step.status === 'DISPATCHED',
  );
  return next ? next.stepId : null;
}

/** Mark every not-yet-run step SKIPPED once the run has stopped early. */
function skipRemaining(steps: RunStep[], at: string): RunStep[] {
  return steps.map((step) =>
    step.status === 'PENDING' || step.status === 'VERIFIED' || step.status === 'DISPATCHED'
      ? { ...step, status: 'SKIPPED' as const, settledAt: at }
      : step,
  );
}

/**
 * Apply one event to a run.
 *
 * Returns a new run; the input is never mutated. A rejected event leaves the
 * caller's run untouched so a bad request cannot half-advance a run.
 */
export function applyRunEvent(run: Run, event: RunEvent): RunTransitionResult {
  if (isTerminal(run.status) && event.type !== 'RECEIPT_ISSUED') {
    return fail('run_terminal', `Run is ${run.status} and cannot change.`);
  }

  switch (event.type) {
    case 'APPROVE': {
      if (run.status !== 'DRAFT') {
        return fail('invalid_transition', `Only a DRAFT run can be approved (was ${run.status}).`);
      }
      const ttl = event.ttlMs ?? DEFAULT_PLAN_TTL_MS;
      const next: Run = {
        ...run,
        status: 'LOCKED',
        planHash: computePlanHash(run.plan),
        approvedBy: event.approvedBy,
        approvedAt: event.at,
        expiresAt: new Date(new Date(event.at).getTime() + ttl).toISOString(),
        updatedAt: event.at,
      };
      return { ok: true, run: next, nextStepId: findNextStepId(next.steps) };
    }

    case 'REJECT': {
      if (run.status !== 'DRAFT') {
        return fail('invalid_transition', `Only a DRAFT run can be rejected (was ${run.status}).`);
      }
      return {
        ok: true,
        run: {
          ...run,
          status: 'CANCELLED',
          steps: skipRemaining(run.steps, event.at),
          updatedAt: event.at,
        },
        nextStepId: null,
      };
    }

    case 'STEP_VERIFIED': {
      if (run.status !== 'LOCKED' && run.status !== 'RUNNING') {
        return fail('plan_not_locked', 'A plan must be approved before its steps are verified.');
      }
      if (run.expiresAt && new Date(event.at) > new Date(run.expiresAt)) {
        return fail('plan_expired', 'The approved plan expired. Approve it again to continue.');
      }

      const index = run.steps.findIndex((step) => step.stepId === event.stepId);
      if (index < 0) return fail('unknown_step', `No step ${event.stepId} in this run.`);
      if (run.steps[index].status !== 'PENDING') {
        return fail('step_already_settled', `Step ${event.stepId} is already ${run.steps[index].status}.`);
      }

      const step = run.steps[index];
      const status = verdictToStepStatus(event.verdict, step.riskLevel);
      const settled = status !== 'VERIFIED';

      const judgement: StepJudgement | null = settled
        ? {
            status,
            reasons: [`gate_${event.verdict.toLowerCase()}`],
            message:
              event.verdict === 'BLOCK'
                ? `${step.summary} is not allowed by your policies.`
                : event.verdict === 'UNSUPPORTED'
                  ? `${step.summary} could not be decided automatically, so it needs a human look.`
                  : `${step.summary} needs a human look before it can run.`,
          }
        : null;

      let steps = [...run.steps];
      steps[index] = {
        ...step,
        status,
        gateVerdict: event.verdict,
        judgement,
        settledAt: settled ? event.at : null,
      };
      if (status === 'BLOCKED') steps = skipRemaining(steps, event.at);

      const nextStatus = deriveRunStatus(steps);
      return {
        ok: true,
        run: { ...run, status: nextStatus, steps, updatedAt: event.at },
        nextStepId: isTerminal(nextStatus) ? null : findNextStepId(steps),
      };
    }

    case 'STEP_DISPATCHED': {
      const index = run.steps.findIndex((step) => step.stepId === event.stepId);
      if (index < 0) return fail('unknown_step', `No step ${event.stepId} in this run.`);
      if (run.steps[index].status !== 'VERIFIED') {
        return fail(
          'step_not_dispatchable',
          `Step ${event.stepId} is ${run.steps[index].status}; only a VERIFIED step may be dispatched.`,
        );
      }

      const steps = [...run.steps];
      steps[index] = { ...steps[index], status: 'DISPATCHED', dispatchedAt: event.at };
      return {
        ok: true,
        run: { ...run, status: 'RUNNING', steps, updatedAt: event.at },
        nextStepId: event.stepId,
      };
    }

    case 'STEP_OBSERVED': {
      const index = run.steps.findIndex((step) => step.stepId === event.stepId);
      if (index < 0) return fail('unknown_step', `No step ${event.stepId} in this run.`);
      if (run.steps[index].status !== 'DISPATCHED') {
        return fail(
          'step_already_settled',
          `Step ${event.stepId} is ${run.steps[index].status}; only a DISPATCHED step accepts an observation.`,
        );
      }

      let steps = [...run.steps];
      steps[index] = {
        ...steps[index],
        status: event.judgement.status,
        judgement: event.judgement,
        settledAt: event.at,
      };
      if (event.judgement.status === 'BLOCKED') steps = skipRemaining(steps, event.at);

      const nextStatus = deriveRunStatus(steps);
      return {
        ok: true,
        run: { ...run, status: nextStatus, steps, updatedAt: event.at },
        nextStepId: isTerminal(nextStatus) ? null : findNextStepId(steps),
      };
    }

    case 'RECEIPT_ISSUED': {
      if (!isTerminal(run.status)) {
        return fail('invalid_transition', 'A receipt is only issued for a settled run.');
      }
      return {
        ok: true,
        run: { ...run, receiptId: event.receiptId, updatedAt: event.at },
        nextStepId: null,
      };
    }
  }
}

/** Fold an event log into a run. Used by replay and by the repository. */
export function replayRunEvents(initial: Run, events: RunEvent[]): RunTransitionResult {
  let current = initial;
  for (const event of events) {
    const result = applyRunEvent(current, event);
    if (!result.ok) return result;
    current = result.run;
  }
  return { ok: true, run: current, nextStepId: findNextStepId(current.steps) };
}
