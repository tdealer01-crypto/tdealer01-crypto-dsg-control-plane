import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLAN_TTL_MS,
  applyRunEvent,
  computePlanHash,
  deriveRunStatus,
  judgeObservation,
  replayRunEvents,
  verdictToStepStatus,
} from '../../../lib/dsg-one/run/state-machine';
import { compilePlan } from '../../../lib/dsg-one/run/plan-lock';
import {
  DSG_ONE_RUN_SCHEMA,
  runPhase,
  type Run,
  type RunPlan,
  type RunStep,
  type StepObservation,
} from '../../../lib/dsg-one/run/types';

const T0 = '2026-08-16T10:00:00.000Z';
const T1 = '2026-08-16T10:01:00.000Z';
const T2 = '2026-08-16T10:02:00.000Z';

function plan(): RunPlan {
  const compiled = compilePlan('Deploy the latest verified version to production');
  if (!compiled.plan) throw new Error('fixture plan failed to compile');
  return compiled.plan;
}

function draftRun(overrides: Partial<Run> = {}): Run {
  const runPlan = overrides.plan ?? plan();
  const steps: RunStep[] = runPlan.steps.map((step) => ({
    ...step,
    status: 'PENDING',
    gateVerdict: null,
    observation: null,
    judgement: null,
    dispatchedAt: null,
    settledAt: null,
  }));

  return {
    schema: DSG_ONE_RUN_SCHEMA,
    runId: 'run-1',
    orgId: 'org-1',
    actorId: 'user-1',
    surface: 'api',
    status: 'DRAFT',
    plan: runPlan,
    planHash: null,
    approvedBy: null,
    approvedAt: null,
    expiresAt: null,
    steps,
    receiptId: null,
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  };
}

function approve(run: Run) {
  const result = applyRunEvent(run, { type: 'APPROVE', approvedBy: 'user-1', at: T0 });
  if (!result.ok) throw new Error(`approve failed: ${result.message}`);
  return result.run;
}

function observation(planHash: string, overrides: Partial<StepObservation> = {}): StepObservation {
  return {
    planHash,
    executedCommands: ['vercel promote'],
    changedPaths: [],
    evidenceIds: ['ev-1'],
    outcome: 'SUCCEEDED',
    ...overrides,
  };
}

describe('computePlanHash', () => {
  it('is stable across key ordering of scope arrays', () => {
    const base = plan();
    const reordered: RunPlan = {
      ...base,
      allowedTargetSystems: [...base.allowedTargetSystems].reverse(),
      allowedOperations: [...base.allowedOperations].reverse(),
      exclusions: [...base.exclusions].reverse(),
    };
    expect(computePlanHash(reordered)).toBe(computePlanHash(base));
  });

  it('changes when the scope boundary changes', () => {
    const base = plan();
    const widened: RunPlan = { ...base, maxRiskLevel: 'critical' };
    expect(computePlanHash(widened)).not.toBe(computePlanHash(base));
  });

  it('changes when an exclusion is dropped', () => {
    const base = plan();
    const weakened: RunPlan = { ...base, exclusions: base.exclusions.slice(1) };
    expect(computePlanHash(weakened)).not.toBe(computePlanHash(base));
  });
});

describe('verdictToStepStatus', () => {
  it('never turns UNSUPPORTED into a pass', () => {
    for (const risk of ['low', 'medium', 'high', 'critical'] as const) {
      expect(verdictToStepStatus('UNSUPPORTED', risk)).not.toBe('VERIFIED');
    }
  });

  it('maps low-risk UNSUPPORTED to REVIEW and higher risk to BLOCKED', () => {
    expect(verdictToStepStatus('UNSUPPORTED', 'low')).toBe('REVIEW');
    expect(verdictToStepStatus('UNSUPPORTED', 'medium')).toBe('BLOCKED');
    expect(verdictToStepStatus('UNSUPPORTED', 'high')).toBe('BLOCKED');
    expect(verdictToStepStatus('UNSUPPORTED', 'critical')).toBe('BLOCKED');
  });

  it('passes PASS and blocks BLOCK', () => {
    expect(verdictToStepStatus('PASS', 'critical')).toBe('VERIFIED');
    expect(verdictToStepStatus('BLOCK', 'low')).toBe('BLOCKED');
  });
});

describe('APPROVE', () => {
  it('freezes the planHash and sets an expiry', () => {
    const run = approve(draftRun());
    expect(run.status).toBe('LOCKED');
    expect(run.planHash).toBe(computePlanHash(run.plan));
    expect(run.approvedBy).toBe('user-1');
    expect(new Date(run.expiresAt!).getTime() - new Date(T0).getTime()).toBe(DEFAULT_PLAN_TTL_MS);
  });

  it('refuses to approve twice', () => {
    const locked = approve(draftRun());
    const result = applyRunEvent(locked, { type: 'APPROVE', approvedBy: 'user-1', at: T1 });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.code).toBe('invalid_transition');
  });

  it('does not mutate the input run', () => {
    const draft = draftRun();
    approve(draft);
    expect(draft.status).toBe('DRAFT');
    expect(draft.planHash).toBeNull();
  });
});

describe('dispatch guard', () => {
  it('refuses to dispatch a step before the plan is approved', () => {
    const draft = draftRun();
    const result = applyRunEvent(draft, {
      type: 'STEP_DISPATCHED',
      stepId: draft.steps[0].stepId,
      at: T1,
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.code).toBe('step_not_dispatchable');
  });

  it('refuses to verify a step under an expired plan', () => {
    const locked = approve(draftRun());
    const late = new Date(new Date(T0).getTime() + DEFAULT_PLAN_TTL_MS + 1000).toISOString();
    const result = applyRunEvent(locked, {
      type: 'STEP_VERIFIED',
      stepId: locked.steps[0].stepId,
      verdict: 'PASS',
      at: late,
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.code).toBe('plan_expired');
  });
});

describe('judgeObservation', () => {
  it('blocks an observation carrying a different planHash', () => {
    const run = approve(draftRun());
    const judgement = judgeObservation(run, run.steps[0], observation('deadbeef'));
    expect(judgement.status).toBe('BLOCKED');
    expect(judgement.reasons).toContain('plan_hash_mismatch');
  });

  it('blocks a step that leaves the approved target systems', () => {
    const run = approve(draftRun());
    const rogue = { ...run.steps[0], targetSystem: 'stripe' };
    const judgement = judgeObservation(run, rogue, observation(run.planHash!));
    expect(judgement.status).toBe('BLOCKED');
    expect(judgement.reasons[0]).toContain('target_system_not_in_plan');
  });

  it('blocks a step whose risk exceeds the approved ceiling', () => {
    const base = plan();
    const run = approve(draftRun({ plan: { ...base, maxRiskLevel: 'low' } }));
    const risky = { ...run.steps[0], riskLevel: 'critical' as const };
    const judgement = judgeObservation(run, risky, observation(run.planHash!));
    expect(judgement.status).toBe('BLOCKED');
    expect(judgement.reasons[0]).toContain('risk_exceeds_plan');
  });

  it('sends a success with no evidence to review rather than passing it', () => {
    const run = approve(draftRun());
    const judgement = judgeObservation(
      run,
      run.steps[0],
      observation(run.planHash!, { evidenceIds: [] }),
    );
    expect(judgement.status).toBe('REVIEW');
    expect(judgement.reasons).toContain('no_evidence');
  });

  it('surfaces the executor detail verbatim when a step fails', () => {
    const run = approve(draftRun());
    const judgement = judgeObservation(
      run,
      run.steps[0],
      observation(run.planHash!, { outcome: 'FAILED', detail: '/api/health returned 503' }),
    );
    expect(judgement.status).toBe('BLOCKED');
    expect(judgement.message).toBe('/api/health returned 503');
  });

  it('passes a conforming observation', () => {
    const run = approve(draftRun());
    const judgement = judgeObservation(run, run.steps[0], observation(run.planHash!));
    expect(judgement.status).toBe('PASSED');
    expect(judgement.message).toBeNull();
  });
});

describe('run rollup', () => {
  it('reaches VERIFIED only when every step passed', () => {
    let run = approve(draftRun());

    for (const step of run.steps) {
      const verified = applyRunEvent(run, {
        type: 'STEP_VERIFIED',
        stepId: step.stepId,
        verdict: 'PASS',
        at: T1,
      });
      expect(verified.ok).toBe(true);
      run = (verified as { run: Run }).run;

      const dispatched = applyRunEvent(run, { type: 'STEP_DISPATCHED', stepId: step.stepId, at: T1 });
      run = (dispatched as { run: Run }).run;

      const judged = judgeObservation(run, step, observation(run.planHash!));
      const observed = applyRunEvent(run, {
        type: 'STEP_OBSERVED',
        stepId: step.stepId,
        judgement: judged,
        at: T2,
      });
      run = (observed as { run: Run }).run;
    }

    expect(run.status).toBe('VERIFIED');
    expect(runPhase(run)).toBe('Verified');
  });

  it('blocks the run and skips remaining steps when one step is blocked', () => {
    let run = approve(draftRun());
    const [first, ...rest] = run.steps;

    const result = applyRunEvent(run, {
      type: 'STEP_VERIFIED',
      stepId: first.stepId,
      verdict: 'BLOCK',
      at: T1,
    });
    expect(result.ok).toBe(true);
    run = (result as { run: Run }).run;

    expect(run.status).toBe('BLOCKED');
    for (const step of rest) {
      expect(run.steps.find((s) => s.stepId === step.stepId)!.status).toBe('SKIPPED');
    }
    expect((result as { nextStepId: string | null }).nextStepId).toBeNull();
  });

  it('lands on NEEDS_REVIEW when a low-risk step is undecidable', () => {
    const lowRisk = compilePlan('Deploy a preview of this branch').plan!;
    let run = approve(draftRun({ plan: lowRisk }));

    // Second step of the preview template is the low-risk health check.
    const healthStep = run.steps.find((step) => step.riskLevel === 'low')!;
    const other = run.steps.filter((step) => step.stepId !== healthStep.stepId);

    for (const step of other) {
      run = (applyRunEvent(run, {
        type: 'STEP_VERIFIED',
        stepId: step.stepId,
        verdict: 'PASS',
        at: T1,
      }) as { run: Run }).run;
      run = (applyRunEvent(run, { type: 'STEP_DISPATCHED', stepId: step.stepId, at: T1 }) as {
        run: Run;
      }).run;
      run = (applyRunEvent(run, {
        type: 'STEP_OBSERVED',
        stepId: step.stepId,
        judgement: judgeObservation(run, step, observation(run.planHash!)),
        at: T2,
      }) as { run: Run }).run;
    }

    const result = applyRunEvent(run, {
      type: 'STEP_VERIFIED',
      stepId: healthStep.stepId,
      verdict: 'UNSUPPORTED',
      at: T2,
    });
    expect(result.ok).toBe(true);
    expect((result as { run: Run }).run.status).toBe('NEEDS_REVIEW');
  });

  it('refuses to move a terminal run', () => {
    let run = approve(draftRun());
    run = (applyRunEvent(run, {
      type: 'STEP_VERIFIED',
      stepId: run.steps[0].stepId,
      verdict: 'BLOCK',
      at: T1,
    }) as { run: Run }).run;

    const result = applyRunEvent(run, {
      type: 'STEP_DISPATCHED',
      stepId: run.steps[1].stepId,
      at: T2,
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.code).toBe('run_terminal');
  });

  it('still accepts a receipt for a settled run', () => {
    let run = approve(draftRun());
    run = (applyRunEvent(run, {
      type: 'STEP_VERIFIED',
      stepId: run.steps[0].stepId,
      verdict: 'BLOCK',
      at: T1,
    }) as { run: Run }).run;

    const result = applyRunEvent(run, { type: 'RECEIPT_ISSUED', receiptId: 'rcpt-1', at: T2 });
    expect(result.ok).toBe(true);
    expect((result as { run: Run }).run.receiptId).toBe('rcpt-1');
  });
});

describe('deriveRunStatus', () => {
  it('reports RUNNING while any step is unsettled', () => {
    const run = approve(draftRun());
    expect(deriveRunStatus(run.steps)).toBe('RUNNING');
  });
});

describe('replayRunEvents', () => {
  it('produces the same run as applying events one at a time', () => {
    const draft = draftRun();
    const stepId = draft.steps[0].stepId;
    const events = [
      { type: 'APPROVE' as const, approvedBy: 'user-1', at: T0 },
      { type: 'STEP_VERIFIED' as const, stepId, verdict: 'PASS' as const, at: T1 },
      { type: 'STEP_DISPATCHED' as const, stepId, at: T1 },
    ];

    const folded = replayRunEvents(draft, events);
    expect(folded.ok).toBe(true);

    let manual = draft;
    for (const event of events) {
      manual = (applyRunEvent(manual, event) as { run: Run }).run;
    }
    expect((folded as { run: Run }).run).toEqual(manual);
  });

  it('stops at the first rejected event', () => {
    const draft = draftRun();
    const result = replayRunEvents(draft, [
      { type: 'APPROVE', approvedBy: 'user-1', at: T0 },
      { type: 'APPROVE', approvedBy: 'user-1', at: T1 },
    ]);
    expect(result.ok).toBe(false);
  });
});

describe('compilePlan', () => {
  it('refuses to plan an intent it cannot check', () => {
    const result = compilePlan('make the app better somehow');
    expect(result.ok).toBe(false);
    expect(result.plan).toBeNull();
    expect(result.reason).toContain('cannot build a checkable plan');
  });

  it('rejects an empty intent', () => {
    expect(compilePlan('  ').ok).toBe(false);
  });

  it('scopes a production deploy to the systems its steps touch', () => {
    const result = compilePlan('Deploy the latest verified version to production');
    expect(result.ok).toBe(true);
    expect(result.templateId).toBe('deploy-release');
    expect(result.plan!.allowedTargetSystems).toEqual(['github', 'vercel']);
    expect(result.plan!.exclusions.length).toBeGreaterThan(0);
  });

  it('gives every step a distinct id', () => {
    const steps = compilePlan('Apply the pending database migration').plan!.steps;
    expect(new Set(steps.map((step) => step.stepId)).size).toBe(steps.length);
  });
});
