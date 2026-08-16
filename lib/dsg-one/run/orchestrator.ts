/**
 * DSG ONE — run orchestration (product layers 3 and 4).
 *
 * Drives a locked run forward until it either needs the client executor to do
 * something or has settled. DSG never executes: the furthest it goes is telling
 * the caller "this step is verified, you may run it now".
 *
 * The loop is deliberately small:
 *
 *   while the run is live:
 *     next PENDING step -> verify through the gate
 *       not VERIFIED  -> the state machine settles the run, stop
 *       VERIFIED      -> mark DISPATCHED, hand it to the caller, stop
 *     no PENDING step and one DISPATCHED -> waiting on an observation, stop
 *
 * Layer 3 of the spec says DSG must not gate work the user already approved.
 * That is why a VERIFIED step is dispatched immediately in the same call rather
 * than surfacing a second confirmation.
 */

import { applyRunEvent } from './state-machine';
import { verifyStep, type VerifyStepContext } from './verify-step';
import { isTerminal, type Run, type RunStep } from './types';

export interface AdvanceResult {
  run: Run;
  /**
   * The step the caller should now execute, or null when the run is settled or
   * already waiting on an observation.
   */
  dispatch: RunStep | null;
  /** True when the run is waiting for an observation it has already requested. */
  awaitingObservation: boolean;
}

/** Guard against a malformed plan spinning the loop. */
const MAX_STEPS_PER_ADVANCE = 64;

/**
 * Advance a locked run as far as it can go without the client.
 *
 * Verification failures are not thrown: the gate saying no is a normal outcome
 * that the state machine turns into a settled run, and the caller needs the
 * updated run back so it can be persisted and shown.
 */
export async function advanceRun(
  run: Run,
  context: VerifyStepContext,
  now: () => string = () => new Date().toISOString(),
): Promise<AdvanceResult> {
  let current = run;

  for (let guard = 0; guard < MAX_STEPS_PER_ADVANCE; guard += 1) {
    if (isTerminal(current.status)) {
      return { run: current, dispatch: null, awaitingObservation: false };
    }

    const dispatched = current.steps.find((step) => step.status === 'DISPATCHED');
    if (dispatched) {
      return { run: current, dispatch: null, awaitingObservation: true };
    }

    const pending = current.steps.find((step) => step.status === 'PENDING');
    if (!pending) {
      return { run: current, dispatch: null, awaitingObservation: false };
    }

    const verification = await verifyStep(current, pending, context);

    const verified = applyRunEvent(current, {
      type: 'STEP_VERIFIED',
      stepId: pending.stepId,
      verdict: verification.verdict,
      at: now(),
    });
    if (!verified.ok) {
      // The plan expired, or the run went terminal underneath us. Either way
      // the current run is the truth; report it rather than forcing a state.
      return { run: current, dispatch: null, awaitingObservation: false };
    }
    current = verified.run;

    const settledStep = current.steps.find((step) => step.stepId === pending.stepId)!;
    if (settledStep.status !== 'VERIFIED') {
      // Gate said REVIEW or BLOCK; the state machine has already rolled that up.
      continue;
    }

    const dispatchEvent = applyRunEvent(current, {
      type: 'STEP_DISPATCHED',
      stepId: pending.stepId,
      at: now(),
    });
    if (!dispatchEvent.ok) {
      return { run: current, dispatch: null, awaitingObservation: false };
    }
    current = dispatchEvent.run;

    return {
      run: current,
      dispatch: current.steps.find((step) => step.stepId === pending.stepId)!,
      awaitingObservation: true,
    };
  }

  throw new Error(`advanceRun exceeded ${MAX_STEPS_PER_ADVANCE} steps for run ${run.runId}`);
}
